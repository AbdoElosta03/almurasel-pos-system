from fastapi import APIRouter, Request

from app.schemas.license import LicenseActivateIn, LicenseStatusOut
from app.services import license as license_service

router = APIRouter(prefix="/license", tags=["license"])


@router.get("/status", response_model=LicenseStatusOut)
def license_status():
    return license_service.status_payload()


@router.post("/activate", response_model=LicenseStatusOut)
def activate_license(body: LicenseActivateIn, request: Request):
    client = request.client.host if request.client else "local"
    return license_service.activate(body.token, client_key=client)
