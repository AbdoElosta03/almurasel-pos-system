from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.errors import register_exception_handlers
from app.db.session import SessionLocal
from app.routers import audit, auth, categories, products, reports, sales, shifts, users
from app.services.seed import seed_catalog
from app.services.users import seed_admin


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if settings.seed_on_startup:
        db = SessionLocal()
        try:
            seed_admin(db)
            seed_catalog(db)
        finally:
            db.close()
    yield


app = FastAPI(title="Almurasel POS", lifespan=lifespan)
register_exception_handlers(app)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
api = APIRouter(prefix="/api")
api.include_router(auth.router)
api.include_router(users.router)
api.include_router(categories.router)
api.include_router(products.router)
api.include_router(shifts.router)
api.include_router(sales.router)
api.include_router(reports.router)
api.include_router(audit.router)
app.include_router(api)
