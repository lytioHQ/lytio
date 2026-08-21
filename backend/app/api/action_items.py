"""M2.12.3 Action Item API (incremental, prefix /api/projects).

M2.14.0 adds execution-record and code-computed observation endpoints. All
additions are additive; the action status machine is untouched.
"""

import json

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.action_item import (
    ACTION_STATUSES,
    ActionCreateResult,
    ActionItemOut,
    ActionItemUpdate,
    ActionOverview,
    ExecutionCreate,
    ExecutionOut,
    ObservationOut,
)
from app.services import action_execution_service, action_item_service, project_service

router = APIRouter(prefix="/api/projects", tags=["action_items"])


def _serialize(action, exec_count: int = 0, obs_summary: dict | None = None) -> ActionItemOut:
    evidence = None
    if action.verification_evidence:
        try:
            evidence = json.loads(action.verification_evidence)
        except (json.JSONDecodeError, TypeError):
            evidence = None
    return ActionItemOut(
        id=action.id,
        project_id=action.project_id,
        source_run_id=action.source_run_id,
        recommendation_id=action.recommendation_id,
        description=action.description,
        detail=action.detail,
        priority_snapshot=action.priority_snapshot,
        action_type=action.action_type,
        expected_result=action.expected_result,
        owner=action.owner,
        deadline=action.deadline,
        status=action.status,
        completed_at=action.completed_at,
        verification_run_id=action.verification_run_id,
        verification_evidence=evidence,
        verified_at=action.verified_at,
        target_metric_name=action.target_metric_name,
        target_direction=action.target_direction,
        target_metric_source=action.target_metric_source,
        execution_count=exec_count,
        observations_summary=obs_summary,
        created_at=action.created_at,
        updated_at=action.updated_at,
    )


@router.post("/{project_id}/actions/from-run/{run_id}", response_model=ActionCreateResult)
async def create_actions_from_run(
    project_id: int,
    run_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = await project_service.get_project(db, project_id, user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        created, existing = await action_item_service.create_actions_from_run(
            db, project_id, user.id, run_id
        )
    except ValueError:
        raise HTTPException(status_code=404, detail="Analysis run not found")
    all_rows = created + existing
    exec_counts, obs_summary = await action_execution_service.get_action_stats(
        db, [a.id for a in all_rows]
    )
    return ActionCreateResult(
        created=[
            _serialize(a, exec_counts.get(a.id, 0), obs_summary.get(a.id)) for a in created
        ],
        existing=[
            _serialize(a, exec_counts.get(a.id, 0), obs_summary.get(a.id)) for a in existing
        ],
    )


@router.get("/{project_id}/actions", response_model=list[ActionItemOut])
async def list_actions(
    project_id: int,
    status: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = await project_service.get_project(db, project_id, user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if status is not None and status not in ACTION_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {', '.join(ACTION_STATUSES)}",
        )
    actions = await action_item_service.list_actions(db, project_id, user.id, status=status)
    exec_counts, obs_summary = await action_execution_service.get_action_stats(
        db, [a.id for a in actions]
    )
    return [
        _serialize(a, exec_counts.get(a.id, 0), obs_summary.get(a.id)) for a in actions
    ]


@router.patch("/{project_id}/actions/{action_id}", response_model=ActionItemOut)
async def update_action(
    project_id: int,
    action_id: int,
    data: ActionItemUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = await project_service.get_project(db, project_id, user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        action = await action_item_service.update_action(
            db, project_id, user.id, action_id, data
        )
    except ValueError as exc:
        detail = str(exc)
        if detail == "invalid_target_direction":
            raise HTTPException(status_code=400, detail="Invalid target direction")
        if detail == "invalid_target_metric_source":
            raise HTTPException(status_code=400, detail="Invalid target metric source")
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {', '.join(ACTION_STATUSES)}",
        )
    if action is None:
        raise HTTPException(status_code=404, detail="Action item not found")
    exec_counts, obs_summary = await action_execution_service.get_action_stats(
        db, [action.id]
    )
    return _serialize(action, exec_counts.get(action.id, 0), obs_summary.get(action.id))


@router.get("/{project_id}/actions/overview", response_model=ActionOverview)
async def get_action_overview(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = await project_service.get_project(db, project_id, user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    overview = await action_item_service.get_action_overview(db, project_id, user.id)
    return ActionOverview(**overview)


@router.post(
    "/{project_id}/actions/{action_id}/executions",
    response_model=ExecutionOut,
    status_code=201,
)
async def create_execution(
    project_id: int,
    action_id: int,
    data: ExecutionCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = await project_service.get_project(db, project_id, user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        record = await action_execution_service.create_execution(
            db,
            project_id,
            user.id,
            action_id,
            kind=data.kind,
            note=data.note,
            evidence=data.evidence,
            client_key=data.client_key,
            status=data.status,
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid execution request")
    if record is None:
        raise HTTPException(status_code=404, detail="Action item not found")
    return ExecutionOut(
        id=record.id,
        action_id=record.action_id,
        project_id=record.project_id,
        kind=record.kind,
        note=record.note,
        evidence=record.evidence,
        status_snapshot=record.status_snapshot,
        client_key=record.client_key,
        created_at=record.created_at,
    )


@router.get("/{project_id}/actions/{action_id}/executions", response_model=list[ExecutionOut])
async def list_executions(
    project_id: int,
    action_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = await project_service.get_project(db, project_id, user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    records = await action_execution_service.list_executions(db, action_id)
    return [
        ExecutionOut(
            id=r.id,
            action_id=r.action_id,
            project_id=r.project_id,
            kind=r.kind,
            note=r.note,
            evidence=r.evidence,
            status_snapshot=r.status_snapshot,
            client_key=r.client_key,
            created_at=r.created_at,
        )
        for r in records
    ]


@router.get("/{project_id}/actions/{action_id}/observations", response_model=list[ObservationOut])
async def list_observations(
    project_id: int,
    action_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = await project_service.get_project(db, project_id, user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    rows = await action_execution_service.list_observations(db, action_id)
    return [
        ObservationOut(
            **{k: v for k, v in action_execution_service.observation_dict(o).items() if k != "description"}
        )
        for o in rows
    ]
