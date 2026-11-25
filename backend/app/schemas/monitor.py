from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class ClientErrorReport(BaseModel):
    """What a page sends when it breaks. No name, no account, no query string: the browser leaves them out, and so does the API."""

    kind: Literal["render", "error", "promise", "chunk"]
    message: str = Field(min_length=1, max_length=500)
    stack: str = Field(default="", max_length=4000)
    path: str = Field(default="", max_length=300)
    build: str = Field(default="", max_length=60)
    language: str = Field(default="", max_length=20)


class RouteTimings(BaseModel):
    route: str
    requests: int
    server_errors: int
    p95_ms: int | None = None


class MonitorSummary(BaseModel):
    since: str  # the start of the last day, or of the process when it is younger
    requests: int
    server_errors: int
    slow_requests: int
    p50_ms: int | None = None
    p95_ms: int | None = None
    routes: list[RouteTimings]
    client_errors: int
    client_error_kinds: dict[str, int]
    distinct_client_errors: int
