"""M2.12.3 Action Item service.

Business action tracking: turn AI recommendations into trackable actions,
manage their execution state, and link actions to verification runs with
*factual* evidence only.

Design constraints:
- Full source chain is preserved: action -> source_run_id ->
  recommendation_id -> evidence snapshot (copied from result_json).
- Status is user-managed: pending / completed / cancelled.
- Verification linkage is mechanical (text matching of the already-parsed
  comparison result) and NEVER flips action status, because AI must not
  judge whether a task was executed; it may only explain metric changes.
"""

import difflib
import json
import re
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.action_item import ActionItem
from app.models.analysis_run import AnalysisRun
from app.schemas.action_item import (
    ACTION_STATUSES,
    ActionItemUpdate,
)
from app.services import analysis_run_service

MATCH_THRESHOLD = 0.85


# ---------------------------------------------------------------------------
# Recommendation extraction from a stored AnalysisRun (no re-parsing via AI)
# ---------------------------------------------------------------------------

def _jstr(value: object) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        return value
    try:
        return json.dumps(value, ensure_ascii=False)
    except (TypeError, ValueError):
        return None


def extract_recommendations(result_json: str | None) -> list[dict]:
    """Return normalized recommendation dicts from an AnalysisRun result_json.

    Structured recommendations look like:
      {"id": "recommendation_x", "title": "...", "description": "...",
       "priority": "high", "evidence": {...}, "expected_impact": {...}}
    Legacy text lists are handled defensively and skipped when untitled.
    """
    if not result_json:
        return []
    try:
        data = json.loads(result_json)
    except (json.JSONDecodeError, TypeError):
        return []
    raw = data.get("recommendations") or []
    if not isinstance(raw, list):
        return []

    out: list[dict] = []
    for item in raw:
        if isinstance(item, str):
            title = item.strip()
            if not title:
                continue
            out.append(
                {
                    "recommendation_id": None,
                    "title": title,
                    "description": "",
                    "priority": None,
                    "evidence": None,
                    "expected_impact": None,
                    "expected_result": None,
                }
            )
            continue
        if not isinstance(item, dict):
            continue
        title = str(item.get("title") or "").strip()
        if not title:
            continue
        rid = item.get("id")
        ei = item.get("expected_impact") if isinstance(item.get("expected_impact"), dict) else None
        out.append(
            {
                "recommendation_id": str(rid) if rid else None,
                "title": title,
                "description": str(item.get("description") or "").strip(),
                "priority": str(item.get("priority") or "").strip() or None,
                "evidence": item.get("evidence"),
                "expected_impact": ei,
                "expected_result": str(ei.get("expected_result") or "").strip() if ei else None,
            }
        )
    return out


# ---------------------------------------------------------------------------
# Text matching (mechanical, deterministic; no LLM involved)
# ---------------------------------------------------------------------------

_TOKEN_RE = re.compile(r"[\w\u4e00-\u9fff]+")


def _normalize(text: str) -> str:
    tokens = _TOKEN_RE.findall((text or "").lower())
    return " ".join(tokens)


def _similarity(a: str, b: str) -> float:
    return difflib.SequenceMatcher(None, _normalize(a), _normalize(b)).ratio()


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

async def create_actions_from_run(
    db: AsyncSession,
    project_id: int,
    user_id: int,
    run_id: int,
) -> tuple[list[ActionItem], list[ActionItem]]:
    """Create Action Items from an AnalysisRun's recommendations (idempotent).

    Returns (created, existing). A recommendation is considered existing when
    the same (project, source_run, recommendation_id) is already present, or
    (project, source_run, description) when no stable recommendation id exists.
    """
    run = await analysis_run_service.get_run(db, run_id)
    if run is None or run.project_id != project_id:
        raise ValueError("run_not_found")

    recs = extract_recommendations(run.result_json)
    existing_rows = await _list_existing(db, project_id, run_id)
    existing_by_rid = {
        r.recommendation_id: r for r in existing_rows if r.recommendation_id
    }
    existing_by_desc = {_normalize(r.description): r for r in existing_rows}

    created: list[ActionItem] = []
    existing: list[ActionItem] = []
    for rec in recs:
        match = None
        rid = rec["recommendation_id"]
        if rid and rid in existing_by_rid:
            match = existing_by_rid[rid]
        else:
            match = existing_by_desc.get(_normalize(rec["title"]))
        if match is not None:
            existing.append(match)
            continue
        action = ActionItem(
            project_id=project_id,
            source_run_id=run_id,
            user_id=user_id,
            recommendation_id=rid,
            description=rec["title"],
            detail=rec["description"] or None,
            priority_snapshot=rec["priority"],
            action_type="recommendation",
            evidence_snapshot=_jstr(rec["evidence"]),
            expected_impact=_jstr(rec["expected_impact"]),
            expected_result=rec["expected_result"],
            status="pending",
        )
        db.add(action)
        created.append(action)

    if created:
        await db.commit()
        for action in created:
            await db.refresh(action)
    return created, existing


async def _list_existing(db: AsyncSession, project_id: int, run_id: int) -> list[ActionItem]:
    result = await db.execute(
        select(ActionItem).where(
            ActionItem.project_id == project_id,
            ActionItem.source_run_id == run_id,
        )
    )
    return list(result.scalars().all())


async def get_action(db: AsyncSession, project_id: int, user_id: int, action_id: int) -> ActionItem | None:
    result = await db.execute(
        select(ActionItem).where(
            ActionItem.id == action_id,
            ActionItem.project_id == project_id,
            ActionItem.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def list_actions(
    db: AsyncSession,
    project_id: int,
    user_id: int,
    status: str | None = None,
) -> list[ActionItem]:
    query = (
        select(ActionItem)
        .where(ActionItem.project_id == project_id, ActionItem.user_id == user_id)
        .order_by(ActionItem.created_at.desc())
    )
    if status:
        query = query.where(ActionItem.status == status)
    result = await db.execute(query)
    return list(result.scalars().all())


async def update_action(
    db: AsyncSession,
    project_id: int,
    user_id: int,
    action_id: int,
    data: ActionItemUpdate,
) -> ActionItem | None:
    action = await get_action(db, project_id, user_id, action_id)
    if action is None:
        return None

    if data.description is not None:
        action.description = data.description.strip()
    if data.owner is not None:
        action.owner = data.owner.strip() or None
    if data.deadline is not None:
        action.deadline = data.deadline
    if data.status is not None:
        if data.status not in ACTION_STATUSES:
            raise ValueError("invalid_status")
        action.status = data.status

    if action.status == "completed":
        if action.completed_at is None:
            action.completed_at = datetime.now(timezone.utc)
    else:
        action.completed_at = None

    await db.commit()
    await db.refresh(action)
    return action


async def get_action_overview(db: AsyncSession, project_id: int, user_id: int) -> dict:
    rows = await list_actions(db, project_id, user_id)
    overview = {"total": len(rows), "pending": 0, "completed": 0, "cancelled": 0, "verified": 0}
    for action in rows:
        overview[action.status] = overview.get(action.status, 0) + 1
        if action.verification_run_id is not None:
            overview["verified"] += 1
    return overview


# ---------------------------------------------------------------------------
# Verification linkage (factual only)
# ---------------------------------------------------------------------------

async def link_actions_to_verification(
    db: AsyncSession,
    project_id: int,
    verification_run_id: int,
) -> int:
    """Link actions to a completed verification run.

    - Actions whose source_run_id == verification.parent_run_id are linked
      (records verification_run_id + verified_at).
    - When a mechanical text match against comparison.recommendation_results
      exists, the matched factual evidence is snapshotted into
      verification_evidence.
    - Action status is NEVER changed here.
    Returns the number of actions linked.
    """
    run = await analysis_run_service.get_run(db, verification_run_id)
    if run is None or run.project_id != project_id or run.analysis_type != "verification":
        return 0
    parent_run_id = run.parent_run_id
    if not parent_run_id:
        return 0

    recommendation_results: list[dict] = []
    try:
        comparison = json.loads(run.comparison_result or run.result_json or "{}")
        recommendation_results = comparison.get("recommendation_results") or []
    except (json.JSONDecodeError, TypeError):
        recommendation_results = []

    result = await db.execute(
        select(ActionItem).where(
            ActionItem.project_id == project_id,
            ActionItem.source_run_id == parent_run_id,
        )
    )
    actions = list(result.scalars().all())
    if not actions:
        return 0

    linked = 0
    now = datetime.now(timezone.utc)
    for action in actions:
        evidence = None
        if recommendation_results:
            best = max(
                recommendation_results,
                key=lambda r: _similarity(
                    str(r.get("recommendation") or ""), action.description
                ),
                default=None,
            )
            if best is not None and _similarity(
                str(best.get("recommendation") or ""), action.description
            ) >= MATCH_THRESHOLD:
                evidence = {
                    "recommendation": best.get("recommendation"),
                    "evidence": best.get("evidence"),
                    "reason": best.get("reason"),
                }
        action.verification_run_id = verification_run_id
        action.verification_evidence = _jstr(evidence)
        action.verified_at = now
        linked += 1

    if linked:
        await db.commit()
    return linked
