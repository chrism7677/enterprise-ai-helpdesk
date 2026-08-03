from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import User
from app.schemas.ticket import TicketClaim, TicketCreate, TicketResponse
from app.services import ticket_service

router = APIRouter(prefix="/tickets", tags=["tickets"])


DatabaseSession = Annotated[Session, Depends(get_db)]


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


@router.get("/{ticket_id}", response_model=TicketResponse)
def get_ticket(ticket_id: int, db: DatabaseSession) -> TicketResponse:
    try:
        ticket = ticket_service.get_ticket(db, ticket_id)
    except ticket_service.TicketNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found",
        ) from None
    return TicketResponse.model_validate(ticket)


@router.patch("/{ticket_id}/claim", response_model=TicketResponse)
def claim_ticket(
    ticket_id: int,
    claim: TicketClaim,
    db: DatabaseSession,
) -> TicketResponse:
    try:
        ticket = ticket_service.claim_ticket(db, ticket_id, claim)
    except ticket_service.TicketNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found",
        ) from None
    except ticket_service.AssigneeNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignee not found",
        ) from None
    except ticket_service.InvalidAssigneeRoleError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assignee must be an IT staff user",
        ) from None
    except ticket_service.TicketAlreadyAssignedError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ticket is already assigned to another user",
        ) from None
    return TicketResponse.model_validate(ticket)


@router.patch("/{ticket_id}/resolve", response_model=TicketResponse)
def resolve_ticket(ticket_id: int, db: DatabaseSession) -> TicketResponse:
    try:
        ticket = ticket_service.resolve_ticket(db, ticket_id)
    except ticket_service.TicketNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found",
        ) from None
    except ticket_service.TicketNotClaimedError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ticket must be claimed before it can be resolved",
        ) from None
    return TicketResponse.model_validate(ticket)
