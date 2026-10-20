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


def test_cashier_invoice_details_only_for_own_open_shift(client, admin_headers, cashier_headers, product):
    opened = client.post('/api/shifts/open', headers=cashier_headers, json={'opening_cash_lyd': 0})
    assert opened.status_code == 201, opened.text
    sale = client.post(
        '/api/sales',
        headers=cashier_headers,
        json={'payment_method': 'cash', 'items': [{'product_id': product['id'], 'qty': 2}]},
    )
    assert sale.status_code == 201, sale.text
    sale_id = sale.json()['id']
    listed = client.get('/api/sales/my-open-shift', headers=cashier_headers)
    assert listed.status_code == 200, listed.text
    assert listed.json()['items'] == [{
        'id': sale_id,
        'payment_method': sale.json()['payment_method'],
        'status': sale.json()['status'],
        'total_lyd': sale.json()['total_lyd'],
        'created_at': sale.json()['created_at'],
        'item_count': 1,
    }]
    url = f'/api/sales/my-open-shift/{sale_id}'
    details = client.get(url, headers=cashier_headers)
    assert details.status_code == 200, details.text
    assert details.json() == sale.json()
    assert client.get(url, headers=admin_headers).status_code == 403
    assert client.get(url).status_code == 401
    assert client.get('/api/sales/my-open-shift/9999', headers=cashier_headers).status_code == 404

    created = client.post('/api/users', headers=admin_headers, json={'username': 'cashier2', 'password': 'pass1234', 'role': 'cashier'})
    assert created.status_code == 201, created.text
    login = client.post('/api/auth/login', json={'username': 'cashier2', 'password': 'pass1234'})
    other_headers = {'Authorization': f"Bearer {login.json()['access_token']}"}
    assert client.post('/api/shifts/open', headers=other_headers, json={'opening_cash_lyd': 0}).status_code == 201
    assert client.get(url, headers=other_headers).status_code == 404

    closed = client.post(f"/api/shifts/{opened.json()['id']}/close", headers=cashier_headers, json={'closing_cash_lyd': 0})
    assert closed.status_code == 200, closed.text
    assert client.get(url, headers=cashier_headers).status_code == 404
