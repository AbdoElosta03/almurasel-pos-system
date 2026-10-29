from datetime import timedelta
from decimal import Decimal
from pathlib import Path
from types import SimpleNamespace
import os

import pytest
from sqlalchemy import select

from app.models.audit_log import AuditLog
from app.models.sale import Sale
from app.services import receipt_printer as printing
from app.utils.time import utc_now


class FakePrinter:
    def __init__(self):
        self.ready_error = None
        self.cancel_error = None
        self.write_error = None
        self.cancelled = []
        self.started = []
        self.data = None
        self.closed = False

    def open(self):
        pass

    def close(self):
        self.closed = True

    def ensure_ready(self):
        if self.ready_error:
            raise printing.PrinterError(self.ready_error)

    def start(self, sale_id):
        self.started.append(sale_id)
        return 17

    def write(self, data):
        if self.write_error:
            raise RuntimeError('USB failure')
        self.data = data

    def cancel(self, job_id):
        self.cancelled.append(job_id)
        if self.cancel_error:
            raise RuntimeError('Access denied')


@pytest.fixture
def native_setup(client, admin_headers, cashier_headers, product, session_factory, monkeypatch):
    client.post('/api/shifts/open', headers=cashier_headers, json={'opening_cash_lyd': 0})
    response = client.post('/api/sales', headers=cashier_headers, json={
        'payment_method': 'cash', 'items': [{'product_id': product['id'], 'qty': 2}],
    })
    assert response.status_code == 201
    fake = FakePrinter()
    monkeypatch.setattr(printing, 'WindowsPrinter', lambda: fake)
    monkeypatch.setattr(printing, 'render_receipt', lambda sale, name: b'ESC/POS')
    monkeypatch.setattr(printing, 'wait_for_job', lambda printer, job: None)
    return fake, response.json()['id']


def test_print_success_and_duplicate_protection(client, cashier_headers, native_setup, session_factory):
    fake, sale_id = native_setup
    response = client.post(f'/api/sales/{sale_id}/print', headers=cashier_headers)
    assert response.status_code == 200, response.text
    assert response.json() == {'status': 'released', 'job_id': 17}
    assert fake.data == b'ESC/POS'
    assert fake.closed
    again = client.post(f'/api/sales/{sale_id}/print', headers=cashier_headers)
    assert again.status_code == 503
    assert again.json()['code'] == 'printer_already_attempted'
    assert fake.started == [sale_id]
    with session_factory() as db:
        assert db.get(Sale, sale_id).status == 'completed'
        assert len(list(db.scalars(select(AuditLog).where(AuditLog.action == 'receipt.print_attempted')))) == 1


@pytest.mark.parametrize('code', ['printer_not_ready', 'printer_queue_busy', 'printer_not_found'])
def test_unavailable_printer_never_enqueues(client, cashier_headers, native_setup, session_factory, code):
    fake, sale_id = native_setup
    fake.ready_error = code
    response = client.post(f'/api/sales/{sale_id}/print', headers=cashier_headers)
    assert response.status_code == 503
    assert response.json()['code'] == code
    assert not fake.started
    assert not fake.cancelled
    with session_factory() as db:
        assert db.get(Sale, sale_id).status == 'completed'


@pytest.mark.parametrize('cancel_fails', [False, True])
def test_timed_out_job_cancelled_once_no_retry(client, cashier_headers, native_setup, monkeypatch, cancel_fails):
    fake, sale_id = native_setup
    fake.cancel_error = cancel_fails

    def timeout(*args):
        raise printing.PrinterError('printer_timeout')

    monkeypatch.setattr(printing, 'wait_for_job', timeout)
    response = client.post(f'/api/sales/{sale_id}/print', headers=cashier_headers)
    assert response.status_code == 503
    assert response.json()['code'] == ('printer_cancel_failed' if cancel_fails else 'printer_timeout')
    assert fake.cancelled == [17]
    assert fake.closed
    client.post(f'/api/sales/{sale_id}/print', headers=cashier_headers)
    assert fake.started == [sale_id]


def test_partial_write_cancels_only_own_job(client, cashier_headers, native_setup):
    fake, sale_id = native_setup
    fake.write_error = True
    response = client.post(f'/api/sales/{sale_id}/print', headers=cashier_headers)
    assert response.json()['code'] == 'printer_failed'
    assert fake.cancelled == [17]


def test_print_rejects_old_cancelled_and_other_cashiers(client, admin_headers, cashier_headers, native_setup, session_factory):
    fake, sale_id = native_setup
    assert client.post(f'/api/sales/{sale_id}/print').status_code == 401
    assert client.post(f'/api/sales/{sale_id}/print', headers=admin_headers).status_code == 403
    with session_factory() as db:
        sale = db.get(Sale, sale_id)
        sale.created_at = utc_now() - timedelta(minutes=6)
        db.commit()
    response = client.post(f'/api/sales/{sale_id}/print', headers=cashier_headers)
    assert response.json()['code'] == 'printer_receipt_expired'
    with session_factory() as db:
        sale = db.get(Sale, sale_id)
        sale.created_at = utc_now()
        sale.status = 'cancelled'
        db.commit()
    response = client.post(f'/api/sales/{sale_id}/print', headers=cashier_headers)
    assert response.json()['code'] == 'sale_already_cancelled'
    # Another account's invoice is not accessible even with a known ID.
    client.post('/api/users', headers=admin_headers, json={'username': 'other', 'password': '12345', 'role': 'cashier'})
    token = client.post('/api/auth/login', json={'username': 'other', 'password': '12345'}).json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}
    client.post('/api/shifts/open', headers=headers, json={'opening_cash_lyd': 0})
    assert client.post(f'/api/sales/{sale_id}/print', headers=headers).status_code == 404
    assert not fake.started


def test_printer_status_authenticated_read_only(client, cashier_headers, native_setup):
    fake, _ = native_setup
    assert client.get('/api/printer/status').status_code == 401
    assert client.get('/api/printer/status', headers=cashier_headers).json()['ready']
    fake.ready_error = 'printer_queue_busy'
    status = client.get('/api/printer/status', headers=cashier_headers).json()
    assert not status['ready']
    assert status['code'] == 'printer_queue_busy'
    assert not fake.started
    assert not fake.cancelled


def test_monitor_detects_fault_and_timeout(monkeypatch):
    printer = SimpleNamespace(job=lambda job_id: {'Status': 0}, reported_fault=lambda: True)
    with pytest.raises(printing.PrinterError, match='printer_not_ready'):
        printing.wait_for_job(printer, 17)
    printer.reported_fault = lambda: False
    ticks = iter([0, 100])
    monkeypatch.setattr(printing.time, 'monotonic', lambda: next(ticks))
    with pytest.raises(printing.PrinterError, match='printer_timeout'):
        printing.wait_for_job(printer, 17)


def test_windows_status_masks_and_existing_jobs():
    printer = printing.WindowsPrinter.__new__(printing.WindowsPrinter)
    printer.handle = 'fake'
    printer.api = SimpleNamespace(GetPrinter=lambda *args: {'Status': 0x10}, EnumJobs=lambda *args: [])
    with pytest.raises(printing.PrinterError, match='printer_not_ready'):
        printer.ensure_ready()
    printer.api.GetPrinter = lambda *args: {'Status': 0}
    printer.api.EnumJobs = lambda *args: [{'JobId': 99}]
    with pytest.raises(printing.PrinterError, match='printer_queue_busy'):
        printer.ensure_ready()


def test_real_arabic_raster_framing():
    font = Path(os.environ.get('WINDIR', 'C:/Windows')) / 'Fonts' / 'segoeui.ttf'
    if not font.is_file():
        pytest.skip('Windows receipt font is not installed')
    sale = SimpleNamespace(
        id=123, created_at=utc_now(), payment_method='cash', total_lyd=Decimal('6'),
        items=[SimpleNamespace(product_name='قهوة عادية', qty=2, unit_price_lyd=Decimal('3'), line_total_lyd=Decimal('6'))],
    )
    data = printing.render_receipt(sale, 'حسن')
    assert data.startswith(b'\x1b@\x1dv0\x00')
    assert data.endswith(b'\x1bd\x03\x1dV\x00')
    offset = 2
    ink = False
    while data[offset:offset + 4] == b'\x1dv0\x00':
        row_bytes = int.from_bytes(data[offset + 4:offset + 6], 'little')
        rows = int.from_bytes(data[offset + 6:offset + 8], 'little')
        assert row_bytes == 72
        assert 0 < rows <= 128
        length = row_bytes * rows
        ink |= any(data[offset + 8:offset + 8 + length])
        offset += 8 + length
    assert ink
    assert data[offset:] == b'\x1bd\x03\x1dV\x00'
