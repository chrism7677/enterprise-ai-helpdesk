from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import User
from app.schemas.ticket import TicketCreate, TicketResponse
from app.services import ticket_service

router = APIRouter(prefix="/tickets", tags=["tickets"])

DatabaseSession = Annotated[Session, Depends(get_db)]

#Note: SQLAlchemy Session and service methods are synchronous
#So no "async def foo()", there would be no benefit. 

@router.post(
    "",
    response_model=TicketResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_ticket(
    ticket: TicketCreate,
    db: DatabaseSession,
) -> TicketResponse:
    if db.get(User, ticket.requester_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requester not found",
        )

    created_ticket = ticket_service.create_ticket(db, ticket)
    return TicketResponse.model_validate(created_ticket)


@router.get("", response_model=list[TicketResponse])
def list_tickets(db: DatabaseSession) -> list[TicketResponse]:
    tickets = ticket_service.list_tickets(db)
    return [TicketResponse.model_validate(ticket) for ticket in tickets]
