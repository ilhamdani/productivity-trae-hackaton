import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import AuthContext, require_api_key
from ..db.engine import get_db
from ..db.models import TeamMember, User
from ..subscription import get_or_create_subscription, get_pricing_plan_for_subscription, get_subscription_owner_user_id, get_team_for_user

router = APIRouter()


@router.get("/users")
def list_users(ctx: AuthContext = Depends(require_api_key), db: Session = Depends(get_db)) -> dict[str, object]:
    owner_user_id = get_subscription_owner_user_id(db, user_id=ctx.user_id)
    sub = get_or_create_subscription(db, user_id=owner_user_id)
    plan = get_pricing_plan_for_subscription(db, sub=sub)
    plan_out = (
        None
        if not plan
        else {
            "id": str(plan.id),
            "key": plan.key,
            "name": plan.name,
            "price_amount": int(plan.price_amount),
            "currency": plan.currency,
            "interval": plan.interval,
            "is_active": bool(plan.is_active),
            "campaign_monthly_limit": plan.campaign_monthly_limit,
            "user_seats_limit": plan.user_seats_limit,
        }
    )
    sub_out = {
        "plan_key": sub.plan_key,
        "pricing_plan_id": (None if not sub.pricing_plan_id else str(sub.pricing_plan_id)),
        "status": sub.status,
        "started_at": sub.started_at.isoformat(),
        "current_period_end": (None if not sub.current_period_end else sub.current_period_end.isoformat()),
        "pricing_plan": plan_out,
    }

    team = get_team_for_user(db, user_id=ctx.user_id)
    if not team:
        users = db.execute(select(User).where(User.id == ctx.user_id)).scalars().all()
        regular = [u for u in users if u.role != "super_admin"]
        return {
            "team": None,
            "subscription": sub_out,
            "users": [{"id": str(u.id), "username": u.username, "role": u.role} for u in regular],
        }

    member_ids = [
        r[0]
        for r in db.execute(select(TeamMember.user_id).where(TeamMember.team_id == team.id)).all()
        if isinstance(r[0], uuid.UUID)
    ]
    users = db.execute(select(User).where(User.id.in_(member_ids)).order_by(User.created_at.asc())).scalars().all()
    regular = [u for u in users if u.role != "super_admin"]
    return {
        "team": {"id": str(team.id), "name": team.name, "owner_user_id": str(team.owner_user_id)},
        "subscription": sub_out,
        "users": [{"id": str(u.id), "username": u.username, "role": u.role} for u in regular],
    }
