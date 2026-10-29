from fastapi import APIRouter, Depends

from app.core.deps import get_current_user
from app.services.receipt_printer import printer_status

router = APIRouter(prefix="/printer", tags=["printer"])


@router.get("/status")
def status(_: object = Depends(get_current_user)):
    return printer_status()
