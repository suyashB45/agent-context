"""Self-hosted HTTP boundary. Pre-shared bearer authentication, not an OAuth server."""

from hashlib import sha256
import hmac
import json
import logging
import time
from uuid import uuid4

import anyio
from mcp.server.transport_security import RequestBodyLimitMiddleware, TransportSecurityMiddleware, TransportSecuritySettings
from starlette.requests import Request
from starlette.responses import JSONResponse

from .server import build_server
from .store import Store


logger = logging.getLogger("agent_context_mcp.http")


class TokenBucket:
    """One process, one shared workspace budget; called only on the ASGI event loop."""

    def __init__(self, per_minute):
        self.capacity = per_minute
        self.tokens = float(per_minute)
        self.updated = time.monotonic()

    def take(self):
        now = time.monotonic()
        self.tokens = min(self.capacity, self.tokens + (now - self.updated) * self.capacity / 60)
        self.updated = now
        if self.tokens < 1:
            return False
        self.tokens -= 1
        return True


class HTTPBoundary:
    def __init__(self, app, settings):
        self.app = app
        self.settings = settings.validate()
        self.limited_app = RequestBodyLimitMiddleware(app, settings.max_body_bytes)
        self.token_digest = sha256(settings.token.encode("ascii")).digest() if settings.token else None
        self.rate = TokenBucket(settings.requests_per_minute)
        self.failed_auth_rate = TokenBucket(60)
        self.inflight = 0
        self.security = TransportSecurityMiddleware(TransportSecuritySettings(
            enable_dns_rebinding_protection=True,
            allowed_hosts=settings.trusted_hosts,
            allowed_origins=settings.trusted_origins,
        ))

    def authenticated(self, scope):
        if self.token_digest is None:
            return True
        values = [v for k, v in scope["headers"] if k.lower() == b"authorization"]
        if len(values) != 1:
            return False
        scheme, separator, token = values[0].partition(b" ")
        if not separator or scheme.lower() != b"bearer" or not 32 <= len(token) <= 512:
            return False
        return hmac.compare_digest(sha256(token).digest(), self.token_digest)

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        request_id, started, status = uuid4().hex, time.monotonic(), 500
        route = scope.get("path", "")
        log_route = route if route in {"/", "/mcp", "/healthz", "/readyz"} else "other"

        async def response_send(message):
            nonlocal status
            if message["type"] == "http.response.start":
                status = message["status"]
                message = {**message, "headers": [*message.get("headers", []),
                    (b"x-request-id", request_id.encode()), (b"cache-control", b"no-store"),
                    (b"x-content-type-options", b"nosniff"),
                    (b"referrer-policy", b"no-referrer"),
                    (b"content-security-policy", b"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'")]}
            await send(message)

        async def respond(code, message, headers=None):
            await JSONResponse({"error": message, "request_id": request_id}, status_code=code,
                               headers=headers)(scope, receive, response_send)

        try:
            for header in (b"host", b"origin"):
                if sum(k.lower() == header for k, _ in scope["headers"]) > 1:
                    return await respond(400, "Duplicate security header")
            failure = await self.security.validate_request(Request(scope), is_post=False)
            if failure is not None:
                return await failure(scope, receive, response_send)
            if route == "/healthz" and scope["method"] == "GET":
                return await JSONResponse({"status": "ok"})(scope, receive, response_send)
            if route == "/" and scope["method"] == "GET":
                from starlette.responses import RedirectResponse
                return await RedirectResponse("/dashboard", status_code=307)(scope, receive, response_send)
            if route in {"/dashboard", "/assets/dashboard.css", "/assets/dashboard.js"} and scope["method"] == "GET":
                return await self.app(scope, receive, response_send)
            if not self.authenticated(scope):
                if not self.failed_auth_rate.take():
                    return await respond(429, "Too many authentication failures", {"Retry-After": "60"})
                return await respond(401, "Bearer token required", {"WWW-Authenticate": 'Bearer realm="agent-context"'})
            if not self.rate.take():
                return await respond(429, "Request limit reached", {"Retry-After": "60"})
            if self.inflight >= self.settings.max_inflight:
                return await respond(503, "Server is busy; retry later", {"Retry-After": "1"})
            self.inflight += 1
            try:
                return await self.limited_app(scope, receive, response_send)
            finally:
                self.inflight -= 1
        finally:
            # Never log request bodies, credentials, query strings, or project names.
            logger.info(json.dumps({"event": "http_request", "request_id": request_id, "method": scope["method"],
                                    "route": log_route, "status": status,
                                    "duration_ms": round((time.monotonic() - started) * 1000, 2)}))


def build_http_app(settings):
    settings.validate()  # Refuse unsafe settings before creating a database.
    store = Store(settings.database)
    server = build_server(store)
    from .dashboard import register_dashboard
    register_dashboard(server, store)

    @server.custom_route("/readyz", methods=["GET"])
    async def ready(request):
        try:
            result = await anyio.to_thread.run_sync(store.check)
            return JSONResponse(result)
        except Exception:
            logger.error("Database readiness check failed")
            return JSONResponse({"status": "unavailable"}, status_code=503)

    security = TransportSecuritySettings(enable_dns_rebinding_protection=True,
                                        allowed_hosts=settings.trusted_hosts,
                                        allowed_origins=settings.trusted_origins)
    app = server.streamable_http_app(stateless_http=True, json_response=True,
                                     max_request_body_size=settings.max_body_bytes,
                                     transport_security=security, host=settings.host)
    return HTTPBoundary(app, settings)
