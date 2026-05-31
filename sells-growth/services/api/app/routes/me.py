from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import AuthContext, require_api_key
from ..db.engine import get_db
from ..db.models import User
from ..subscription import get_or_create_subscription, get_pricing_plan_for_subscription, get_subscription_owner_user_id

router = APIRouter()


@router.get("/me")
def me(ctx: AuthContext = Depends(require_api_key), db: Session = Depends(get_db)) -> dict[str, object]:
    user = db.execute(select(User).where(User.id == ctx.user_id)).scalar_one_or_none()
    if not user:
        return {"user_id": str(ctx.user_id), "username": None, "role": None, "subscription": None}

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
    return {
        "user_id": str(ctx.user_id),
        "username": user.username,
        "role": user.role,
        "subscription": {
            "plan_key": sub.plan_key,
            "pricing_plan_id": (None if not sub.pricing_plan_id else str(sub.pricing_plan_id)),
            "status": sub.status,
            "started_at": sub.started_at.isoformat(),
            "current_period_end": (None if not sub.current_period_end else sub.current_period_end.isoformat()),
            "pricing_plan": plan_out,
        },
    }
