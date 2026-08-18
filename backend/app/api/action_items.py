"""M2.12.3 Action Item API (incremental, prefix /api/projects)."""

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
)
from app.services import action_item_service, project_service

router = APIRouter(prefix="/api/projects", tags=["action_items"])


def _serialize(action) -> ActionItemOut:
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
    return ActionCreateResult(
        created=[_serialize(a) for a in created],
        existing=[_serialize(a) for a in existing],
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
    return [_serialize(a) for a in actions]


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
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {', '.join(ACTION_STATUSES)}",
        )
    if action is None:
        raise HTTPException(status_code=404, detail="Action item not found")
    return _serialize(action)


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
