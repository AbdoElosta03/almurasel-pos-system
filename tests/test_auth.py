def test_login_accounts_lists_active_users(client, cashier_headers):
    response = client.get("/api/auth/login-accounts")
    assert response.status_code == 200, response.text
    accounts = response.json()
    usernames = {account["username"] for account in accounts}
    assert "admin" in usernames
    assert "cashier1" in usernames
    assert all(account["role"] in {"admin", "cashier"} for account in accounts)


def test_login_and_reject_bad_password(client, admin_headers):
    me = client.get("/api/auth/me", headers=admin_headers)
    assert me.status_code == 200
    assert me.json()["role"] == "admin"

    bad = client.post("/api/auth/login", json={"username": "admin", "password": "wrong"})
    assert bad.status_code == 401


def test_user_password_must_be_numeric(client, admin_headers):
    bad = client.post(
        "/api/users",
        headers=admin_headers,
        json={"username": "badpin", "password": "abc1", "role": "cashier"},
    )
    assert bad.status_code == 422


def test_cashier_cannot_create_user(client, cashier_headers):
    response = client.post(
        "/api/users",
        headers=cashier_headers,
        json={"username": "other", "password": "12345678", "role": "cashier"},
    )
    assert response.status_code == 403
