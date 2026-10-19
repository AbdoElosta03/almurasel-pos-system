def test_sale_total_uses_server_price(client, admin_headers, cashier_headers, product):
    extra = client.post(
        "/api/products",
        headers=admin_headers,
        json={"category_id": product["category_id"], "name": "Coffee", "price_lyd": 0.25},
    )
    assert extra.status_code == 201
    client.post("/api/shifts/open", headers=cashier_headers, json={"opening_cash_lyd": 0})
    sale = client.post(
        "/api/sales",
        headers=cashier_headers,
        json={
            "payment_method": "card",
            "items": [
                {"product_id": product["id"], "qty": 2},
                {"product_id": extra.json()["id"], "qty": 4},
            ],
        },
    )
    assert sale.status_code == 201, sale.text
    body = sale.json()
    assert float(body["total_lyd"]) == 2
    assert body["status"] == "completed"
    assert sorted(float(item["line_total_lyd"]) for item in body["items"]) == [1, 1]


def test_cancel_rules(client, admin_headers, cashier_headers, product):
    client.post("/api/shifts/open", headers=cashier_headers, json={"opening_cash_lyd": 0})
    first = client.post(
        "/api/sales",
        headers=cashier_headers,
        json={"payment_method": "cash", "items": [{"product_id": product["id"], "qty": 1}]},
    )
    cancelled = client.post(f"/api/sales/{first.json()['id']}/cancel", headers=cashier_headers)
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"
    assert cancelled.json()["id"] == first.json()["id"]

    second = client.post(
        "/api/sales",
        headers=cashier_headers,
        json={"payment_method": "cash", "items": [{"product_id": product["id"], "qty": 1}]},
    )
    shift_id = second.json()["shift_id"]
    client.post(f"/api/shifts/{shift_id}/close", headers=cashier_headers, json={"closing_cash_lyd": 0})
    denied = client.post(f"/api/sales/{second.json()['id']}/cancel", headers=cashier_headers)
    assert denied.status_code == 403

    allowed = client.post(f"/api/sales/{second.json()['id']}/cancel", headers=admin_headers)
    assert allowed.status_code == 200
    assert allowed.json()["status"] == "cancelled"
    repeated = client.post(f"/api/sales/{second.json()['id']}/cancel", headers=admin_headers)
    assert repeated.status_code == 400
