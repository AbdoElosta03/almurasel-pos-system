"""One-shot Windows USB receipt printing. Never retry or purge another job."""

import logging
import os
import sys
import threading
import time
from datetime import timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import api_error
from app.models.audit_log import AuditLog
from app.models.sale import Sale
from app.models.user import User
from app.utils.time import as_utc, utc_now

logger = logging.getLogger(__name__)
_print_lock = threading.Lock()
DOCUMENT_PREFIX = "Almurasel receipt "
# Winspool status bit masks. Status 0 means only "no reported fault", not proof of paper.
PRINTER_FAULTS = 0x1 | 0x2 | 0x8 | 0x10 | 0x20 | 0x40 | 0x80 | 0x800 | 0x1000 | 0x100000 | 0x400000
JOB_FAULTS = 0x1 | 0x2 | 0x20 | 0x40 | 0x200 | 0x400


class PrinterError(Exception):
    def __init__(self, code: str):
        self.code = code
        super().__init__(code)


class WindowsPrinter:
    def __init__(self):
        if sys.platform != "win32":
            raise PrinterError("printer_windows_required")
        try:
            import win32print
        except ImportError as exc:
            raise PrinterError("printer_dependencies_missing") from exc
        self.api = win32print
        self.handle = None

    def open(self):
        printers = self.api.EnumPrinters(self.api.PRINTER_ENUM_LOCAL | self.api.PRINTER_ENUM_CONNECTIONS, None, 2)
        name = next((p["pPrinterName"] for p in printers
                     if p["pPrinterName"].casefold() == settings.receipt_printer_name.casefold()), None)
        if name is None:
            raise PrinterError("printer_not_found")
        self.handle = self.api.OpenPrinter(name)

    def close(self):
        if self.handle is not None:
            self.api.ClosePrinter(self.handle)
            self.handle = None

    def ensure_ready(self):
        info = self.api.GetPrinter(self.handle, 2)
        if info["Status"] & PRINTER_FAULTS:
            raise PrinterError("printer_not_ready")
        if self.api.EnumJobs(self.handle, 0, 1, 1):
            raise PrinterError("printer_queue_busy")

    def start(self, sale_id: int):
        return self.api.StartDocPrinter(self.handle, 1, (f"{DOCUMENT_PREFIX}{sale_id}", None, "RAW"))

    def write(self, data: bytes):
        self.api.StartPagePrinter(self.handle)
        written = self.api.WritePrinter(self.handle, data)
        if written != len(data):
            raise PrinterError("printer_failed")
        self.api.EndPagePrinter(self.handle)
        self.api.EndDocPrinter(self.handle)

    def job(self, job_id: int):
        # Enumerating avoids mistaking a permissions/driver error for job completion.
        return next((job for job in self.api.EnumJobs(self.handle, 0, 999, 1)
                     if job["JobId"] == job_id), None)

    def reported_fault(self):
        return bool(self.api.GetPrinter(self.handle, 2)["Status"] & PRINTER_FAULTS)

    def cancel(self, job_id: int):
        self.api.SetJob(self.handle, job_id, 0, None, self.api.JOB_CONTROL_DELETE)


def printer_status() -> dict:
    printer = None
    try:
        printer = WindowsPrinter()
        printer.open()
        printer.ensure_ready()
        return {"ready": True, "code": "printer_ready", "name": settings.receipt_printer_name}
    except PrinterError as exc:
        return {"ready": False, "code": exc.code, "name": settings.receipt_printer_name}
    except Exception:
        logger.exception("Unable to inspect receipt printer")
        return {"ready": False, "code": "printer_failed", "name": settings.receipt_printer_name}
    finally:
        if printer is not None:
            try:
                printer.close()
            except Exception:
                logger.exception("Could not close receipt printer status handle")


def render_receipt(sale: Sale, cashier_name: str) -> bytes:
    """Raster ESC/POS preserves Arabic independently of printer code pages."""
    try:
        import arabic_reshaper
        from bidi.algorithm import get_display
        from PIL import Image, ImageDraw, ImageFont
    except ImportError as exc:
        raise PrinterError("printer_dependencies_missing") from exc
    font_path = Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts" / "segoeui.ttf"
    if not font_path.is_file():
        raise PrinterError("printer_font_missing")
    # Bidi/shaping is performed above; BASIC avoids applying it a second time.
    font = ImageFont.truetype(str(font_path), 26, layout_engine=ImageFont.Layout.BASIC)
    width, margin, line_height = 576, 16, 38
    probe = ImageDraw.Draw(Image.new("1", (width, 1), 1))

    def visual(text):
        return get_display(arabic_reshaper.reshape(text))

    date = as_utc(sale.created_at)
    local_date = date.astimezone(ZoneInfo(settings.timezone))
    lines = ["المراسل", f"فاتورة رقم {sale.id}", local_date.strftime("%Y-%m-%d %H:%M"),
             f"الكاشير: {cashier_name}", "نقدي" if sale.payment_method == "cash" else "بطاقة مصرفية", "—" * 18]
    for item in sale.items:
        # Wrap product names instead of clipping them at the paper edge.
        current = ""
        for word in item.product_name.split():
            candidate = f"{current} {word}".strip()
            if current and probe.textlength(visual(candidate), font=font) > width - margin * 2:
                lines.append(current)
                current = word
            else:
                current = candidate
        lines.append(current)
        lines.append(f"{item.qty} × {item.unit_price_lyd:.3f} = {item.line_total_lyd:.3f} د.ل")
    lines.extend(["—" * 18, f"الإجمالي: {sale.total_lyd:.3f} د.ل", "شكراً لزيارتكم"])
    image = Image.new("1", (width, len(lines) * line_height + margin * 2), 1)
    draw = ImageDraw.Draw(image)
    for index, text in enumerate(lines):
        draw.text((width - margin, margin + index * line_height), visual(text), font=font, fill=0, anchor="rt")
    # GS v 0 uses 1=black, whereas Pillow mode 1 uses 1=white.
    from PIL import ImageOps
    raster = ImageOps.invert(image.convert("L")).convert("1").tobytes()
    height = image.height
    row_bytes = width // 8
    data = bytearray(b"\x1b@")
    for y in range(0, height, 128):
        rows = min(128, height - y)
        data.extend(b"\x1dv0\x00" + bytes((row_bytes & 255, row_bytes >> 8, rows & 255, rows >> 8)))
        data.extend(raster[y * row_bytes:(y + rows) * row_bytes])
    data.extend(b"\x1bd\x03\x1dV\x00")
    return bytes(data)


def wait_for_job(printer, job_id: int):
    deadline = time.monotonic() + max(1, settings.receipt_print_timeout_seconds)
    while True:
        job = printer.job(job_id)
        if job is None:
            # The spooler released it; this is not a physical-delivery guarantee.
            return
        if printer.reported_fault() or job["Status"] & JOB_FAULTS:
            raise PrinterError("printer_not_ready")
        if time.monotonic() >= deadline:
            raise PrinterError("printer_timeout")
        time.sleep(0.2)


def print_sale(db: Session, sale: Sale, user: User) -> dict:
    if sale.status != "completed":
        raise api_error(409, "sale_already_cancelled", "Cancelled receipt")
    if utc_now() - sale.created_at.replace(tzinfo=None) > timedelta(minutes=5):
        raise api_error(409, "printer_receipt_expired", "Automatic receipt is too old")
    if not _print_lock.acquire(blocking=False):
        raise api_error(409, "printer_queue_busy", "Printer busy")
    printer = None
    job_id = None
    try:
        attempted = db.scalar(select(AuditLog.id).where(
            AuditLog.action == "receipt.print_attempted", AuditLog.entity_type == "sale", AuditLog.entity_id == sale.id,
        ).limit(1))
        if attempted is not None:
            raise PrinterError("printer_already_attempted")
        printer = WindowsPrinter()
        printer.open()
        printer.ensure_ready()
        data = render_receipt(sale, user.username)
        # Commit BEFORE touching the spooler: retries after a lost HTTP response must not print twice.
        db.add(AuditLog(actor_id=user.id, action="receipt.print_attempted", entity_type="sale", entity_id=sale.id))
        db.commit()
        job_id = printer.start(sale.id)
        printer.write(data)
        wait_for_job(printer, job_id)
        return {"status": "released", "job_id": job_id}
    except Exception as exc:
        if printer is not None and job_id is not None:
            try:
                # Only this request's job, never unrelated receipts or other applications.
                printer.cancel(job_id)
            except Exception:
                logger.exception("Could not cancel receipt job %s; operator must inspect Windows queue", job_id)
                raise api_error(503, "printer_cancel_failed", "Inspect Windows print queue") from exc
        if isinstance(exc, PrinterError):
            raise api_error(503, exc.code, exc.code) from exc
        logger.exception("Native receipt printing failed")
        raise api_error(503, "printer_failed", "Native receipt printing failed") from exc
    finally:
        try:
            if printer is not None:
                try:
                    printer.close()
                except Exception:
                    logger.exception("Could not close receipt printer handle")
        finally:
            _print_lock.release()
