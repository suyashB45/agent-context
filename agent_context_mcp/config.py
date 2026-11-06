"""Portable configuration; secrets are supplied out of the process arguments."""

from dataclasses import dataclass, field
import ipaddress
import os
from pathlib import Path
import re
import secrets
import sys


def default_database():
    # Preserve databases created by the original source-checkout release.
    legacy = Path(__file__).resolve().parent.parent / "data" / "context.sqlite3"
    if legacy.is_file():
        return legacy
    if sys.platform == "win32":
        base = Path(os.environ.get("LOCALAPPDATA", Path.home() / "AppData" / "Local"))
    elif sys.platform == "darwin":
        base = Path.home() / "Library" / "Application Support"
    else:
        base = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share"))
    return base / "agent-context-mcp" / "context.sqlite3"


def is_loopback(host):
    if host == "localhost":
        return True
    try:
        return ipaddress.ip_address(host).is_loopback
    except ValueError:
        return False


def read_token(token_file=None):
    token = os.environ.get("AGENT_CONTEXT_TOKEN")
    token_file = token_file or os.environ.get("AGENT_CONTEXT_TOKEN_FILE")
    if token is not None and token_file:
        raise ValueError("Set AGENT_CONTEXT_TOKEN or a token file, not both.")
    if token_file:
        token = Path(token_file).expanduser().read_text(encoding="utf-8").strip()
    if token is not None and not re.fullmatch(r"[A-Za-z0-9._~+/=-]{32,512}", token):
        raise ValueError("The bearer token must contain 32–512 ASCII token characters. Use the keygen command.")
    return token


def local_token(database, token_file=None):
    """Reuse explicit credentials, or provision a private token for the dashboard."""
    existing = read_token(token_file)
    if existing is not None:
        return existing
    path = Path(database).expanduser().resolve().parent / "access-token"
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    try:
        descriptor = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    except FileExistsError:
        pass
    else:
        with os.fdopen(descriptor, "w", encoding="ascii") as output:
            output.write(secrets.token_urlsafe(48) + "\n")
    return read_token(path)


@dataclass(frozen=True)
class HTTPSettings:
    database: Path
    host: str = "127.0.0.1"
    port: int = 8765
    token: str | None = field(default=None, repr=False)
    allow_unauthenticated_local: bool = False
    allowed_hosts: tuple[str, ...] = ()
    allowed_origins: tuple[str, ...] = ()
    requests_per_minute: int = 600
    max_inflight: int = 32
    max_body_bytes: int = 262144

    def validate(self):
        if not 1 <= self.port <= 65535:
            raise ValueError("port must be between 1 and 65535")
        if self.allow_unauthenticated_local and not is_loopback(self.host):
            raise ValueError("Unauthenticated HTTP may bind only to a loopback address.")
        if self.token is None and not self.allow_unauthenticated_local:
            raise ValueError("HTTP requires AGENT_CONTEXT_TOKEN or --token-file. For local development only, use --allow-unauthenticated-local.")
        if self.token is not None and not re.fullmatch(r"[A-Za-z0-9._~+/=-]{32,512}", self.token):
            raise ValueError("Invalid bearer token; use keygen to generate a strong token.")
        for value, name, minimum, maximum in (
            (self.requests_per_minute, "requests_per_minute", 1, 100000),
            (self.max_inflight, "max_inflight", 1, 256),
            (self.max_body_bytes, "max_body_bytes", 1024, 4194304),
        ):
            if type(value) is not int or not minimum <= value <= maximum:
                raise ValueError(f"{name} must be an integer from {minimum} to {maximum}.")
        for host in self.allowed_hosts:
            if not host or "*" in host or any(c in host for c in "/\\@?# \t\r\n"):
                raise ValueError("allowed_hosts must contain exact Host header values, without wildcards or schemes.")
        for origin in self.allowed_origins:
            from urllib.parse import urlsplit
            parsed = urlsplit(origin)
            if parsed.scheme not in {"http", "https"} or not parsed.netloc or parsed.path or parsed.query or parsed.fragment or parsed.username or "*" in origin:
                raise ValueError("allowed_origins must contain exact http(s) origins without paths or wildcards.")
        return self

    @property
    def trusted_hosts(self):
        defaults = ("127.0.0.1", f"127.0.0.1:{self.port}", "localhost", f"localhost:{self.port}",
                    "[::1]", f"[::1]:{self.port}")
        return list(dict.fromkeys((*defaults, *self.allowed_hosts)))

    @property
    def trusted_origins(self):
        defaults = (f"http://127.0.0.1:{self.port}", f"http://localhost:{self.port}", f"http://[::1]:{self.port}")
        return list(dict.fromkeys((*defaults, *self.allowed_origins)))
