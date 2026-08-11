from fastapi import APIRouter

from app.auth.entra import ValidatedEntraClaims

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.get("/validate")
async def validate_authentication(
    claims: ValidatedEntraClaims,
) -> dict[str, str | None]:
    """Confirm validation without performing application user mapping."""
    return {
        "sub": claims.sub,
        "oid": claims.oid,
        "tid": claims.tid,
    }
