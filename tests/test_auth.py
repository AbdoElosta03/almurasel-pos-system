def test_login_and_reject_bad_password(client, admin_headers):
    me = client.get("/api/auth/me", headers=admin_headers)
    assert me.status_code == 200
    assert me.json()["role"] == "admin"

    bad = client.post("/api/auth/login", json={"username": "admin", "password": "wrong"})
    assert bad.status_code == 401


def test_cashier_cannot_create_user(client, cashier_headers):
    response = client.post(
        "/api/users",
        headers=cashier_headers,
        json={"username": "other", "password": "pass1234", "role": "cashier"},
    )
    assert response.status_code == 403
