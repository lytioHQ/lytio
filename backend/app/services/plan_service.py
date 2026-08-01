"""Plan service — trial/pro feature flags. No payment logic."""

from datetime import datetime, timezone
from dataclasses import dataclass


TRIAL_DAYS = 14


@dataclass
class PlanInfo:
    plan: str  # "trial" | "pro"
    trial_started_at: datetime | None = None
    trial_ends_at: datetime | None = None
    remaining_days: int = 0
    is_trial_expired: bool = False

    @property
    def is_pro(self) -> bool:
        return self.plan == "pro"

    @property
    def is_trial(self) -> bool:
        return self.plan == "trial"


@dataclass
class FeatureFlags:
    can_export_report: bool = False
    can_keep_unlimited_history: bool = False
    can_use_future_plugins: bool = False
    can_remove_branding: bool = False
    unlimited_projects: bool = True


def get_plan_info(user) -> PlanInfo:
    now = datetime.now(timezone.utc)
    plan = getattr(user, "plan", "trial") or "trial"
    trial_start = getattr(user, "trial_started_at", None)
    trial_end = getattr(user, "trial_ends_at", None)

    remaining = 0
    expired = False

    if plan == "trial" and trial_end is not None:
        delta = trial_end - now
        remaining = max(0, delta.days)
        expired = remaining <= 0

    return PlanInfo(
        plan=plan,
        trial_started_at=trial_start,
        trial_ends_at=trial_end,
        remaining_days=remaining,
        is_trial_expired=expired,
    )


def get_features(plan: str) -> FeatureFlags:
    if plan == "pro":
        return FeatureFlags(
            can_export_report=True,
            can_keep_unlimited_history=True,
            can_use_future_plugins=True,
            can_remove_branding=True,
            unlimited_projects=True,
        )
    return FeatureFlags(
        can_export_report=False,
        can_keep_unlimited_history=False,
        can_use_future_plugins=False,
        can_remove_branding=False,
        unlimited_projects=True,
    )