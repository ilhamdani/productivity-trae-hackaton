from __future__ import annotations

import csv
import io
from typing import Any

from fastapi import APIRouter, Depends, File, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..auth import AuthContext, require_api_key
from ..db.engine import get_db
from ..db.models import Inventory, Product
from ..errors import ApiException

router = APIRouter(prefix="/marketplace")


def _normalize_col(name: str) -> str:
    return "_".join(name.strip().lower().replace("-", " ").split())


def _pick(row: dict[str, str], *, keys: list[str]) -> str | None:
    for k in keys:
        v = row.get(k)
        if v is None:
            continue
        v = v.strip()
        if v != "":
            return v
    return None


def _parse_float(raw: str, *, field: str, row_index: int) -> float:
    try:
        value = float(raw)
    except Exception:
        raise ApiException(status_code=422, code="invalid_csv", message="Invalid CSV", details={"row": row_index, "field": field})
    if value < 0:
        raise ApiException(status_code=422, code="invalid_csv", message="Invalid CSV", details={"row": row_index, "field": field})
    return value


def _parse_int(raw: str, *, field: str, row_index: int) -> int:
    try:
        value = int(float(raw))
    except Exception:
        raise ApiException(status_code=422, code="invalid_csv", message="Invalid CSV", details={"row": row_index, "field": field})
    if value < 0:
        raise ApiException(status_code=422, code="invalid_csv", message="Invalid CSV", details={"row": row_index, "field": field})
    return value


class CsvRowPreview(BaseModel):
    row: int
    data: dict[str, Any]


class CsvPreviewResponse(BaseModel):
    required_columns: list[str]
    detected_columns: list[str]
    missing_required_columns: list[str]
    preview_rows: list[CsvRowPreview]
    total_rows: int
    unique_skus: int
    inventory_rows: int


class CsvCommitResponse(BaseModel):
    products_created: int
    products_updated: int
    inventory_upserted: int


EXPECTED_COLS = {
    "sku": ["sku", "product_sku"],
    "name": ["name", "product_name", "nama"],
    "category": ["category", "kategori"],
    "base_description": ["base_description", "description", "deskripsi"],
    "price_amount": ["price_amount", "price", "harga", "amount", "base_price_amount"],
    "price_currency": ["price_currency", "currency", "mata_uang"],
    "location_code": ["location_code", "location", "warehouse", "gudang"],
    "qty_on_hand": ["qty_on_hand", "stock", "stok", "qty", "quantity"],
    "qty_reserved": ["qty_reserved", "reserved", "stok_reserved"],
}

REQUIRED = ["sku", "name", "category", "price_amount"]


def _read_csv_bytes(file: UploadFile) -> bytes:
    content = file.file.read()
    if not content:
        raise ApiException(status_code=422, code="invalid_csv", message="CSV is empty")
    if len(content) > 2_000_000:
        raise ApiException(status_code=413, code="payload_too_large", message="CSV is too large")
    return content


def _open_reader(content: bytes) -> csv.DictReader:
    text = content.decode("utf-8-sig", errors="replace")
    sample = text[:4096]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t")
    except Exception:
        dialect = csv.get_dialect("excel")
    buf = io.StringIO(text)
    return csv.DictReader(buf, dialect=dialect)


def _normalize_row(raw: dict[str, Any]) -> dict[str, str]:
    out: dict[str, str] = {}
    for k, v in raw.items():
        if k is None:
            continue
        out[_normalize_col(str(k))] = "" if v is None else str(v)
    return out


def _preview_from_reader(reader: csv.DictReader) -> CsvPreviewResponse:
    detected = [_normalize_col(c) for c in (reader.fieldnames or []) if c]
    missing = [c for c in REQUIRED if not any(col in detected for col in EXPECTED_COLS[c])]

    preview_rows: list[CsvRowPreview] = []
    total_rows = 0
    sku_set: set[str] = set()
    inventory_rows = 0

    for idx, raw in enumerate(reader, start=2):
        total_rows += 1
        row = _normalize_row(raw)
        sku = _pick(row, keys=EXPECTED_COLS["sku"])
        if sku:
            sku_set.add(sku)
        inv_any = _pick(row, keys=EXPECTED_COLS["location_code"]) or _pick(row, keys=EXPECTED_COLS["qty_on_hand"]) or _pick(row, keys=EXPECTED_COLS["qty_reserved"])
        if inv_any:
            inventory_rows += 1

        if len(preview_rows) < 20:
            preview_rows.append(CsvRowPreview(row=idx, data=row))

    return CsvPreviewResponse(
        required_columns=REQUIRED,
        detected_columns=detected,
        missing_required_columns=missing,
        preview_rows=preview_rows,
        total_rows=total_rows,
        unique_skus=len(sku_set),
        inventory_rows=inventory_rows,
    )


def _parse_for_commit(reader: csv.DictReader) -> tuple[dict[str, dict[str, Any]], list[dict[str, Any]]]:
    detected = [_normalize_col(c) for c in (reader.fieldnames or []) if c]
    missing = [c for c in REQUIRED if not any(col in detected for col in EXPECTED_COLS[c])]
    if missing:
        raise ApiException(status_code=422, code="invalid_csv", message="Missing required columns", details={"missing": missing})

    products_by_sku: dict[str, dict[str, Any]] = {}
    inv_rows: list[dict[str, Any]] = []

    for idx, raw in enumerate(reader, start=2):
        row = _normalize_row(raw)
        sku = _pick(row, keys=EXPECTED_COLS["sku"])
        name = _pick(row, keys=EXPECTED_COLS["name"])
        category = _pick(row, keys=EXPECTED_COLS["category"])
        price_amount_raw = _pick(row, keys=EXPECTED_COLS["price_amount"])
        if not sku or not name or not category or not price_amount_raw:
            raise ApiException(status_code=422, code="invalid_csv", message="Invalid CSV", details={"row": idx})

        base_description = _pick(row, keys=EXPECTED_COLS["base_description"]) or "Imported from marketplace"
        currency = (_pick(row, keys=EXPECTED_COLS["price_currency"]) or "IDR").upper()
        if currency != "IDR":
            raise ApiException(status_code=422, code="invalid_csv", message="Only IDR currency is supported", details={"row": idx, "field": "price_currency"})

        price_amount = _parse_float(price_amount_raw, field="price_amount", row_index=idx)

        existing = products_by_sku.get(sku)
        if existing:
            if existing["name"] != name or existing["category"] != category or existing["base_price_amount"] != price_amount:
                raise ApiException(
                    status_code=422,
                    code="invalid_csv",
                    message="Conflicting product rows for same SKU",
                    details={"row": idx, "sku": sku},
                )
        else:
            products_by_sku[sku] = {
                "sku": sku,
                "name": name,
                "category": category,
                "base_description": base_description,
                "base_price_amount": price_amount,
                "price_currency": currency,
            }

        location_code = _pick(row, keys=EXPECTED_COLS["location_code"])
        qty_on_hand_raw = _pick(row, keys=EXPECTED_COLS["qty_on_hand"])
        qty_reserved_raw = _pick(row, keys=EXPECTED_COLS["qty_reserved"])
        has_inv = location_code is not None or qty_on_hand_raw is not None or qty_reserved_raw is not None

        if has_inv:
            loc = (location_code or "DEFAULT").strip()
            qty_on_hand = _parse_int(qty_on_hand_raw or "0", field="qty_on_hand", row_index=idx)
            qty_reserved = _parse_int(qty_reserved_raw or "0", field="qty_reserved", row_index=idx)
            inv_rows.append({"sku": sku, "location_code": loc, "qty_on_hand": qty_on_hand, "qty_reserved": qty_reserved})

    if not products_by_sku:
        raise ApiException(status_code=422, code="invalid_csv", message="No rows found")

    return products_by_sku, inv_rows


@router.post("/import/preview")
def preview_import(
    file: UploadFile = File(...),
    ctx: AuthContext = Depends(require_api_key),
    db: Session = Depends(get_db),
) -> CsvPreviewResponse:
    _ = (ctx, db)
    content = _read_csv_bytes(file)
    reader = _open_reader(content)
    return _preview_from_reader(reader)


@router.post("/import/commit")
def commit_import(
    file: UploadFile = File(...),
    ctx: AuthContext = Depends(require_api_key),
    db: Session = Depends(get_db),
) -> CsvCommitResponse:
    content = _read_csv_bytes(file)
    reader = _open_reader(content)
    products_by_sku, inv_rows = _parse_for_commit(reader)

    skus = list(products_by_sku.keys())
    existing_products = db.execute(select(Product).where(Product.user_id == ctx.user_id, Product.sku.in_(skus))).scalars().all()
    existing_by_sku = {p.sku: p for p in existing_products}

    products_created = 0
    products_updated = 0
    inv_upserted = 0

    for sku, data in products_by_sku.items():
        p = existing_by_sku.get(sku)
        if p:
            p.name = data["name"]
            p.category = data["category"]
            p.base_description = data["base_description"]
            p.base_price_amount = data["base_price_amount"]
            p.price_currency = data["price_currency"]
            products_updated += 1
        else:
            p = Product(
                user_id=ctx.user_id,
                sku=data["sku"],
                name=data["name"],
                base_description=data["base_description"],
                category=data["category"],
                base_price_amount=data["base_price_amount"],
                price_currency=data["price_currency"],
            )
            db.add(p)
            db.flush()
            existing_by_sku[sku] = p
            products_created += 1

    for inv in inv_rows:
        p = existing_by_sku.get(inv["sku"])
        if not p:
            continue
        row = db.execute(select(Inventory).where(Inventory.product_id == p.id, Inventory.location_code == inv["location_code"])).scalar_one_or_none()
        if row:
            row.qty_on_hand = inv["qty_on_hand"]
            row.qty_reserved = inv["qty_reserved"]
        else:
            db.add(
                Inventory(
                    product_id=p.id,
                    location_code=inv["location_code"],
                    qty_on_hand=inv["qty_on_hand"],
                    qty_reserved=inv["qty_reserved"],
                )
            )
        inv_upserted += 1

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ApiException(status_code=409, code="conflict", message="Import conflict")

    return CsvCommitResponse(products_created=products_created, products_updated=products_updated, inventory_upserted=inv_upserted)
