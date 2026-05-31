from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..auth import require_super_admin
from ..db.engine import get_db
from ..db.models import Campaign, PricingPlan, Team, TeamMember, User, UserSubscription
from ..errors import ApiException
from ..subscription import get_or_create_subscription, get_pricing_plan_for_subscription
from ..jobs.billing import run_with_tracking

router = APIRouter(prefix="/admin", dependencies=[Depends(require_super_admin)])


class AdminUserOut(BaseModel):
    id: uuid.UUID
    username: str | None
    role: str
    created_at: datetime


class AdminUserSubscriptionOut(BaseModel):
    pricing_plan_id: uuid.UUID | None
    plan_key: str
    pricing_plan: AdminPricingPlanBriefOut | None
    status: str
    started_at: datetime
    current_period_end: datetime | None


class AdminUserDetailResponse(BaseModel):
    user: AdminUserOut
    subscription: AdminUserSubscriptionOut | None


class AdminUserListItem(BaseModel):
    user: AdminUserOut
    subscription: AdminUserSubscriptionOut | None


class AdminUserListResponse(BaseModel):
    page: int
    page_size: int
    total: int
    items: list[AdminUserListItem]


class AdminUserUsageOut(BaseModel):
    campaigns_this_month: int
    campaign_monthly_limit: int | None
    team_id: uuid.UUID | None
    team_size: int | None
    user_seats_limit: int | None


class AdminUserUsageListItem(BaseModel):
    user: AdminUserOut
    subscription: AdminUserSubscriptionOut | None
    usage: AdminUserUsageOut


class AdminUserUsageListResponse(BaseModel):
    page: int
    page_size: int
    total: int
    items: list[AdminUserUsageListItem]


class AdminUserSubscriptionUpdateRequest(BaseModel):
    pricing_plan_id: uuid.UUID | None = None
    plan_key: str | None = None
    status: str | None = None
    current_period_end: datetime | None = None


class AdminPricingPlanBriefOut(BaseModel):
    id: uuid.UUID
    key: str
    name: str
    price_amount: int
    currency: str
    interval: str
    is_active: bool
    campaign_monthly_limit: int | None = None
    user_seats_limit: int | None = None


class AdminPricingPlanOut(BaseModel):
    id: uuid.UUID
    key: str
    name: str
    price_amount: int
    currency: str
    interval: str
    is_active: bool
    campaign_monthly_limit: int | None = None
    user_seats_limit: int | None = None
    created_at: datetime
    updated_at: datetime


class AdminPricingPlanListResponse(BaseModel):
    items: list[AdminPricingPlanOut]


class AdminPricingPlanCreateRequest(BaseModel):
    key: str
    name: str
    price_amount: int
    currency: str = "IDR"
    interval: str = "monthly"
    is_active: bool = True
    campaign_monthly_limit: int | None = None
    user_seats_limit: int | None = None


class AdminPricingPlanCreateResponse(BaseModel):
    id: uuid.UUID


class AdminPricingPlanUpdateRequest(BaseModel):
    name: str
    price_amount: int
    currency: str = "IDR"
    interval: str = "monthly"
    is_active: bool = True
    campaign_monthly_limit: int | None = None
    user_seats_limit: int | None = None


def _plan_to_brief(p: PricingPlan) -> AdminPricingPlanBriefOut:
    return AdminPricingPlanBriefOut(
        id=p.id,
        key=p.key,
        name=p.name,
        price_amount=int(p.price_amount),
        currency=p.currency,
        interval=p.interval,
        is_active=p.is_active,
        campaign_monthly_limit=p.campaign_monthly_limit,
        user_seats_limit=p.user_seats_limit,
    )


def _sub_to_out(sub: UserSubscription, plan: PricingPlan | None) -> AdminUserSubscriptionOut:
    return AdminUserSubscriptionOut(
        pricing_plan_id=sub.pricing_plan_id,
        plan_key=sub.plan_key,
        pricing_plan=(None if not plan else _plan_to_brief(plan)),
        status=sub.status,
        started_at=sub.started_at,
        current_period_end=sub.current_period_end,
    )


@router.get("/ping")
def ping() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/users")
def list_users(
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
) -> AdminUserListResponse:
    page = max(1, page)
    page_size = min(100, max(1, page_size))

    total = int(db.execute(select(func.count()).select_from(User)).scalar_one())

    q = (
        select(User, UserSubscription, PricingPlan)
        .outerjoin(UserSubscription, UserSubscription.user_id == User.id)
        .outerjoin(PricingPlan, PricingPlan.id == UserSubscription.pricing_plan_id)
        .order_by(User.created_at.desc())
        .limit(page_size)
        .offset((page - 1) * page_size)
    )
    rows = db.execute(q).all()

    items: list[AdminUserListItem] = []
    for user, sub, plan in rows:
        items.append(
            AdminUserListItem(
                user=AdminUserOut(id=user.id, username=user.username, role=user.role, created_at=user.created_at),
                subscription=(
                    None
                    if not sub
                    else _sub_to_out(sub=sub, plan=plan)
                ),
            )
        )

    return AdminUserListResponse(page=page, page_size=page_size, total=total, items=items)


@router.get("/users/usage")
def list_user_usage(
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
) -> AdminUserUsageListResponse:
    from datetime import timezone

    page = max(1, page)
    page_size = min(100, max(1, page_size))

    total = int(db.execute(select(func.count()).select_from(User)).scalar_one())

    q = (
        select(User, UserSubscription, PricingPlan)
        .outerjoin(UserSubscription, UserSubscription.user_id == User.id)
        .outerjoin(PricingPlan, PricingPlan.id == UserSubscription.pricing_plan_id)
        .order_by(User.created_at.desc())
        .limit(page_size)
        .offset((page - 1) * page_size)
    )
    rows = db.execute(q).all()
    user_ids = [u.id for u, _, _ in rows]

    now = datetime.now(timezone.utc)
    period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if period_start.month == 12:
        period_end = period_start.replace(year=period_start.year + 1, month=1)
    else:
        period_end = period_start.replace(month=period_start.month + 1)

    campaign_counts: dict[uuid.UUID, int] = {}
    if user_ids:
        for user_id, cnt in (
            db.execute(
                select(Campaign.user_id, func.count())
                .where(Campaign.user_id.in_(user_ids), Campaign.created_at >= period_start, Campaign.created_at < period_end)
                .group_by(Campaign.user_id)
            )
            .all()
        ):
            campaign_counts[user_id] = int(cnt)

    team_by_owner: dict[uuid.UUID, uuid.UUID] = {}
    team_owner_ids: dict[uuid.UUID, uuid.UUID] = {}
    if user_ids:
        for t in db.execute(select(Team).where(Team.owner_user_id.in_(user_ids))).scalars().all():
            team_by_owner[t.owner_user_id] = t.id
            team_owner_ids[t.id] = t.owner_user_id

    member_team_by_user: dict[uuid.UUID, uuid.UUID] = {}
    if user_ids:
        for user_id, team_id in db.execute(select(TeamMember.user_id, TeamMember.team_id).where(TeamMember.user_id.in_(user_ids))).all():
            member_team_by_user[user_id] = team_id

    team_ids = set(team_by_owner.values()) | set(member_team_by_user.values())
    team_sizes: dict[uuid.UUID, int] = {}
    if team_ids:
        for team_id, cnt in (
            db.execute(select(TeamMember.team_id, func.count()).where(TeamMember.team_id.in_(list(team_ids))).group_by(TeamMember.team_id)).all()
        ):
            team_sizes[team_id] = int(cnt)

    items: list[AdminUserUsageListItem] = []
    for user, sub, plan in rows:
        team_id = team_by_owner.get(user.id) or member_team_by_user.get(user.id)
        team_size = None if not team_id else team_sizes.get(team_id, 0)
        campaign_limit = None if not plan else plan.campaign_monthly_limit
        seats_limit = None if not plan else plan.user_seats_limit
        items.append(
            AdminUserUsageListItem(
                user=AdminUserOut(id=user.id, username=user.username, role=user.role, created_at=user.created_at),
                subscription=(None if not sub else _sub_to_out(sub=sub, plan=plan)),
                usage=AdminUserUsageOut(
                    campaigns_this_month=campaign_counts.get(user.id, 0),
                    campaign_monthly_limit=(None if campaign_limit is None else int(campaign_limit)),
                    team_id=team_id,
                    team_size=team_size,
                    user_seats_limit=(None if seats_limit is None else int(seats_limit)),
                ),
            )
        )

    return AdminUserUsageListResponse(page=page, page_size=page_size, total=total, items=items)


@router.get("/users/{user_id}")
def get_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> AdminUserDetailResponse:
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user:
        raise ApiException(status_code=404, code="not_found", message="User not found")

    row = (
        db.execute(
            select(UserSubscription, PricingPlan)
            .outerjoin(PricingPlan, PricingPlan.id == UserSubscription.pricing_plan_id)
            .where(UserSubscription.user_id == user_id)
        )
        .all()
    )
    sub: UserSubscription | None = None
    plan: PricingPlan | None = None
    if row:
        sub, plan = row[0]
    return AdminUserDetailResponse(
        user=AdminUserOut(id=user.id, username=user.username, role=user.role, created_at=user.created_at),
        subscription=(
            None
            if not sub
            else _sub_to_out(sub=sub, plan=plan)
        ),
    )


@router.patch("/users/{user_id}/subscription")
def update_user_subscription(
    user_id: uuid.UUID,
    body: AdminUserSubscriptionUpdateRequest,
    db: Session = Depends(get_db),
) -> AdminUserDetailResponse:
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user:
        raise ApiException(status_code=404, code="not_found", message="User not found")

    sub = db.execute(select(UserSubscription).where(UserSubscription.user_id == user_id)).scalar_one_or_none()
    if not sub:
        free_plan = db.execute(select(PricingPlan).where(PricingPlan.key == "free")).scalar_one_or_none()
        sub = UserSubscription(user_id=user_id, plan_key="free", status="active", pricing_plan_id=(None if not free_plan else free_plan.id))
        db.add(sub)
        db.flush()

    if body.pricing_plan_id is not None:
        plan = db.execute(select(PricingPlan).where(PricingPlan.id == body.pricing_plan_id)).scalar_one_or_none()
        if not plan:
            raise ApiException(status_code=422, code="validation_error", message="Pricing plan not found")
        sub.pricing_plan_id = plan.id
        sub.plan_key = plan.key
    elif body.plan_key is not None:
        key = body.plan_key.strip()
        plan = db.execute(select(PricingPlan).where(PricingPlan.key == key)).scalar_one_or_none()
        if not plan:
            raise ApiException(status_code=422, code="validation_error", message="Pricing plan not found")
        sub.pricing_plan_id = plan.id
        sub.plan_key = plan.key
    if body.status is not None:
        sub.status = body.status
    if body.current_period_end is not None:
        sub.current_period_end = body.current_period_end

    db.commit()
    db.refresh(sub)
    plan = (
        None
        if not sub.pricing_plan_id
        else db.execute(select(PricingPlan).where(PricingPlan.id == sub.pricing_plan_id)).scalar_one_or_none()
    )

    return AdminUserDetailResponse(
        user=AdminUserOut(id=user.id, username=user.username, role=user.role, created_at=user.created_at),
        subscription=_sub_to_out(sub=sub, plan=plan),
    )


@router.get("/pricing-plans")
def list_pricing_plans(
    db: Session = Depends(get_db),
) -> AdminPricingPlanListResponse:
    rows = db.execute(select(PricingPlan).order_by(PricingPlan.created_at.desc())).scalars().all()
    return AdminPricingPlanListResponse(
        items=[
            AdminPricingPlanOut(
                id=p.id,
                key=p.key,
                name=p.name,
                price_amount=int(p.price_amount),
                currency=p.currency,
                interval=p.interval,
                is_active=p.is_active,
                campaign_monthly_limit=p.campaign_monthly_limit,
                user_seats_limit=p.user_seats_limit,
                created_at=p.created_at,
                updated_at=p.updated_at,
            )
            for p in rows
        ]
    )


@router.post("/pricing-plans")
def create_pricing_plan(
    body: AdminPricingPlanCreateRequest,
    db: Session = Depends(get_db),
) -> AdminPricingPlanCreateResponse:
    plan = PricingPlan(
        key=body.key.strip(),
        name=body.name.strip(),
        price_amount=body.price_amount,
        currency=body.currency.strip(),
        interval=body.interval.strip(),
        is_active=body.is_active,
        campaign_monthly_limit=body.campaign_monthly_limit,
        user_seats_limit=body.user_seats_limit,
    )
    db.add(plan)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ApiException(status_code=409, code="conflict", message="Pricing plan key already exists")
    return AdminPricingPlanCreateResponse(id=plan.id)


@router.put("/pricing-plans/{plan_id}")
def update_pricing_plan(
    plan_id: uuid.UUID,
    body: AdminPricingPlanUpdateRequest,
    db: Session = Depends(get_db),
) -> AdminPricingPlanOut:
    plan = db.execute(select(PricingPlan).where(PricingPlan.id == plan_id)).scalar_one_or_none()
    if not plan:
        raise ApiException(status_code=404, code="not_found", message="Pricing plan not found")

    plan.name = body.name.strip()
    plan.price_amount = body.price_amount
    plan.currency = body.currency.strip()
    plan.interval = body.interval.strip()
    plan.is_active = body.is_active
    plan.campaign_monthly_limit = body.campaign_monthly_limit
    plan.user_seats_limit = body.user_seats_limit
    db.commit()
    db.refresh(plan)
    return AdminPricingPlanOut(
        id=plan.id,
        key=plan.key,
        name=plan.name,
        price_amount=int(plan.price_amount),
        currency=plan.currency,
        interval=plan.interval,
        is_active=plan.is_active,
        campaign_monthly_limit=plan.campaign_monthly_limit,
        user_seats_limit=plan.user_seats_limit,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
    )


class AdminTeamOut(BaseModel):
    id: uuid.UUID
    owner_user_id: uuid.UUID
    owner_username: str | None = None
    name: str
    created_at: datetime


class AdminTeamMemberOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    username: str | None
    role: str
    created_at: datetime


class AdminTeamCreateRequest(BaseModel):
    owner_user_id: uuid.UUID | None = None
    owner_username: str | None = None
    name: str


class AdminTeamCreateResponse(BaseModel):
    id: uuid.UUID


class AdminTeamMemberAddRequest(BaseModel):
    user_id: uuid.UUID
    role: str = "member"


class AdminTeamDetailResponse(BaseModel):
    team: AdminTeamOut
    members: list[AdminTeamMemberOut]


class AdminTeamListResponse(BaseModel):
    items: list[AdminTeamOut]


@router.get("/teams")
def list_teams(
    db: Session = Depends(get_db),
) -> AdminTeamListResponse:
    teams = (
        db.execute(select(Team, User).join(User, User.id == Team.owner_user_id).order_by(Team.created_at.desc()))
        .all()
    )
    return AdminTeamListResponse(
        items=[
            AdminTeamOut(
                id=t.id,
                owner_user_id=t.owner_user_id,
                owner_username=u.username,
                name=t.name,
                created_at=t.created_at,
            )
            for t, u in teams
        ]
    )


@router.post("/teams")
def create_team(
    body: AdminTeamCreateRequest,
    db: Session = Depends(get_db),
) -> AdminTeamCreateResponse:
    owner: User | None = None
    if body.owner_user_id:
        owner = db.execute(select(User).where(User.id == body.owner_user_id)).scalar_one_or_none()
    elif body.owner_username:
        owner = db.execute(select(User).where(User.username == body.owner_username.strip())).scalar_one_or_none()

    if not owner:
        raise ApiException(status_code=404, code="not_found", message="User not found")

    team = Team(owner_user_id=owner.id, name=body.name.strip())
    db.add(team)
    db.flush()
    db.add(TeamMember(team_id=team.id, user_id=owner.id, role="owner"))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ApiException(status_code=409, code="conflict", message="Team already exists")
    return AdminTeamCreateResponse(id=team.id)


@router.get("/teams/{team_id}")
def get_team(
    team_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> AdminTeamDetailResponse:
    team = db.execute(select(Team).where(Team.id == team_id)).scalar_one_or_none()
    if not team:
        raise ApiException(status_code=404, code="not_found", message="Team not found")
    owner = db.execute(select(User).where(User.id == team.owner_user_id)).scalar_one_or_none()
    rows = (
        db.execute(
            select(TeamMember, User)
            .join(User, User.id == TeamMember.user_id)
            .where(TeamMember.team_id == team_id)
            .order_by(TeamMember.created_at.asc())
        )
        .all()
    )
    return AdminTeamDetailResponse(
        team=AdminTeamOut(
            id=team.id,
            owner_user_id=team.owner_user_id,
            owner_username=(None if not owner else owner.username),
            name=team.name,
            created_at=team.created_at,
        ),
        members=[
            AdminTeamMemberOut(id=m.id, user_id=m.user_id, username=u.username, role=m.role, created_at=m.created_at) for m, u in rows
        ],
    )


@router.post("/teams/{team_id}/members")
def add_team_member(
    team_id: uuid.UUID,
    body: AdminTeamMemberAddRequest,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    team = db.execute(select(Team).where(Team.id == team_id)).scalar_one_or_none()
    if not team:
        raise ApiException(status_code=404, code="not_found", message="Team not found")
    user = db.execute(select(User).where(User.id == body.user_id)).scalar_one_or_none()
    if not user:
        raise ApiException(status_code=404, code="not_found", message="User not found")

    sub = get_or_create_subscription(db, user_id=team.owner_user_id)
    if sub.status != "active":
        raise ApiException(status_code=403, code="subscription_inactive", message="Subscription inactive")
    plan = get_pricing_plan_for_subscription(db, sub=sub)
    if not plan:
        raise ApiException(status_code=403, code="plan_not_found", message="Pricing plan not found")
    if not plan.is_active:
        raise ApiException(status_code=403, code="plan_inactive", message="Pricing plan inactive")
    if plan.user_seats_limit is not None:
        current = int(db.execute(select(func.count()).select_from(TeamMember).where(TeamMember.team_id == team_id)).scalar_one())
        if current + 1 > int(plan.user_seats_limit):
            raise ApiException(status_code=403, code="seats_limit_reached", message="User seats limit reached")

    db.add(TeamMember(team_id=team_id, user_id=body.user_id, role=body.role.strip() or "member"))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ApiException(status_code=409, code="conflict", message="User already in a team")
    return {"status": "ok"}


@router.delete("/teams/{team_id}/members/{user_id}", status_code=204, response_class=Response)
def remove_team_member(
    team_id: uuid.UUID,
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> Response:
    m = (
        db.execute(select(TeamMember).where(TeamMember.team_id == team_id, TeamMember.user_id == user_id)).scalar_one_or_none()
    )
    if not m:
        raise ApiException(status_code=404, code="not_found", message="Member not found")
    db.delete(m)
    db.commit()
    return Response(status_code=204)


class AdminDashboardPlanItem(BaseModel):
    key: str
    name: str
    user_count: int


class AdminDashboardResponse(BaseModel):
    total_users: int
    users_by_plan: list[AdminDashboardPlanItem]


@router.get("/dashboard")
def get_dashboard(
    db: Session = Depends(get_db),
) -> AdminDashboardResponse:
    total_users = int(db.execute(select(func.count()).select_from(User)).scalar_one())
    key_expr = func.coalesce(PricingPlan.key, UserSubscription.plan_key)
    name_expr = func.coalesce(PricingPlan.name, UserSubscription.plan_key)
    rows = (
        db.execute(
            select(
                key_expr.label("key"),
                name_expr.label("name"),
                func.count().label("user_count"),
            )
            .select_from(UserSubscription)
            .outerjoin(PricingPlan, PricingPlan.id == UserSubscription.pricing_plan_id)
            .group_by(key_expr, name_expr)
            .order_by(func.count().desc())
        )
        .all()
    )
    return AdminDashboardResponse(
        total_users=total_users,
        users_by_plan=[AdminDashboardPlanItem(key=r.key, name=r.name, user_count=int(r.user_count)) for r in rows],
    )


class AdminBillingRunResponse(BaseModel):
    status: str
    started_at: datetime
    finished_at: datetime | None
    upgraded: int
    downgraded: int
    error_message: str | None = None


@router.post("/billing/run")
def run_billing_now(
    db: Session = Depends(get_db),
) -> AdminBillingRunResponse:
    res = run_with_tracking(db)
    return AdminBillingRunResponse(
        status=str(res["status"]),
        started_at=res["started_at"],
        finished_at=res["finished_at"],
        upgraded=int(res["upgraded"]),
        downgraded=int(res["downgraded"]),
        error_message=None,
    )


@router.get("/billing/last-run")
def get_billing_last_run(
    db: Session = Depends(get_db),
) -> AdminBillingRunResponse | None:
    from ..db.models import JobRun

    last = (
        db.execute(select(JobRun).where(JobRun.job_key == "billing").order_by(JobRun.started_at.desc()).limit(1)).scalars().first()
    )
    if not last:
        return None
    return AdminBillingRunResponse(
        status=last.status,
        started_at=last.started_at,
        finished_at=last.finished_at,
        upgraded=int(last.upgraded),
        downgraded=int(last.downgraded),
        error_message=last.error_message,
    )


@router.delete("/pricing-plans/{plan_id}", status_code=204, response_class=Response)
def delete_pricing_plan(
    plan_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> Response:
    plan = db.execute(select(PricingPlan).where(PricingPlan.id == plan_id)).scalar_one_or_none()
    if not plan:
        raise ApiException(status_code=404, code="not_found", message="Pricing plan not found")
    db.delete(plan)
    db.commit()
    return Response(status_code=204)
