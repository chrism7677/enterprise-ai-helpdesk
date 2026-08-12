from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.entra import EntraTokenClaims
from app.db.models import User


class EntraIdentityClaimMissingError(Exception):
    """Raised when validated claims lack a stable Entra object identifier."""


class ApplicationUserNotFoundError(Exception):
    """Raised when an Entra identity is not mapped to an application user."""


def resolve_user_from_entra_claims(
    db: Session,
    claims: EntraTokenClaims,
) -> User:
    """Resolve validated Entra claims to an existing application user."""
    if claims.oid is None or not claims.oid.strip():
        raise EntraIdentityClaimMissingError

    user = db.scalar(select(User).where(User.entra_oid == claims.oid))
    if user is None:
        raise ApplicationUserNotFoundError

    return user
