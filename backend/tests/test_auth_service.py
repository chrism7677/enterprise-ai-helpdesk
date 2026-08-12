import pytest
from sqlalchemy.orm import Session

from app.auth.entra import EntraTokenClaims
from app.db.models import User
from app.services import auth_service


ENTRA_TENANT_ID = "35aec465-2e0e-4877-8f10-e8d341af772c"
MAPPED_ENTRA_OID = "11111111-2222-3333-4444-555555555555"


def make_claims(oid: str | None) -> EntraTokenClaims:
    return EntraTokenClaims(
        sub="test-subject-id",
        oid=oid,
        tid=ENTRA_TENANT_ID,
        scp="access_as_user",
    )


def test_resolve_user_from_entra_claims_returns_mapped_user(
    db_session: Session,
) -> None:
    expected_user = db_session.get(User, 1)
    assert expected_user is not None
    expected_user.entra_oid = MAPPED_ENTRA_OID
    db_session.commit()

    user = auth_service.resolve_user_from_entra_claims(
        db_session,
        make_claims(MAPPED_ENTRA_OID),
    )

    assert user is expected_user


def test_resolve_user_from_entra_claims_rejects_unmapped_identity(
    db_session: Session,
) -> None:
    with pytest.raises(auth_service.ApplicationUserNotFoundError):
        auth_service.resolve_user_from_entra_claims(
            db_session,
            make_claims("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
        )


def test_resolve_user_from_entra_claims_rejects_missing_oid(
    db_session: Session,
) -> None:
    with pytest.raises(auth_service.EntraIdentityClaimMissingError):
        auth_service.resolve_user_from_entra_claims(
            db_session,
            make_claims(None),
        )
