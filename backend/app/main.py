import logging
import time

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from .auth import origin_allowed, router as auth_router
from .db import engine
from .routes import router

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("sih")
app = FastAPI(title="Jharkhand Innovation Portal", version="0.1.0")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(router, prefix="/api/v1")


@app.middleware("http")
async def security_and_logging(request: Request, call_next):
    started = time.monotonic()
    if request.method not in ("GET", "HEAD", "OPTIONS"):
        if not origin_allowed(request.headers.get("origin", "")):
            return JSONResponse({"detail": {"code": "invalid_origin"}}, status_code=403)
        length = request.headers.get("content-length")
        if length and (not length.isdigit() or int(length) > 21 * 1024 * 1024):
            return JSONResponse({"detail": {"code": "file_too_large"}}, status_code=413)
        if request.url.path.endswith("/attachments") and length is None:
            return JSONResponse({"detail": {"code": "length_required"}}, status_code=411)
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Cache-Control"] = "no-store"
    response.headers["Referrer-Policy"] = "same-origin"
    if response.status_code >= 400:
        log.warning("request_failed method=%s path=%s status=%s duration_ms=%d", request.method, request.url.path, response.status_code, (time.monotonic() - started) * 1000)
    return response


@app.exception_handler(RequestValidationError)
async def validation_error(request, exc):
    return JSONResponse({"detail": {"code": "validation_error", "fields": [str(e["loc"][-1]) for e in exc.errors()]}}, status_code=422)


@app.exception_handler(IntegrityError)
async def conflict(request, exc):
    return JSONResponse({"detail": {"code": "conflict"}}, status_code=409)


@app.get("/api/v1/health")
def health():
    try:
        with engine.connect() as db:
            db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "ok"}
    except Exception:
        log.exception("database_health_failed")
        return JSONResponse({"status": "unavailable"}, status_code=503)
