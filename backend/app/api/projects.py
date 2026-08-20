from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.logging_config import logger
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate
from app.services import project_service, analysis_run_service, report_builder
from app.schemas.schema_mapping import SchemaMappingSaveRequest
from app.services.schema_mapper import build_saved_mapping, detect_schema
from app.services.schema_mapper import (
    apply_confirmation_actions,
    attach_examples_to_mapping,
    build_saved_mapping,
    detect_schema,
    upgrade_mapping,
)
from app.services.workbook_service import extract_canonical_dataset
from app.services.metric_engine import compute_metrics
from app.services.health_score import compute_health_score

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await project_service.list_projects(db, user.id)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    logger.info("project_detail_start", extra={"event": "project_detail", "user_id": user.id, "project_id": project_id})
    project = await project_service.get_project(db, project_id, user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    logger.info("project_detail_loaded", extra={"event": "project_detail", "user_id": user.id, "project_id": project_id})
    await project_service.touch_project(db, project_id, user.id)
    logger.info("project_detail_touched", extra={"event": "project_detail", "user_id": user.id, "project_id": project_id})
    # touch_project's bulk UPDATE expires the in-memory instance; refresh it so
    # response serialization never triggers an async lazy-load (500 in prod).
    await db.refresh(project)
    logger.info("project_detail_refreshed", extra={"event": "project_detail", "user_id": user.id, "project_id": project_id})
    return project


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await project_service.create_project(db, user.id, data)


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    data: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = await project_service.update_project(db, project_id, user.id, data)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    deleted = await project_service.delete_project(db, project_id, user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Project not found")

class FileLinkPayload(BaseModel):
    original_filename: str
    saved_filename: str


@router.patch("/{project_id}/file")
async def link_file(
    project_id: int,
    data: FileLinkPayload,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = await project_service.get_project(db, project_id, user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    await project_service.set_project_file(db, project_id, user.id, data.original_filename, data.saved_filename)
    # Auto-detect and persist a canonical schema mapping (never blocks upload).
    await project_service.ensure_schema_mapping(db, project_id, user.id)
    return {"status": "ok"}

class StatusPayload(BaseModel):
    status: str


@router.patch("/{project_id}/status")
async def set_project_status(
    project_id: int,
    data: StatusPayload,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    from app.schemas.project import ProjectUpdate
    valid = {"draft", "ready", "completed", "archived"}
    if data.status not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid}")
    project = await project_service.update_project(db, project_id, user.id, ProjectUpdate(status=data.status))
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"status": "ok"}

class SaveResultPayload(BaseModel):
    summary: str = ""
    result_json: str = ""
    is_legacy: bool = False


@router.patch("/{project_id}/result")
async def save_result(
    project_id: int,
    data: SaveResultPayload,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = await project_service.get_project(db, project_id, user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    await project_service.save_analysis_result(db, project_id, user.id, data.summary, data.result_json)
    # Create timeline event
    run = await analysis_run_service.create_run(
        db, project_id, data.summary, data.result_json,
        is_legacy=data.is_legacy,
    )
    return {"status": "ok", "run_id": run.id}

class TimelineItem(BaseModel):
    id: int
    created_at: str | None = None
    business_health_score: int | None = None
    summary: str | None = None
    analysis_type: str | None = None
    analysis_direction: str | None = None
    parent_run_id: int | None = None
    dataset_version: str | None = None
    purpose: str | None = None


@router.get("/{project_id}/timeline", response_model=list[TimelineItem])
async def get_timeline(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = await project_service.get_project(db, project_id, user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    runs = await analysis_run_service.list_runs(db, project_id)
    return [
        TimelineItem(
            id=r.id,
            created_at=str(r.created_at) if r.created_at else None,
            business_health_score=r.business_health_score,
            summary=r.summary[:300] if r.summary else None,
            analysis_type=r.analysis_type,
            analysis_direction=r.analysis_direction,
            parent_run_id=r.parent_run_id,
            dataset_version=r.dataset_version,
            purpose=r.purpose,
        )
        for r in runs
    ]

@router.get("/{project_id}/executive")
async def get_executive_report(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = await project_service.get_project(db, project_id, user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.latest_result_json:
        raise HTTPException(status_code=404, detail="No analysis result available. Run an analysis first.")

    report = report_builder.build_report_from_json(
        project.latest_result_json,
        project_name=project.title,
        title=f"{project.title} \u2014 Executive Report",
    )

    if report is None:
        raise HTTPException(status_code=500, detail="Failed to parse stored result")

    return report.model_dump()


@router.get("/{project_id}/schema-mapping")
async def get_project_schema_mapping(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Return the persisted mapping (v2, with examples), or detect on the fly."""
    project = await project_service.get_project(db, project_id, user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.schema_mapping:
        mapping = upgrade_mapping(project.schema_mapping)
        persisted = True
    elif project.saved_filename:
        try:
            dataset = extract_canonical_dataset(user.id, project.saved_filename)
            mapping = detect_schema(dataset["headers"], dataset["column_types"]).to_dict()
            persisted = False
        except Exception:
            raise HTTPException(
                status_code=500, detail="Failed to inspect workbook fields. Please try again."
            )
    else:
        return {
            "project_id": project.id, "persisted": False, "schema_mapping": None,
        }
    # M2.13.1: attach example values from actual rows (read-only, no AI).
    try:
        dataset = extract_canonical_dataset(user.id, project.saved_filename)
        mapping = attach_examples_to_mapping(mapping, dataset)
    except Exception:
        pass  # examples are a display nicety; never fail the request
    return {
        "project_id": project.id, "persisted": persisted, "schema_mapping": mapping,
    }


@router.patch("/{project_id}/schema-mapping")
async def save_project_schema_mapping(
    project_id: int,
    payload: SchemaMappingSaveRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Persist user-confirmed canonical mappings for a project.

    Accepts either the legacy ``mappings`` list or the M2.13.1 ``actions``
    list (confirm / modify / skip). Actions take precedence when provided.
    """
    project = await project_service.get_project(db, project_id, user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project.saved_filename:
        raise HTTPException(status_code=400, detail="No Excel file is linked to this project.")
    try:
        dataset = extract_canonical_dataset(user.id, project.saved_filename)
        headers = dataset["headers"]
        if payload.actions:
            base = project.schema_mapping or detect_schema(
                headers, dataset["column_types"]
            ).to_dict()
            actions = [a.model_dump() for a in payload.actions]
            mapping = apply_confirmation_actions(base, actions, headers, user_id=user.id)
        else:
            confirmed = [(m.canonical_key, m.source_column) for m in payload.mappings]
            mapping = build_saved_mapping(headers, confirmed)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception:
        raise HTTPException(
            status_code=500, detail="Failed to inspect workbook fields. Please try again."
        )
    saved = await project_service.save_schema_mapping(db, project_id, user.id, mapping)
    if not saved:
        raise HTTPException(status_code=404, detail="Project not found")
    return {
        "project_id": saved.id, "persisted": True, "schema_mapping": saved.schema_mapping,
    }


@router.get("/{project_id}/metrics")
async def get_project_metrics(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Return code-computed sales metrics for the project's current dataset."
    Read-only; never writes to the database."""
    project = await project_service.get_project(db, project_id, user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project.saved_filename:
        raise HTTPException(status_code=400, detail="No Excel file is linked to this project.")
    try:
        dataset = extract_canonical_dataset(user.id, project.saved_filename)
        mapping = project.schema_mapping or detect_schema(
            dataset["headers"], dataset["column_types"]
        ).to_dict()
        computed = compute_metrics(dataset, mapping)
    except Exception:
        raise HTTPException(
            status_code=500, detail="Failed to compute metrics. Please try again."
        )
    # M2.12.2: code-computed health score (read-only). Never fails the request;
    # degrade to null when the engine cannot produce a score.
    health_score = None
    try:
        health_score = compute_health_score(dataset, mapping, computed)
    except Exception:
        health_score = None
    return {
        "project_id": project.id,
        "computed_metrics": computed,
        "health_score": health_score,
    }
