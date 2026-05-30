from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..auth import AuthContext, require_api_key
from ..db.engine import get_db
from ..db.models import Product
from ..errors import ApiException

router = APIRouter(prefix="/products")


class Money(BaseModel):
    currency: str = Field(default="IDR", pattern="^IDR$")
    amount: float = Field(ge=0)


class ProductCreateRequest(BaseModel):
    sku: str = Field(min_length=1)
    name: str = Field(min_length=1)
    base_description: str = Field(min_length=1)
    category: str = Field(min_length=1)
    base_price: Money


class ProductCreateResponse(BaseModel):
    id: uuid.UUID


class ProductUpdateRequest(BaseModel):
    sku: str = Field(min_length=1)
    name: str = Field(min_length=1)
    base_description: str = Field(min_length=1)
    category: str = Field(min_length=1)
    base_price: Money


class ProductListItem(BaseModel):
    id: uuid.UUID
    sku: str
    name: str
    category: str


class ProductListResponse(BaseModel):
    items: list[ProductListItem]


class ProductDetailResponse(BaseModel):
    id: uuid.UUID
    sku: str
    name: str
    base_description: str
    category: str
    base_price: Money


@router.get("")
def list_products(
    ctx: AuthContext = Depends(require_api_key),
    db: Session = Depends(get_db),
) -> ProductListResponse:
    rows = db.execute(select(Product).where(Product.user_id == ctx.user_id).order_by(Product.created_at.desc())).scalars().all()
    return ProductListResponse(
        items=[
            ProductListItem(id=row.id, sku=row.sku, name=row.name, category=row.category)
            for row in rows
        ]
    )


@router.post("")
def create_product(
    body: ProductCreateRequest,
    ctx: AuthContext = Depends(require_api_key),
    db: Session = Depends(get_db),
) -> ProductCreateResponse:
    product = Product(
        user_id=ctx.user_id,
        sku=body.sku,
        name=body.name,
        base_description=body.base_description,
        category=body.category,
        base_price_amount=body.base_price.amount,
        price_currency=body.base_price.currency,
    )

    db.add(product)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ApiException(status_code=409, code="conflict", message="SKU already exists")

    return ProductCreateResponse(id=product.id)


@router.get("/{product_id}")
def get_product(
    product_id: uuid.UUID,
    ctx: AuthContext = Depends(require_api_key),
    db: Session = Depends(get_db),
) -> ProductDetailResponse:
    product = db.execute(select(Product).where(Product.id == product_id, Product.user_id == ctx.user_id)).scalar_one_or_none()
    if not product:
        raise ApiException(status_code=404, code="not_found", message="Product not found")

    return ProductDetailResponse(
        id=product.id,
        sku=product.sku,
        name=product.name,
        base_description=product.base_description,
        category=product.category,
        base_price=Money(currency=product.price_currency, amount=float(product.base_price_amount)),
    )


@router.put("/{product_id}")
def update_product(
    product_id: uuid.UUID,
    body: ProductUpdateRequest,
    ctx: AuthContext = Depends(require_api_key),
    db: Session = Depends(get_db),
) -> ProductDetailResponse:
    product = db.execute(select(Product).where(Product.id == product_id, Product.user_id == ctx.user_id)).scalar_one_or_none()
    if not product:
        raise ApiException(status_code=404, code="not_found", message="Product not found")

    product.sku = body.sku
    product.name = body.name
    product.base_description = body.base_description
    product.category = body.category
    product.base_price_amount = body.base_price.amount
    product.price_currency = body.base_price.currency

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ApiException(status_code=409, code="conflict", message="SKU already exists")

    return ProductDetailResponse(
        id=product.id,
        sku=product.sku,
        name=product.name,
        base_description=product.base_description,
        category=product.category,
        base_price=Money(currency=product.price_currency, amount=float(product.base_price_amount)),
    )


@router.delete("/{product_id}", status_code=204, response_class=Response)
def delete_product(
    product_id: uuid.UUID,
    ctx: AuthContext = Depends(require_api_key),
    db: Session = Depends(get_db),
) -> Response:
    product = db.execute(select(Product).where(Product.id == product_id, Product.user_id == ctx.user_id)).scalar_one_or_none()
    if not product:
        raise ApiException(status_code=404, code="not_found", message="Product not found")

    db.delete(product)
    db.commit()
    return Response(status_code=204)

