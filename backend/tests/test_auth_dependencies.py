import pytest
from fastapi import HTTPException
from httpx import AsyncClient
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.auth.entra import EntraTokenClaims
from app.db.models import User
from app.main import app


ENTRA_TENANT_ID = "35aec465-2e0e-4877-8f10-e8d341af772c"
MAPPED_ENTRA_OID = "11111111-2222-3333-4444-555555555555"


def make_claims(oid: str | None) -> EntraTokenClaims:
    return EntraTokenClaims(
        sub="test-subject-id",
        oid=oid,
        tid=ENTRA_TENANT_ID,
        scp="access_as_user",
    )


def test_get_current_user_returns_mapped_application_user(
    db_session: Session,
) -> None:
    expected_user = db_session.get(User, 2)
    assert expected_user is not None
    expected_user.entra_oid = MAPPED_ENTRA_OID
    db_session.commit()

    current_user = get_current_user(
        claims=make_claims(MAPPED_ENTRA_OID),
        db=db_session,
    )

    assert current_user is expected_user
    assert current_user.id == 2
    assert current_user.email == "it.staff@example.com"
    assert current_user.role == "it_staff"


@pytest.mark.parametrize(
    ("oid", "expected_status", "expected_detail"),
    [
        (
            None,
            401,
            "Authenticated identity is missing a stable user identifier",
        ),
        (
            "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
            403,
            "Authenticated user is not registered",
        ),
    ],
)
def test_get_current_user_translates_identity_mapping_errors(
    db_session: Session,
    oid: str | None,
    expected_status: int,
    expected_detail: str,
) -> None:
    with pytest.raises(HTTPException) as caught_error:
        get_current_user(claims=make_claims(oid), db=db_session)

    assert caught_error.value.status_code == expected_status
    assert caught_error.value.detail == expected_detail


@pytest.mark.anyio
async def test_ticket_route_rejects_unmapped_entra_identity(
    client: AsyncClient,
) -> None:
    async def override_current_user() -> User:
        raise HTTPException(
            status_code=403,
            detail="Authenticated user is not registered",
        )

    app.dependency_overrides[get_current_user] = override_current_user
    try:
        response = await client.get("/tickets")
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 403
    assert response.json() == {
        "detail": "Authenticated user is not registered"
    }


@pytest.mark.anyio
async def test_ticket_route_preserves_invalid_token_behavior(
    client: AsyncClient,
) -> None:
    response = await client.get(
        "/tickets",
        headers={"Authorization": "Bearer not-a-jwt"},
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid authentication credentials"}
