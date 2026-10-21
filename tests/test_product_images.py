def test_product_image_upload_replace_and_remove(client, admin_headers, product):
    product_id = product["id"]
    assert product["image_url"] is None

    png = b"\x89PNG\r\n\x1a\n" + b"test-image"
    uploaded = client.post(
        f"/api/products/{product_id}/image",
        headers={**admin_headers, "Content-Type": "image/png"},
        content=png,
    )
    assert uploaded.status_code == 200, uploaded.text
    assert uploaded.json()["image_url"] == f"/api/products/{product_id}/image"

    image = client.get(f"/api/products/{product_id}/image")
    assert image.status_code == 200
    assert image.headers["content-type"] == "image/png"
    assert image.content == png

    listed = client.get("/api/products", headers=admin_headers)
    assert listed.json()[0]["image_url"] == f"/api/products/{product_id}/image"

    removed = client.delete(f"/api/products/{product_id}/image", headers=admin_headers)
    assert removed.status_code == 200
    assert removed.json()["image_url"] is None
    assert client.get(f"/api/products/{product_id}/image").status_code == 404


def test_product_image_validation(client, admin_headers, product):
    product_id = product["id"]
    invalid = client.post(
        f"/api/products/{product_id}/image",
        headers={**admin_headers, "Content-Type": "image/svg+xml"},
        content=b"<svg></svg>",
    )
    assert invalid.status_code == 400
    assert invalid.json()["code"] == "invalid_product_image"

    too_large = client.post(
        f"/api/products/{product_id}/image",
        headers={**admin_headers, "Content-Type": "image/png"},
        content=b"\x89PNG\r\n\x1a\n" + b"x" * (2 * 1024 * 1024),
    )
    assert too_large.status_code == 413
    assert too_large.json()["code"] == "product_image_too_large"
