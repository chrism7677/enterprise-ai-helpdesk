from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.entra import ValidatedEntraClaims
from app.db.database import get_db
from app.db.models import User
from app.services import auth_service


DatabaseSession = Annotated[Session, Depends(get_db)]


def get_current_user(
    claims: ValidatedEntraClaims,
    db: DatabaseSession,
) -> User:
    """Resolve validated Entra claims to the current application user."""
    try:
        return auth_service.resolve_user_from_entra_claims(db, claims)
    except auth_service.EntraIdentityClaimMissingError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated identity is missing a stable user identifier",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None
    except auth_service.ApplicationUserNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authenticated user is not registered",
        ) from None


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_employee(current_user: CurrentUser) -> User:
    """Require the current application user to have the employee role."""
    if current_user.role != "employee":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employee role required",
        )
    return current_user


def require_it_staff(current_user: CurrentUser) -> User:
    """Require the current application user to have the IT staff role."""
    if current_user.role != "it_staff":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="IT staff role required",
        )
    return current_user
