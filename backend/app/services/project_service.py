from datetime import datetime, timezone
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate


async def list_projects(db: AsyncSession, user_id: int) -> list[Project]:
    result = await db.execute(
        select(Project)
        .where(Project.owner_id == user_id, Project.status != "archived")
        .order_by(Project.last_opened_at.desc())
    )
    return list(result.scalars().all())


async def get_project(db: AsyncSession, project_id: int, user_id: int) -> Project | None:
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == user_id)
    )
    return result.scalar_one_or_none()


async def create_project(db: AsyncSession, user_id: int, data: ProjectCreate) -> Project:
    project = Project(
        owner_id=user_id,
        title=data.title,
        industry=data.industry,
        language=data.language,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


async def update_project(db: AsyncSession, project_id: int, user_id: int, data: ProjectUpdate) -> Project | None:
    project = await get_project(db, project_id, user_id)
    if not project:
        return None
    if data.title is not None:
        project.title = data.title
    if data.status is not None:
        project.status = data.status
    project.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(project)
    return project


async def touch_project(db: AsyncSession, project_id: int, user_id: int) -> None:
    await db.execute(
        update(Project)
        .where(Project.id == project_id, Project.owner_id == user_id)
        .values(last_opened_at=datetime.now(timezone.utc))
    )
    await db.commit()


async def set_project_file(
    db: AsyncSession, project_id: int, user_id: int,
    original_filename: str, saved_filename: str,
) -> None:
    await db.execute(
        update(Project)
        .where(Project.id == project_id, Project.owner_id == user_id)
        .values(original_filename=original_filename, saved_filename=saved_filename, status="ready")
    )
    await db.commit()


async def delete_project(db: AsyncSession, project_id: int, user_id: int) -> bool:
    """Permanently delete project and all related data (files, analysis runs)."""
    from pathlib import Path
    from app.models.analysis_run import AnalysisRun
    from app.services import audit_service

    project = await get_project(db, project_id, user_id)
    if not project:
        return False

    # Delete analysis runs
    from sqlalchemy import delete
    await db.execute(delete(AnalysisRun).where(AnalysisRun.project_id == project_id))

    # Delete uploaded file
    if project.saved_filename:
        file_path = Path("storage/uploads") / str(user_id) / project.saved_filename
        try:
            file_path.unlink(missing_ok=True)
        except Exception:
            pass

    # Delete the project itself
    await db.delete(project)

    # Audit log + structured logging
    await audit_service.log_event(db, user_id, "delete", project_id)
    from app.core.logging_config import logger
    logger.info("project_deleted", extra={"event": "delete", "user_id": user_id, "project_id": project_id})

    await db.commit()
    return True

async def save_analysis_result(
    db: AsyncSession, project_id: int, user_id: int,
    summary: str, result_json: str,
) -> None:
    await db.execute(
        update(Project)
        .where(Project.id == project_id, Project.owner_id == user_id)
        .values(
            latest_summary=summary[:5000],
            latest_result_json=result_json[:20000],
            status="completed",
            updated_at=datetime.now(timezone.utc),
        )
    )
    await db.commit()