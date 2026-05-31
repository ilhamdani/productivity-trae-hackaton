from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .db.models import PricingPlan, Team, TeamMember, UserSubscription
from .errors import ApiException


def get_team_for_user(db: Session, *, user_id: uuid.UUID) -> Team | None:
    team = db.execute(select(Team).where(Team.owner_user_id == user_id)).scalar_one_or_none()
    if team:
        return team
    team_id = db.execute(select(TeamMember.team_id).where(TeamMember.user_id == user_id)).scalar_one_or_none()
    if not team_id:
        return None
    return db.execute(select(Team).where(Team.id == team_id)).scalar_one_or_none()


def get_subscription_owner_user_id(db: Session, *, user_id: uuid.UUID) -> uuid.UUID:
    team = get_team_for_user(db, user_id=user_id)
    if not team:
        return user_id
    return team.owner_user_id


def get_or_create_subscription(db: Session, *, user_id: uuid.UUID) -> UserSubscription:
    sub = db.execute(select(UserSubscription).where(UserSubscription.user_id == user_id)).scalar_one_or_none()
    if sub:
        return sub
    free_plan = db.execute(select(PricingPlan).where(PricingPlan.key == "free")).scalar_one_or_none()
    sub = UserSubscription(user_id=user_id, plan_key="free", status="active", pricing_plan_id=(None if not free_plan else free_plan.id))
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


def get_pricing_plan_for_subscription(db: Session, *, sub: UserSubscription) -> PricingPlan | None:
    if sub.pricing_plan_id:
        return db.execute(select(PricingPlan).where(PricingPlan.id == sub.pricing_plan_id)).scalar_one_or_none()
    return db.execute(select(PricingPlan).where(PricingPlan.key == sub.plan_key)).scalar_one_or_none()


def get_team_member_user_ids(db: Session, *, team_id: uuid.UUID) -> list[uuid.UUID]:
    return [r[0] for r in db.execute(select(TeamMember.user_id).where(TeamMember.team_id == team_id)).all()]


def require_premium_access(db: Session, *, user_id: uuid.UUID) -> tuple[UserSubscription, PricingPlan, list[uuid.UUID]]:
    owner_user_id = get_subscription_owner_user_id(db, user_id=user_id)
    sub = get_or_create_subscription(db, user_id=owner_user_id)
    if sub.status != "active":
        raise ApiException(status_code=403, code="subscription_inactive", message="Subscription inactive")

    plan = get_pricing_plan_for_subscription(db, sub=sub)
    if not plan:
        raise ApiException(status_code=403, code="plan_not_found", message="Pricing plan not found")
    if not plan.is_active:
        raise ApiException(status_code=403, code="plan_inactive", message="Pricing plan inactive")

    team = get_team_for_user(db, user_id=user_id)
    if not team:
        return sub, plan, [user_id]

    member_ids = get_team_member_user_ids(db, team_id=team.id)
    if plan.user_seats_limit is not None:
        limit = int(plan.user_seats_limit)
        if len(member_ids) > limit:
            raise ApiException(status_code=403, code="seats_limit_reached", message="User seats limit reached")

    return sub, plan, member_ids


def get_current_month_window_utc(now: datetime | None = None) -> tuple[datetime, datetime]:
    n = datetime.now(timezone.utc) if not now else now.astimezone(timezone.utc)
    start = n.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if start.month == 12:
        end = start.replace(year=start.year + 1, month=1)
    else:
        end = start.replace(month=start.month + 1)
    return start, end


def count_campaigns_in_window(db: Session, *, user_ids: list[uuid.UUID], start: datetime, end: datetime) -> int:
    from .db.models import Campaign

    if not user_ids:
        return 0
    return int(
        db.execute(select(func.count()).select_from(Campaign).where(Campaign.user_id.in_(user_ids), Campaign.created_at >= start, Campaign.created_at < end)).scalar_one()
    )

