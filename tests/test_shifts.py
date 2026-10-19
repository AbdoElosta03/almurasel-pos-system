def test_one_open_shift_and_no_sale_without_it(client, cashier_headers, product):
    missing = client.post(
        "/api/sales",
        headers=cashier_headers,
        json={"payment_method": "cash", "items": [{"product_id": product["id"], "qty": 1}]},
    )
    assert missing.status_code == 400

    opened = client.post("/api/shifts/open", headers=cashier_headers, json={"opening_cash_lyd": 1})
    assert opened.status_code == 201
    current = client.get("/api/shifts/current", headers=cashier_headers)
    assert current.status_code == 200
    assert current.json()["id"] == opened.json()["id"]

    again = client.post("/api/shifts/open", headers=cashier_headers, json={"opening_cash_lyd": 0})
    assert again.status_code == 409

    closed = client.post(
        f"/api/shifts/{opened.json()['id']}/close",
        headers=cashier_headers,
        json={"closing_cash_lyd": 1},
    )
    assert closed.status_code == 200
    assert closed.json()["status"] == "closed"
    assert client.get("/api/shifts/current", headers=cashier_headers).status_code == 404
