from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.entra import get_validated_entra_claims
from app.db.database import get_db
from app.db.models import User
from app.schemas.ticket import (
    TicketClaim,
    TicketCreate,
    TicketDetailResponse,
    TicketNoteCreate,
    TicketNoteResponse,
    TicketResponse,
)
from app.services import ticket_service

router = APIRouter(
    prefix="/tickets",
    tags=["tickets"],
    dependencies=[Depends(get_validated_entra_claims)],
)


DatabaseSession = Annotated[Session, Depends(get_db)]
DEMO_IT_STAFF_USER_ID = 2


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
def list_tickets(
    db: DatabaseSession,
    requester_id: Annotated[int | None, Query(gt=0)] = None,
    assignee_id: Annotated[int | None, Query(gt=0)] = None,
    unassigned: bool = False,
) -> list[TicketResponse]:
    if assignee_id is not None and unassigned:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="assignee_id and unassigned=true cannot be used together",
        )

    tickets = ticket_service.list_tickets(
        db,
        requester_id=requester_id,
        assignee_id=assignee_id,
        unassigned=unassigned,
    )
    return [TicketResponse.model_validate(ticket) for ticket in tickets]


@router.get("/{ticket_id}", response_model=TicketDetailResponse)
def get_ticket(ticket_id: int, db: DatabaseSession) -> TicketDetailResponse:
    try:
        ticket = ticket_service.get_ticket(db, ticket_id)
    except ticket_service.TicketNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found",
        ) from None
    return TicketDetailResponse.model_validate(ticket)


@router.post(
    "/{ticket_id}/notes",
    response_model=TicketNoteResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_ticket_note(
    ticket_id: int,
    note: TicketNoteCreate,
    db: DatabaseSession,
) -> TicketNoteResponse:
    try:
        created_note = ticket_service.create_ticket_note(
            db,
            ticket_id,
            DEMO_IT_STAFF_USER_ID,
            note,
        )
    except ticket_service.TicketNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found",
        ) from None
    except ticket_service.NoteAuthorNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note author not found",
        ) from None
    except ticket_service.InvalidNoteAuthorRoleError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Note author must be an IT staff user",
        ) from None
    return TicketNoteResponse.model_validate(created_note)


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
