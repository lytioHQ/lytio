"""M2.14.0 Action Execution Verification service.

Factual layer between Action Items and Verification:

- ``action_executions``: append-only, user-recorded execution facts
  (idempotent via ``client_key``). AI never judges whether an action was
  executed; the log only records what the user reports.
- ``action_observations``: code-computed alignment of an action's target
  metric against a verification run's ``computed_metric_changes``.
  AI never generates metric bindings and never decides alignment.

Compatibility: additive only. Historical rows, contracts and result_json are
never modified.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.action_item import ActionExecution, ActionItem, ActionObservation
from app.schemas.action_item import ACTION_STATUSES
from app.services import analysis_run_service
from app.services.verification_metrics import COMPARABLE_METRICS

OBSERVATION_ENGINE_VERSION = "action_observation_v1"
ALIGNED = "aligned"
NOT_ALIGNED = "not_aligned"
UNABLE_TO_VERIFY = "unable_to_verify"

# Deterministic, code-only keyword map for best-effort target binding.
# source="code_keyword". A failed match stays unbound (never AI-invented).
TARGET_METRIC_KEYWORDS: list[tuple[str, str, tuple[str, ...]]] = [
    ("average_order_value", "up", ("客单价", "平均客单价", "订单均价", "aov", "avg order value", "average order value")),
    ("customer_concentration", "down", ("客户集中度", "集中度", "top1客户占比", "concentration")),
    ("total_sales", "up", ("销售额", "销售总额", "总销售额", "营收", "收入", "total sales", "sales total")),
    ("order_count", "up", ("订单量", "订单数量", "成交数量", "成交订单数", "order count", "orders")),
    ("customer_count", "up", ("客户数", "客户数量", "客户总量", "新客户", "开发新客户", "补充新客户", "customer count", "customers")),
    ("sales_growth", "up", ("销售增长", "增长率", "sales growth")),
]


def auto_bind_target_metric(description: str | None) -> dict[str, Any]:
    """Best-effort code keyword binding. Never calls AI."""
    text = (description or "").lower()
    for metric_name, direction, keywords in TARGET_METRIC_KEYWORDS:
        for keyword in keywords:
            if keyword in text:
                return {
                    "target_metric_name": metric_name,
                    "target_direction": direction,
                    "target_metric_source": "code_keyword",
                }
    return {
        "target_metric_name": None,
        "target_direction": None,
        "target_metric_source": "none",
    }


def _default_direction(metric_name: str | None) -> str | None:
    if not metric_name:
        return None
    return COMPARABLE_METRICS.get(metric_name)


def compute_alignment(
    change: dict[str, Any] | None, expected_direction: str | None
) -> tuple[str, str | None]:
    """Pure direction-vs-change alignment (code only).

    Returns (alignment, reason). Never asserts causation; a flat or
    unavailable metric stays unable_to_verify.
    """
    if not change or change.get("status") != "available":
        return UNABLE_TO_VERIFY, "metric_unavailable"
    direction = change.get("direction")
    if direction in (None, "unavailable"):
        return UNABLE_TO_VERIFY, "metric_unavailable"
    if expected_direction not in ("up", "down"):
        return UNABLE_TO_VERIFY, "no_expected_direction"
    if direction == "unchanged":
        return UNABLE_TO_VERIFY, "flat_change"
    if direction == "improved":
        if expected_direction == "up":
            return ALIGNED, None
        return NOT_ALIGNED, None
    if direction == "declined":
        if expected_direction == "down":
            return ALIGNED, None
        return NOT_ALIGNED, None
    return UNABLE_TO_VERIFY, "insufficient_data"


def decide_observation(
    change: dict[str, Any] | None,
    expected_direction: str | None,
    executed: bool,
) -> tuple[str, str | None]:
    """Full per-action decision (code only, offline-testable).

    - Execution evidence missing -> unable_to_verify (never claims success).
    - Metric not computable -> unable_to_verify (never fabricates numbers).
    - Otherwise delegate to ``compute_alignment``.
    """
    if not change or change.get("status") != "available":
        return UNABLE_TO_VERIFY, "metric_unavailable"
    if not executed:
        return UNABLE_TO_VERIFY, "not_executed"
    return compute_alignment(change, expected_direction)


def _num(value: Any) -> float | int | None:
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, Decimal):
        value = float(value)
    if isinstance(value, (int, float)):
        if float(value).is_integer():
            return int(value)
        return round(float(value), 4)
    return None


# ---------------------------------------------------------------------------
# Execution records (append-only, idempotent)
# ---------------------------------------------------------------------------

async def _get_action(
    db: AsyncSession, project_id: int, user_id: int, action_id: int
) -> ActionItem | None:
    result = await db.execute(
        select(ActionItem).where(
            ActionItem.id == action_id,
            ActionItem.project_id == project_id,
            ActionItem.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def get_execution_by_client_key(
    db: AsyncSession, action_id: int, client_key: str
) -> ActionExecution | None:
    if not client_key:
        return None
    result = await db.execute(
        select(ActionExecution).where(
            ActionExecution.action_id == action_id,
            ActionExecution.client_key == client_key,
        )
    )
    return result.scalar_one_or_none()


async def create_execution(
    db: AsyncSession,
    project_id: int,
    user_id: int,
    action_id: int,
    *,
    kind: str = "execution",
    note: str | None = None,
    evidence: str | None = None,
    client_key: str | None = None,
    status: str | None = None,
) -> ActionExecution | None:
    """Append one factual execution/note record.

    Idempotent by ``client_key``: replaying the same key returns the existing
    record. Optional ``status`` is a user-declared state applied in the same
    request (never derived by AI); when absent the action status is untouched.
    """
    action = await _get_action(db, project_id, user_id, action_id)
    if action is None:
        return None
    if client_key:
        existing = await get_execution_by_client_key(db, action_id, client_key)
        if existing is not None:
            return existing
        key = client_key
    else:
        key = f"auto-{uuid.uuid4().hex}"

    if status is not None:
        if status not in ACTION_STATUSES:
            raise ValueError("invalid_status")
        action.status = status
        if status == "completed":
            if action.completed_at is None:
                action.completed_at = datetime.now(timezone.utc)
        else:
            action.completed_at = None

    record = ActionExecution(
        action_id=action.id,
        project_id=project_id,
        user_id=user_id,
        kind=kind,
        note=note,
        evidence=evidence,
        status_snapshot=action.status,
        client_key=key,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


async def list_executions(db: AsyncSession, action_id: int) -> list[ActionExecution]:
    result = await db.execute(
        select(ActionExecution)
        .where(ActionExecution.action_id == action_id)
        .order_by(ActionExecution.created_at.desc(), ActionExecution.id.desc())
    )
    return list(result.scalars().all())


# ---------------------------------------------------------------------------
# Observations (code-computed, idempotent per run)
# ---------------------------------------------------------------------------

async def _executed_action_ids(db: AsyncSession, action_ids: list[int]) -> set[int]:
    if not action_ids:
        return set()
    result = await db.execute(
        select(ActionExecution.action_id).where(
            ActionExecution.action_id.in_(action_ids),
            ActionExecution.kind == "execution",
        )
    )
    return {int(row[0]) for row in result.all()}


async def _existing_observation_keys(
    db: AsyncSession, action_ids: list[int], verification_run_id: int
) -> set[tuple[int, str]]:
    if not action_ids:
        return set()
    result = await db.execute(
        select(ActionObservation.action_id, ActionObservation.metric_name).where(
            ActionObservation.action_id.in_(action_ids),
            ActionObservation.verification_run_id == verification_run_id,
        )
    )
    return {(int(row[0]), str(row[1])) for row in result.all()}


async def create_observations_for_verification(
    db: AsyncSession,
    project_id: int,
    verification_run_id: int,
    computed_changes: list[dict[str, Any]] | None = None,
) -> int:
    """Compute per-action observations after a verification run.

    Only actions with a bound target metric produce rows; unbound actions are
    surfaced honestly as ``unable_to_verify`` by ``build_run_observation_view``.
    Idempotent: (action_id, verification_run_id, metric_name) is unique.
    """
    run = await analysis_run_service.get_run(db, verification_run_id)
    if run is None or run.project_id != project_id or run.analysis_type != "verification":
        return 0
    parent_run_id = run.parent_run_id
    if not parent_run_id:
        return 0

    result = await db.execute(
        select(ActionItem).where(
            ActionItem.project_id == project_id,
            ActionItem.source_run_id == parent_run_id,
        )
    )
    actions = list(result.scalars().all())
    if not actions:
        return 0

    action_ids = [a.id for a in actions]
    changes_by_metric: dict[str, dict[str, Any]] = {
        c.get("metric_name"): c
        for c in (computed_changes or [])
        if isinstance(c, dict) and c.get("metric_name")
    }
    executed_ids = await _executed_action_ids(db, action_ids)
    existing_keys = await _existing_observation_keys(db, action_ids, verification_run_id)

    created = 0
    for action in actions:
        metric_name = action.target_metric_name
        if not metric_name:
            continue
        key = (action.id, metric_name)
        if key in existing_keys:
            continue
        change = changes_by_metric.get(metric_name)
        expected_direction = action.target_direction or _default_direction(metric_name)
        executed = action.id in executed_ids
        alignment, reason = decide_observation(change, expected_direction, executed)
        db.add(
            ActionObservation(
                action_id=action.id,
                verification_run_id=verification_run_id,
                project_id=project_id,
                metric_name=metric_name,
                before_value=_num(change.get("before")) if change else None,
                after_value=_num(change.get("after")) if change else None,
                absolute_delta=_num(change.get("absolute_change")) if change else None,
                percent_delta=_num(change.get("percentage_change")) if change else None,
                direction=change.get("direction") if change else None,
                expected_direction=expected_direction,
                alignment=alignment,
                executed=executed,
                reason=reason,
                source="verification_metrics",
                engine_version=OBSERVATION_ENGINE_VERSION,
            )
        )
        created += 1
    if created:
        await db.commit()
    return created


async def list_observations_for_run(
    db: AsyncSession, verification_run_id: int
) -> list[ActionObservation]:
    result = await db.execute(
        select(ActionObservation)
        .where(ActionObservation.verification_run_id == verification_run_id)
        .order_by(ActionObservation.id)
    )
    return list(result.scalars().all())


async def list_observations(db: AsyncSession, action_id: int) -> list[ActionObservation]:
    result = await db.execute(
        select(ActionObservation)
        .where(ActionObservation.action_id == action_id)
        .order_by(ActionObservation.verification_run_id.desc(), ActionObservation.id.desc())
    )
    return list(result.scalars().all())


def observation_dict(
    obs: ActionObservation, description: str | None = None
) -> dict[str, Any]:
    return {
        "id": obs.id,
        "action_id": obs.action_id,
        "verification_run_id": obs.verification_run_id,
        "description": description,
        "metric_name": obs.metric_name,
        "before_value": _num(obs.before_value),
        "after_value": _num(obs.after_value),
        "absolute_delta": _num(obs.absolute_delta),
        "percent_delta": _num(obs.percent_delta),
        "direction": obs.direction,
        "expected_direction": obs.expected_direction,
        "alignment": obs.alignment,
        "executed": bool(obs.executed),
        "reason": obs.reason,
        "source": obs.source,
        "engine_version": obs.engine_version,
        "created_at": obs.created_at,
    }


async def build_run_observation_view(
    db: AsyncSession, project_id: int, verification_run_id: int
) -> list[dict[str, Any]]:
    """Per-action view for the comparison report (additive).

    Bound actions with observations return their rows; unbound actions and
    bound-but-missing observations surface honestly as unable_to_verify.
    """
    run = await analysis_run_service.get_run(db, verification_run_id)
    if run is None or run.project_id != project_id:
        return []
    parent_run_id = run.parent_run_id
    actions: list[ActionItem] = []
    if parent_run_id:
        result = await db.execute(
            select(ActionItem).where(
                ActionItem.project_id == project_id,
                ActionItem.source_run_id == parent_run_id,
            )
        )
        actions = list(result.scalars().all())

    obs_by_action: dict[int, list[ActionObservation]] = {}
    for obs in await list_observations_for_run(db, verification_run_id):
        obs_by_action.setdefault(obs.action_id, []).append(obs)

    view: list[dict[str, Any]] = []
    for action in actions:
        rows = obs_by_action.get(action.id)
        if rows:
            for obs in rows:
                view.append(observation_dict(obs, description=action.description))
            continue
        view.append(
            {
                "id": None,
                "action_id": action.id,
                "verification_run_id": verification_run_id,
                "description": action.description,
                "metric_name": action.target_metric_name,
                "before_value": None,
                "after_value": None,
                "absolute_delta": None,
                "percent_delta": None,
                "direction": None,
                "expected_direction": action.target_direction,
                "alignment": UNABLE_TO_VERIFY,
                "executed": False,
                "reason": (
                    "observation_missing" if action.target_metric_name else "no_target_metric"
                ),
                "source": "verification_metrics",
                "engine_version": OBSERVATION_ENGINE_VERSION,
                "created_at": None,
            }
        )
    return view


# ---------------------------------------------------------------------------
# Stats for list/overview payloads (batched, no N+1)
# ---------------------------------------------------------------------------

async def get_action_stats(
    db: AsyncSession, action_ids: list[int]
) -> tuple[dict[int, int], dict[int, dict[str, int]]]:
    exec_counts: dict[int, int] = {}
    obs_summary: dict[int, dict[str, int]] = {}
    if not action_ids:
        return exec_counts, obs_summary
    er = await db.execute(
        select(ActionExecution.action_id, func.count())
        .where(ActionExecution.action_id.in_(action_ids))
        .group_by(ActionExecution.action_id)
    )
    for action_id, count in er.all():
        exec_counts[int(action_id)] = int(count)
    orows = await db.execute(
        select(ActionObservation.action_id, ActionObservation.alignment).where(
            ActionObservation.action_id.in_(action_ids)
        )
    )
    for action_id, alignment in orows.all():
        summary = obs_summary.setdefault(
            int(action_id),
            {"total": 0, ALIGNED: 0, NOT_ALIGNED: 0, UNABLE_TO_VERIFY: 0},
        )
        summary["total"] += 1
        summary[alignment] = summary.get(alignment, 0) + 1
    return exec_counts, obs_summary
