"""Audit logging — records security-relevant events. No sensitive data."""

from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit_log import AuditLog


async def log_event(
    db: AsyncSession,
    user_id: int,
    event: str,
    project_id: int | None = None,
) -> None:
    entry = AuditLog(user_id=user_id, event=event, project_id=project_id)
    db.add(entry)
    await db.commit()