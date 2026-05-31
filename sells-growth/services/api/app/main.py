import asyncio
import base64
import os
import tempfile
import uuid

from fastapi import APIRouter, Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session

from .auth import require_api_key
from .db.engine import SessionLocal
from .db.models import ApiKey, Campaign, CampaignAsset, Inventory, Product, User
from .errors import install_error_handlers
from .routes.assets import router as assets_router
from .routes.auth import router as auth_router
from .routes.campaigns import router as campaigns_router
from .routes.calendar import router as calendar_router
from .routes.health import router as health_router
from .routes.inventory import router as inventory_router
from .routes.marketplace import router as marketplace_router
from .routes.me import router as me_router
from .routes.products import router as products_router
from .routes.workflow import router as workflow_router
from .security import hash_api_key
from .settings import get_settings
from .orchestrator.runner import worker_loop
from .providers.storage import upload_file


def create_app() -> FastAPI:
    app = FastAPI(title="AI Growth Copilot API", version="0.1.0")
    install_error_handlers(app)

    settings = get_settings()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list(),
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )

    app.include_router(health_router)
    app.include_router(auth_router)

    api_v1 = APIRouter(prefix="/api/v1", dependencies=[Depends(require_api_key)])
    api_v1.include_router(me_router)
    api_v1.include_router(products_router)
    api_v1.include_router(inventory_router)
    api_v1.include_router(campaigns_router)
    api_v1.include_router(calendar_router)
    api_v1.include_router(marketplace_router)
    api_v1.include_router(assets_router)
    api_v1.include_router(workflow_router)

    app.include_router(api_v1)

    @app.on_event("startup")
    def seed_demo_data() -> None:
        if not settings.seed_demo:
            return
        if not settings.demo_api_key:
            return

        db: Session = SessionLocal()
        try:
            existing_user = db.execute(select(User).limit(1)).scalar_one_or_none()
            if existing_user:
                user = existing_user
            else:
                user = User(id=uuid.uuid4(), email=None)
                db.add(user)
                db.flush()

            key_hash = hash_api_key(api_key=settings.demo_api_key, salt=settings.api_key_salt)
            existing_key = db.execute(select(ApiKey).where(ApiKey.key_hash == key_hash)).scalar_one_or_none()
            if not existing_key:
                db.add(ApiKey(user_id=user.id, key_hash=key_hash))

            target_product_count = 50
            locations = [
                ("WH-JKT", 120),
                ("WH-SBY", 60),
            ]

            demo_products = db.execute(
                select(Product).where(Product.user_id == user.id, Product.sku.like("DEMO-%")).order_by(Product.sku.asc())
            ).scalars().all()
            existing_by_sku = {p.sku: p for p in demo_products}

            categories = ["makanan", "minuman", "fashion", "skincare", "home"]
            for i in range(1, target_product_count + 1):
                sku = f"DEMO-{i:04d}"
                p = existing_by_sku.get(sku)
                if not p:
                    category = categories[(i - 1) % len(categories)]
                    price = 15000 + ((i - 1) % 10) * 5000
                    p = Product(
                        user_id=user.id,
                        sku=sku,
                        name=f"Produk Demo {i}",
                        base_description=f"Produk demo untuk testing flow kampanye (SKU {sku}).",
                        category=category,
                        base_price_amount=float(price),
                        price_currency="IDR",
                    )
                    db.add(p)
                    db.flush()
                    existing_by_sku[sku] = p

                existing_inv = db.execute(select(Inventory).where(Inventory.product_id == p.id)).scalars().all()
                inv_by_loc = {inv.location_code: inv for inv in existing_inv}
                for loc, qty in locations:
                    if loc in inv_by_loc:
                        continue
                    db.add(Inventory(product_id=p.id, location_code=loc, qty_on_hand=qty, qty_reserved=0))

            demo_campaign_target = 10
            demo_campaigns = db.execute(
                select(Campaign).where(Campaign.user_id == user.id, Campaign.status == "draft", Campaign.product_name.like("Demo Campaign%"))
            ).scalars().all()
            demo_campaign_product_ids = {c.product_id for c in demo_campaigns if c.product_id}

            products_for_campaign = list(existing_by_sku.values())
            products_for_campaign.sort(key=lambda x: x.sku)
            need_to_make = max(0, demo_campaign_target - len(demo_campaigns))
            made = 0
            for p in products_for_campaign:
                if made >= need_to_make:
                    break
                if p.id in demo_campaign_product_ids:
                    continue
                db.add(
                    Campaign(
                        user_id=user.id,
                        product_id=p.id,
                        product_snapshot_id=None,
                        product_name=f"Demo Campaign {p.sku}",
                        product_description=p.base_description,
                        price_amount=p.base_price_amount,
                        price_currency=p.price_currency,
                        category=p.category,
                        brand_tone="friendly",
                        target_location="Indonesia",
                        primary_goal="Awareness",
                        status="draft",
                        approval_status="none",
                    )
                )
                made += 1

            seed_png = base64.b64decode(
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO4B9p8AAAAASUVORK5CYII="
            )
            all_demo_campaigns = db.execute(
                select(Campaign).where(
                    Campaign.user_id == user.id,
                    Campaign.status == "draft",
                    Campaign.product_name.like("Demo Campaign%"),
                )
            ).scalars().all()

            for c in all_demo_campaigns:
                existing_assets = db.execute(
                    select(CampaignAsset).where(
                        CampaignAsset.campaign_id == c.id,
                        CampaignAsset.asset_type == "product_image",
                    )
                ).scalars().all()
                if existing_assets:
                    continue

                object_name = f"campaigns/{c.id}/product-images/seed/cover.png"
                tmp_path = None
                try:
                    fd, tmp_path = tempfile.mkstemp(suffix=".png")
                    with os.fdopen(fd, "wb") as f:
                        f.write(seed_png)
                    upload_file(object_name=object_name, file_path=tmp_path, content_type="image/png", settings=settings)
                finally:
                    if tmp_path and os.path.exists(tmp_path):
                        os.unlink(tmp_path)

                base = settings.public_s3_base_url.rstrip("/")
                public_url = f"{base}/{settings.s3_bucket}/{object_name}"
                db.add(
                    CampaignAsset(
                        campaign_id=c.id,
                        asset_type="product_image",
                        storage_provider="minio",
                        storage_path=object_name,
                        public_url=public_url,
                        asset_meta={"filename": "cover.png", "content_type": "image/png", "status": "ready", "seed": True},
                    )
                )

            db.commit()
        finally:
            db.close()

    @app.on_event("startup")
    async def start_worker() -> None:
        settings = get_settings()
        poll_interval_sec = max(0.5, settings.progress_poll_ms / 1000.0)
        app.state.worker_task = asyncio.create_task(worker_loop(poll_interval_sec=poll_interval_sec))

    return app


app = create_app()
