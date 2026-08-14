import pytest
from fastapi import HTTPException
from httpx import AsyncClient

from app.api.deps import get_current_user
from app.db.models import User
from app.main import app

pytestmark = pytest.mark.anyio


async def test_employee_receives_current_application_user(
    authenticated_client: AsyncClient,
) -> None:
    response = await authenticated_client.get("/users/me")

    assert response.status_code == 200
    assert response.json() == {
        "id": 1,
        "name": "Demo Employee",
        "email": "employee@example.com",
        "role": "employee",
    }
    assert "password_hash" not in response.json()
    assert "entra_oid" not in response.json()


async def test_it_staff_receives_current_application_user(
    it_staff_authenticated_client: AsyncClient,
) -> None:
    response = await it_staff_authenticated_client.get("/users/me")

    assert response.status_code == 200
    assert response.json() == {
        "id": 2,
        "name": "Demo IT Staff",
        "email": "it.staff@example.com",
        "role": "it_staff",
    }


async def test_current_user_rejects_unmapped_entra_identity(
    client: AsyncClient,
) -> None:
    async def override_current_user() -> User:
        raise HTTPException(
            status_code=403,
            detail="Authenticated user is not registered",
        )

    app.dependency_overrides[get_current_user] = override_current_user
    try:
        response = await client.get("/users/me")
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 403
    assert response.json() == {
        "detail": "Authenticated user is not registered"
    }


async def test_current_user_requires_authentication(
    client: AsyncClient,
) -> None:
    response = await client.get("/users/me")

    assert response.status_code == 401
    assert response.json() == {
        "detail": "Authentication credentials are required"
    }
    assert response.headers["www-authenticate"] == "Bearer"
