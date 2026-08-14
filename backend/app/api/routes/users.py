from fastapi import APIRouter

from app.api.deps import CurrentUser
from app.schemas.user import CurrentUserResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=CurrentUserResponse)
def get_current_application_user(
    current_user: CurrentUser,
) -> CurrentUserResponse:
    return CurrentUserResponse.model_validate(current_user)
