"""Embedded dashboard and authenticated operator API; no external assets or services."""

from functools import partial
import json
from pathlib import Path
import sqlite3

import anyio
from starlette.responses import FileResponse, JSONResponse

from .store import ContextError


STATIC = Path(__file__).resolve().parent / "static"


def register_dashboard(server, store):
    @server.custom_route("/dashboard", methods=["GET"])
    async def dashboard(request):
        return FileResponse(STATIC / "index.html", media_type="text/html")

    @server.custom_route("/assets/{filename}", methods=["GET"])
    async def asset(request):
        filename = request.path_params["filename"]
        if filename not in {"dashboard.css", "dashboard.js"}:
            return JSONResponse({"error": "Not found"}, status_code=404)
        return FileResponse(STATIC / filename)

    async def operate(function, *args, **kwargs):
        try:
            result = await anyio.to_thread.run_sync(partial(function, *args, **kwargs))
            return JSONResponse(result)
        except ContextError as error:
            return JSONResponse({"error": str(error)}, status_code=400)
        except (TypeError, ValueError):
            return JSONResponse({"error": "Invalid request fields"}, status_code=400)
        except sqlite3.Error:
            return JSONResponse({"error": "Database is unavailable; retry shortly"}, status_code=503)

    def number(request, name, default=None):
        raw = request.query_params.get(name)
        return int(raw) if raw is not None else default

    async def payload(request, allowed, required):
        data = await request.json()
        if not isinstance(data, dict) or set(data) - set(allowed) or set(required) - set(data):
            raise ValueError("Invalid request fields")
        return data

    @server.custom_route("/api/overview", methods=["GET"])
    async def overview(request):
        return await operate(store.overview)

    @server.custom_route("/api/agents", methods=["GET"])
    async def agents(request):
        try:
            return await operate(store.agents, number(request, "limit", 50), number(request, "offset", 0))
        except ValueError:
            return JSONResponse({"error": "Invalid pagination offset"}, status_code=400)

    @server.custom_route("/api/projects", methods=["GET", "POST"])
    async def projects(request):
        try:
            if request.method == "POST":
                data = await payload(request, {"project_id", "name", "description"}, {"project_id", "name"})
                return await operate(store.create_project, **data)
            return await operate(store.list_projects, number(request, "limit", 50), number(request, "offset", 0))
        except (ValueError, json.JSONDecodeError):
            return JSONResponse({"error": "Invalid request fields"}, status_code=400)

    @server.custom_route("/api/projects/{project_id}", methods=["GET"])
    async def context(request):
        return await operate(store.get_context, request.path_params["project_id"])

    @server.custom_route("/api/projects/{project_id}/tasks", methods=["GET", "POST"])
    async def tasks(request):
        project_id = request.path_params["project_id"]
        try:
            if request.method == "POST":
                data = await payload(request, {"title", "description", "files", "request_id"}, {"title"})
                return await operate(store.create_task, project_id, "dashboard", **data)
            return await operate(store.list_tasks, project_id, request.query_params.get("status", "all"),
                                 number(request, "limit", 30), number(request, "offset", 0))
        except (ValueError, json.JSONDecodeError):
            return JSONResponse({"error": "Invalid request fields"}, status_code=400)

    @server.custom_route("/api/projects/{project_id}/updates", methods=["POST"])
    async def updates(request):
        try:
            data = await payload(request, {"kind", "summary", "details", "files", "request_id"}, {"kind", "summary"})
            return await operate(store.record_update, request.path_params["project_id"], "dashboard", **data)
        except (ValueError, json.JSONDecodeError):
            return JSONResponse({"error": "Invalid request fields"}, status_code=400)

    @server.custom_route("/api/projects/{project_id}/search", methods=["GET"])
    async def search(request):
        try:
            return await operate(store.search_context, request.path_params["project_id"], request.query_params.get("q", ""),
                                 before_event_id=number(request, "before"))
        except ValueError:
            return JSONResponse({"error": "Invalid pagination cursor"}, status_code=400)

    @server.custom_route("/api/activity", methods=["GET"])
    async def activity(request):
        try:
            return await operate(store.activity, project_id=request.query_params.get("project") or None,
                                 kind=request.query_params.get("kind") or None,
                                 before_event_id=number(request, "before"))
        except ValueError:
            return JSONResponse({"error": "Invalid pagination cursor"}, status_code=400)
