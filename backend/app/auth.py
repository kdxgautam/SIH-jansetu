import hashlib
import os
import secrets
from datetime import timedelta
from urllib.parse import urlsplit

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pwdlib import PasswordHash
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session as DBSession

from .db import get_db, now
from .models import AuthAttempt, Session, User
from .schemas import Login, Register, UserOutput

router = APIRouter(prefix="/auth", tags=["authentication"])
passwords = PasswordHash.recommended()
DUMMY_HASH = passwords.hash("a-random-dummy-password-for-timing")
COOKIE = "sih_session"
ORIGIN = os.getenv("APP_ORIGIN", "http://localhost:3000").rstrip("/")
configured_origins = os.getenv("APP_ORIGINS") or ORIGIN
ALLOWED_ORIGINS = {value.strip().rstrip("/") for value in configured_origins.split(",") if value.strip()}
PREVIEW_PREFIX = os.getenv("APP_ORIGIN_PREVIEW_PREFIX", "").strip().lower()
PREVIEW_SUFFIX = os.getenv("APP_ORIGIN_PREVIEW_SUFFIX", "").strip().lower()


def origin_allowed(value: str):
    origin = value.rstrip("/")
    if origin in ALLOWED_ORIGINS:
        return True
    if not PREVIEW_PREFIX or not PREVIEW_SUFFIX:
        return False
    parsed = urlsplit(origin)
    host = (parsed.hostname or "").lower()
    try:
        port = parsed.port
    except ValueError:
        return False
    return (
        parsed.scheme == "https"
        and parsed.path in ("", "/")
        and not parsed.query
        and not parsed.fragment
        and parsed.username is None
        and parsed.password is None
        and port is None
        and host.startswith(PREVIEW_PREFIX)
        and host.endswith(PREVIEW_SUFFIX)
    )


def fail(code, status=400):
    raise HTTPException(status, detail={"code": code})


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def optional_user(request: Request, db: DBSession = Depends(get_db, scope="function")):
    token = request.cookies.get(COOKIE, "")
    if not token or len(token) > 128:
        return None
    session = db.scalar(select(Session).where(Session.token_hash == digest(token), Session.expires_at > now()))
    if session is None:
        return None
    return db.get(User, session.user_id)


def current_user(user: User | None = Depends(optional_user)):
    if user is None:
        fail("authentication_required", 401)
    return user


def require_role(user, *roles):
    if user.role not in roles:
        fail("forbidden", 403)


def throttle(db, request, email):
    cutoff = now() - timedelta(minutes=15)
    # ponytail: proxy peers share the IP ceiling; use a trusted proxy IP policy for a public rollout.
    keys = [(digest("ip:" + (request.client.host if request.client else "local")), 60), (digest("email:" + email), 15)]
    db.execute(delete(AuthAttempt).where(AuthAttempt.created_at < cutoff))
    for key, limit in sorted(keys):
        db.execute(select(func.pg_advisory_xact_lock(int(key[:16], 16) - 2**63)))
        count = db.scalar(select(func.count()).select_from(AuthAttempt).where(AuthAttempt.key == key, AuthAttempt.created_at >= cutoff))
        if count >= limit:
            db.commit()
            fail("too_many_attempts", 429)
    for key, _ in keys:
        db.add(AuthAttempt(key=key))
    db.commit()  # Persist attempts even when credential validation raises below.


def issue_session(db, user, response):
    token = secrets.token_urlsafe(32)
    db.execute(delete(Session).where(Session.expires_at <= now()))
    db.add(Session(token_hash=digest(token), user_id=user.id, expires_at=now() + timedelta(days=7)))
    response.set_cookie(COOKIE, token, max_age=7 * 86400, httponly=True, secure=ORIGIN.startswith("https://"), samesite="lax", path="/")
    return user


@router.post("/register", response_model=UserOutput, status_code=201)
def register(data: Register, request: Request, response: Response, db: DBSession = Depends(get_db, scope="function")):
    throttle(db, request, data.email)
    if db.scalar(select(User).where(User.email == data.email)):
        fail("email_unavailable", 409)
    user = User(name=data.name, email=data.email, password_hash=passwords.hash(data.password), role="citizen")
    db.add(user)
    db.flush()
    return issue_session(db, user, response)


@router.post("/login", response_model=UserOutput)
def login(data: Login, request: Request, response: Response, db: DBSession = Depends(get_db, scope="function")):
    throttle(db, request, data.email)
    user = db.scalar(select(User).where(User.email == data.email))
    valid = passwords.verify(data.password, user.password_hash if user else DUMMY_HASH)
    if not user or not valid:
        fail("invalid_credentials", 401)
    old = request.cookies.get(COOKIE)
    if old:
        db.execute(delete(Session).where(Session.token_hash == digest(old)))
    return issue_session(db, user, response)


@router.get("/me", response_model=UserOutput | None)
def me(user: User | None = Depends(optional_user)):
    return user


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response, db: DBSession = Depends(get_db, scope="function")):
    db.execute(delete(Session).where(Session.token_hash == digest(request.cookies.get(COOKIE, ""))))
    response.delete_cookie(COOKIE, path="/")
