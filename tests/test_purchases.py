from sqlalchemy import select

from app.models.audit_log import AuditLog
from app.models.purchase import PurchaseItem


def test_purchase_create_list_and_detail(client, admin_headers, session_factory):
    created = client.post(
        "/api/purchases",
        headers=admin_headers,
        json={
            "purchase_date": "2026-10-20",
            "supplier_name": "  Supplier  ",
            "items": [
                {"item_name": "  Coffee (kg)  ", "qty": 10, "line_total_lyd": 87},
                {"item_name": "Milk box", "qty": 1.5, "line_total_lyd": 48.125},
            ],
        },
    )
    assert created.status_code == 201, created.text
    invoice = created.json()
    assert invoice["purchase_date"] == "2026-10-20"
    assert invoice["supplier_name"] == "Supplier"
    assert invoice["total_lyd"] == 135.125  # The entered line amounts are totals, not unit prices.
    assert [(item["item_name"], item["qty"], item["line_total_lyd"]) for item in invoice["items"]] == [
        ("Coffee (kg)", 10, 87),
        ("Milk box", 1.5, 48.125),
    ]

    listed = client.get("/api/purchases?page=1&page_size=1", headers=admin_headers)
    assert listed.status_code == 200, listed.text
    assert listed.json()["total"] == 1
    assert listed.json()["items"][0]["id"] == invoice["id"]
    assert "items" not in listed.json()["items"][0]

    detail = client.get(f"/api/purchases/{invoice['id']}", headers=admin_headers)
    assert detail.status_code == 200, detail.text
    assert detail.json() == invoice

    with session_factory() as db:
        log = db.scalar(select(AuditLog).where(AuditLog.entity_type == "purchase"))
        assert log is not None
        assert log.entity_id == invoice["id"]
        assert log.action == "purchase.created"


def test_purchase_validation_and_permissions(client, admin_headers, cashier_headers):
    payload = {
        "purchase_date": "2026-10-20",
        "items": [{"item_name": "Coffee", "qty": 2, "line_total_lyd": 5}],
    }
    for items in ([], [{"item_name": "  ", "qty": 1, "line_total_lyd": 5}],
                  [{"item_name": "Coffee", "qty": 0, "line_total_lyd": 5}],
                  [{"item_name": "Coffee", "qty": 1, "line_total_lyd": -1}]):
        response = client.post("/api/purchases", headers=admin_headers, json={**payload, "items": items})
        assert response.status_code == 422, response.text

    assert client.get("/api/purchases/9999", headers=admin_headers).status_code == 404
    assert client.get("/api/purchases", headers=cashier_headers).status_code == 403
    assert client.get("/api/purchases/9999", headers=cashier_headers).status_code == 403
    assert client.post("/api/purchases", headers=cashier_headers, json=payload).status_code == 403
    assert client.get("/api/purchases").status_code == 401


def test_delete_purchase_removes_items_and_preserves_audit(client, admin_headers, cashier_headers, session_factory):
    payload = {
        "purchase_date": "2026-10-20",
        "items": [
            {"item_name": "Coffee", "qty": 10, "line_total_lyd": 87},
            {"item_name": "Milk", "qty": 1, "line_total_lyd": 48},
        ],
    }
    created = client.post("/api/purchases", headers=admin_headers, json=payload)
    assert created.status_code == 201, created.text
    purchase_id = created.json()["id"]
    other = client.post("/api/purchases", headers=admin_headers, json=payload)
    assert other.status_code == 201, other.text

    url = f"/api/purchases/{purchase_id}"
    assert client.delete(url).status_code == 401
    assert client.delete(url, headers=cashier_headers).status_code == 403
    assert client.get(url, headers=admin_headers).status_code == 200

    deleted = client.delete(url, headers=admin_headers)
    assert deleted.status_code == 204, deleted.text
    assert not deleted.content
    assert client.get(url, headers=admin_headers).status_code == 404
    assert client.delete(url, headers=admin_headers).status_code == 404
    assert client.get(f"/api/purchases/{other.json()['id']}", headers=admin_headers).status_code == 200
    listed = client.get("/api/purchases", headers=admin_headers).json()
    assert listed["total"] == 1
    assert listed["items"][0]["id"] == other.json()["id"]

    with session_factory() as db:
        assert db.scalars(select(PurchaseItem).where(PurchaseItem.purchase_id == purchase_id)).all() == []
        logs = db.scalars(select(AuditLog).where(AuditLog.entity_type == "purchase", AuditLog.entity_id == purchase_id)).all()
        assert [log.action for log in logs] == ["purchase.created", "purchase.deleted"]
