from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse, PlanResponse
from app.core.logging_config import logger
from app.services import auth_service, plan_service, audit_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _user_to_response(user) -> UserResponse:
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        created_at=str(user.created_at) if user.created_at else None,
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await auth_service.get_user_by_email(db, data.email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = await auth_service.create_user(db, data)
    token = auth_service.create_access_token(user.id)
    return TokenResponse(access_token=token, user=_user_to_response(user))


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await auth_service.get_user_by_email(db, data.email)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not auth_service.verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = auth_service.create_access_token(user.id)
    await audit_service.log_event(db, user.id, "login")
    logger.info("user_login", extra={"event": "login", "user_id": user.id, "project_id": None})
    return TokenResponse(access_token=token, user=_user_to_response(user))


@router.get("/me", response_model=UserResponse)
async def get_current_user(db: AsyncSession = Depends(get_db), authorization: str = Depends(_require_auth)):
    user = await _get_user_from_token(db, authorization)
    return _user_to_response(user)


@router.get("/me/plan", response_model=PlanResponse)
async def get_my_plan(db: AsyncSession = Depends(get_db), authorization: str = Depends(_require_auth)):
    user = await _get_user_from_token(db, authorization)
    info = plan_service.get_plan_info(user)
    flags = plan_service.get_features(info.plan)
    return PlanResponse(
        plan=info.plan,
        remaining_days=info.remaining_days,
        is_trial_expired=info.is_trial_expired,
        features={
            "can_export_report": flags.can_export_report,
            "can_keep_unlimited_history": flags.can_keep_unlimited_history,
            "can_use_future_plugins": flags.can_use_future_plugins,
            "can_remove_branding": flags.can_remove_branding,
            "unlimited_projects": flags.unlimited_projects,
        },
    )


async def _require_auth(authorization: str | None = None):
    """FastAPI dependency: extract and validate Bearer token."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")
    token = authorization.removeprefix("Bearer ")
    user_id = auth_service.decode_access_token(token)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return authorization


async def _get_user_from_token(db: AsyncSession, authorization: str):
    token = authorization.removeprefix("Bearer ")
    user_id = auth_service.decode_access_token(token)
    user = await auth_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user