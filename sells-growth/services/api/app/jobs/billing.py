from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db.engine import SessionLocal
from ..db.models import JobRun, PricingPlan, UserSubscription


def run(db: Session) -> dict[str, int]:
    now = datetime.now(timezone.utc)
    free_plan = db.execute(select(PricingPlan).where(PricingPlan.key == "free")).scalar_one_or_none()
    free_plan_id = None if not free_plan else free_plan.id

    upgraded = 0
    downgraded = 0

    subs = db.execute(select(UserSubscription)).scalars().all()
    for sub in subs:
        plan = None
        if sub.pricing_plan_id:
            plan = db.execute(select(PricingPlan).where(PricingPlan.id == sub.pricing_plan_id)).scalar_one_or_none()
        if not plan:
            plan = db.execute(select(PricingPlan).where(PricingPlan.key == sub.plan_key)).scalar_one_or_none()

        if plan and not plan.is_active and sub.plan_key != "free":
            sub.plan_key = "free"
            sub.pricing_plan_id = free_plan_id
            sub.status = "active"
            sub.current_period_end = None
            downgraded += 1
            continue

        if sub.status == "canceled" and sub.current_period_end and sub.current_period_end < now:
            sub.plan_key = "free"
            sub.pricing_plan_id = free_plan_id
            sub.status = "active"
            sub.current_period_end = None
            downgraded += 1

    db.commit()
    return {"upgraded": upgraded, "downgraded": downgraded}


def run_with_tracking(db: Session) -> dict[str, object]:
    job_run = JobRun(job_key="billing", status="running")
    db.add(job_run)
    db.commit()
    db.refresh(job_run)

    try:
        counts = run(db)
        job_run.status = "success"
        job_run.upgraded = int(counts["upgraded"])
        job_run.downgraded = int(counts["downgraded"])
        job_run.finished_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(job_run)
        return {
            "job_run_id": str(job_run.id),
            "status": job_run.status,
            "started_at": job_run.started_at,
            "finished_at": job_run.finished_at,
            "upgraded": job_run.upgraded,
            "downgraded": job_run.downgraded,
        }
    except Exception as e:
        job_run.status = "failed"
        job_run.error_message = str(e)
        job_run.finished_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(job_run)
        raise


def main() -> None:
    db = SessionLocal()
    try:
        res = run_with_tracking(db)
        print(res)
    finally:
        db.close()


if __name__ == "__main__":
    main()
