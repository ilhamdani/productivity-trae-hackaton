from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..auth import AuthContext, require_api_key
from ..db.engine import get_db
from ..db.models import Inventory, Product
from ..errors import ApiException

router = APIRouter(prefix="/products")


class InventoryItem(BaseModel):
    location_code: str
    qty_on_hand: int
    qty_reserved: int
    updated_at: datetime


class InventoryListResponse(BaseModel):
    items: list[InventoryItem]


class InventoryUpsertRequest(BaseModel):
    qty_on_hand: int = Field(ge=0)
    qty_reserved: int = Field(ge=0)


class InventoryUpsertResponse(BaseModel):
    location_code: str
    qty_on_hand: int
    qty_reserved: int


def _get_owned_product(db: Session, *, user_id: uuid.UUID, product_id: uuid.UUID) -> Product:
    product = db.execute(select(Product).where(Product.id == product_id, Product.user_id == user_id)).scalar_one_or_none()
    if not product:
        raise ApiException(status_code=404, code="not_found", message="Product not found")
    return product


@router.get("/{product_id}/inventory")
def list_inventory(
    product_id: uuid.UUID,
    ctx: AuthContext = Depends(require_api_key),
    db: Session = Depends(get_db),
) -> InventoryListResponse:
    _get_owned_product(db, user_id=ctx.user_id, product_id=product_id)
    items = db.execute(select(Inventory).where(Inventory.product_id == product_id).order_by(Inventory.location_code.asc())).scalars().all()
    return InventoryListResponse(
        items=[
            InventoryItem(
                location_code=i.location_code,
                qty_on_hand=i.qty_on_hand,
                qty_reserved=i.qty_reserved,
                updated_at=i.updated_at,
            )
            for i in items
        ]
    )


@router.put("/{product_id}/inventory/{location_code}")
def upsert_inventory(
    product_id: uuid.UUID,
    location_code: str,
    body: InventoryUpsertRequest,
    ctx: AuthContext = Depends(require_api_key),
    db: Session = Depends(get_db),
) -> InventoryUpsertResponse:
    _get_owned_product(db, user_id=ctx.user_id, product_id=product_id)

    inv = db.execute(
        select(Inventory).where(Inventory.product_id == product_id, Inventory.location_code == location_code)
    ).scalar_one_or_none()

    if inv:
        inv.qty_on_hand = body.qty_on_hand
        inv.qty_reserved = body.qty_reserved
    else:
        inv = Inventory(
            product_id=product_id,
            location_code=location_code,
            qty_on_hand=body.qty_on_hand,
            qty_reserved=body.qty_reserved,
        )
        db.add(inv)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ApiException(status_code=409, code="conflict", message="Inventory conflict")

    return InventoryUpsertResponse(location_code=inv.location_code, qty_on_hand=inv.qty_on_hand, qty_reserved=inv.qty_reserved)


@router.delete("/{product_id}/inventory/{location_code}", status_code=204, response_class=Response)
def delete_inventory(
    product_id: uuid.UUID,
    location_code: str,
    ctx: AuthContext = Depends(require_api_key),
    db: Session = Depends(get_db),
) -> Response:
    _get_owned_product(db, user_id=ctx.user_id, product_id=product_id)

    inv = db.execute(
        select(Inventory).where(Inventory.product_id == product_id, Inventory.location_code == location_code)
    ).scalar_one_or_none()
    if not inv:
        raise ApiException(status_code=404, code="not_found", message="Inventory not found")

    db.delete(inv)
    db.commit()
    return Response(status_code=204)

