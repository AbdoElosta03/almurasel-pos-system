def test_cashier_sees_only_active_catalog(client, admin_headers, cashier_headers):
    category = client.post("/api/categories", headers=admin_headers, json={"name": "Drinks"})
    assert category.status_code == 201
    category_id = category.json()["id"]
    product = client.post(
        "/api/products",
        headers=admin_headers,
        json={"category_id": category_id, "name": "Tea", "price_lyd": 0.5},
    )
    assert product.status_code == 201

    denied = client.post("/api/categories", headers=cashier_headers, json={"name": "Food"})
    assert denied.status_code == 403

    visible = client.get("/api/products", headers=cashier_headers)
    assert visible.status_code == 200
    assert [item["name"] for item in visible.json()] == ["Tea"]

    hidden = client.patch(
        f"/api/products/{product.json()['id']}",
        headers=admin_headers,
        json={"is_active": False},
    )
    assert hidden.status_code == 200
    assert client.get("/api/products", headers=cashier_headers).json() == []


def test_can_delete_unused_product_and_category(client, admin_headers, cashier_headers):
    category = client.post("/api/categories", headers=admin_headers, json={"name": "Snacks"})
    product = client.post(
        "/api/products",
        headers=admin_headers,
        json={"category_id": category.json()["id"], "name": "Chips", "price_lyd": 1.5},
    )
    denied = client.delete(f"/api/products/{product.json()['id']}", headers=cashier_headers)
    assert denied.status_code == 403
    deleted_product = client.delete(f"/api/products/{product.json()['id']}", headers=admin_headers)
    assert deleted_product.status_code == 204
    deleted_category = client.delete(f"/api/categories/{category.json()['id']}", headers=admin_headers)
    assert deleted_category.status_code == 204


def test_cannot_delete_sold_product_or_category(client, admin_headers, cashier_headers, product):
    client.post("/api/shifts/open", headers=cashier_headers, json={"opening_cash_lyd": 0})
    sale = client.post(
        "/api/sales",
        headers=cashier_headers,
        json={"payment_method": "cash", "items": [{"product_id": product["id"], "qty": 1}]},
    )
    assert sale.status_code == 201
    blocked_product = client.delete(f"/api/products/{product['id']}", headers=admin_headers)
    assert blocked_product.status_code == 409
    assert blocked_product.json()["code"] == "product_used_in_sale"
    blocked_category = client.delete(f"/api/categories/{product['category_id']}", headers=admin_headers)
    assert blocked_category.status_code == 409
    assert blocked_category.json()["code"] == "category_used_in_sale"


def test_inactive_product_cannot_be_sold(client, admin_headers, cashier_headers, product):
    client.patch(f"/api/products/{product['id']}", headers=admin_headers, json={"is_active": False})
    client.post("/api/shifts/open", headers=cashier_headers, json={"opening_cash_lyd": 0})
    sale = client.post(
        "/api/sales",
        headers=cashier_headers,
        json={"payment_method": "cash", "items": [{"product_id": product["id"], "qty": 1}]},
    )
    assert sale.status_code == 400


def test_catalog_pagination_respects_filters_and_roles(client, admin_headers, cashier_headers):
    category_ids = []
    for name in ("First", "Second", "Third"):
        category_ids.append(client.post("/api/categories", headers=admin_headers, json={"name": name}).json()["id"])
    for name, category_id in (("A", category_ids[0]), ("B", category_ids[0]), ("C", category_ids[1])):
        client.post(
            "/api/products",
            headers=admin_headers,
            json={"category_id": category_id, "name": name, "price_lyd": 1},
        )

    category_page = client.get("/api/categories?page=2&page_size=2", headers=admin_headers)
    assert category_page.status_code == 200
    assert category_page.json()["total"] == 3
    assert category_page.json()["page"] == 2
    assert category_page.json()["page_size"] == 2
    assert [item["name"] for item in category_page.json()["items"]] == ["Third"]

    product_page = client.get(
        f"/api/products?category_id={category_ids[0]}&page=2&page_size=1", headers=admin_headers
    )
    assert product_page.status_code == 200
    assert product_page.json()["total"] == 2
    assert [item["name"] for item in product_page.json()["items"]] == ["B"]

    client.patch(f"/api/categories/{category_ids[0]}", headers=admin_headers, json={"is_active": False})
    assert client.get("/api/categories?page=1&page_size=2", headers=cashier_headers).json()["total"] == 2
    cashier_products = client.get("/api/products?page=1&page_size=2", headers=cashier_headers).json()
    assert cashier_products["total"] == 1
    assert [item["name"] for item in cashier_products["items"]] == ["C"]
    assert client.get("/api/products", headers=cashier_headers).json()[0]["name"] == "C"


def test_catalog_pagination_validates_parameters(client, admin_headers):
    for path in ("/api/products", "/api/categories"):
        for query in ("page=0", "page=-1", "page=1&page_size=0", "page=1&page_size=101"):
            assert client.get(f"{path}?{query}", headers=admin_headers).status_code == 422
        empty_page = client.get(f"{path}?page=100&page_size=2", headers=admin_headers).json()
        assert empty_page["items"] == []
        assert empty_page["total"] == 0
