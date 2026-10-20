import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.errors import register_exception_handlers
from app.db.session import SessionLocal, engine
from app.routers import audit, auth, backups, categories, products, purchases, reports, sales, shifts, users
from app.services.backups import create_auto_if_due
from app.services.seed import seed_catalog
from app.services.users import seed_admin


logger = logging.getLogger(__name__)


class DatabaseGate:
    def __init__(self):
        self.condition = asyncio.Condition()
        self.active = 0
        self.restoring = False
        self.waiting = 0

    @asynccontextmanager
    async def access(self, exclusive: bool = False):
        async with self.condition:
            if exclusive:
                self.waiting += 1
                try:
                    await self.condition.wait_for(lambda: self.active == 0 and not self.restoring)
                    self.restoring = True
                finally:
                    self.waiting -= 1
            else:
                await self.condition.wait_for(lambda: not self.restoring and self.waiting == 0)
                self.active += 1
        try:
            yield
        finally:
            async with self.condition:
                if exclusive:
                    self.restoring = False
                else:
                    self.active -= 1
                self.condition.notify_all()


database_gate = DatabaseGate()


async def periodic_backups():
    while True:
        try:
            async with database_gate.access():
                await asyncio.to_thread(create_auto_if_due, engine)
        except (OSError, ValueError, RuntimeError):
            logger.exception("Automatic backup failed; will retry in one hour")
        await asyncio.sleep(60 * 60)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if settings.seed_on_startup:
        db = SessionLocal()
        try:
            seed_admin(db)
            seed_catalog(db)
        finally:
            db.close()
    task = asyncio.create_task(periodic_backups()) if settings.backup_auto_enabled else None
    try:
        yield
    finally:
        if task is not None:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass


app = FastAPI(title="Almurasel POS", lifespan=lifespan)


@app.middleware("http")
async def guard_restore(request: Request, call_next):
    if not request.url.path.startswith("/api/"):
        return await call_next(request)
    restore = request.method == "POST" and (
        request.url.path == "/api/backups/restore-upload" or
        (request.url.path.startswith("/api/backups/") and request.url.path.endswith("/restore"))
    )
    async with database_gate.access(exclusive=restore):
        return await call_next(request)


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
api.include_router(purchases.router)
api.include_router(reports.router)
api.include_router(audit.router)
api.include_router(backups.router)
app.include_router(api)
