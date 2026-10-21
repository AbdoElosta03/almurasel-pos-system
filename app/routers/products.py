from fastapi import APIRouter, Depends, Query, Request, Response, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_admin
from app.core.errors import api_error
from app.db.session import get_db
from app.models.product import Product
from app.models.user import User
from app.schemas.product import ProductCreate, ProductOut, ProductUpdate
from app.services import products as products_service
from app.utils.pagination import Page

router = APIRouter(prefix="/products", tags=["products"])
MAX_IMAGE_BYTES = 2 * 1024 * 1024


def _image_type(data: bytes) -> str | None:
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(body: ProductCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return products_service.create_product(db, body)


@router.get("", response_model=list[ProductOut] | Page[ProductOut])
def list_products(
    category_id: int | None = None,
    page: int | None = Query(default=None, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return products_service.list_products(db, user, category_id, page, page_size)


@router.patch("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    body: ProductUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return products_service.update_product(db, product_id, body)


@router.get("/{product_id}/image")
def get_product_image(product_id: int, db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if product is None or product.image_data is None or product.image_content_type is None:
        raise api_error(404, "product_image_not_found", "Product image not found")
    return Response(
        content=product.image_data,
        media_type=product.image_content_type,
        headers={"Cache-Control": "private, no-cache"},
    )


@router.post("/{product_id}/image", response_model=ProductOut)
async def upload_product_image(
    product_id: int,
    request: Request,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    data = bytearray()
    async for chunk in request.stream():
        data.extend(chunk)
        if len(data) > MAX_IMAGE_BYTES:
            raise api_error(413, "product_image_too_large", "Product image exceeds 2 MB")
    if not data:
        raise api_error(400, "product_image_required", "Product image is required")
    content_type = _image_type(data)
    if content_type is None:
        raise api_error(400, "invalid_product_image", "Product image must be PNG, JPEG, or WebP")
    return products_service.set_product_image(db, product_id, bytes(data), content_type)


@router.delete("/{product_id}/image", response_model=ProductOut)
def remove_product_image(product_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return products_service.remove_product_image(db, product_id)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    products_service.delete_product(db, product_id)
