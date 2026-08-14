from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, EmployeeUser, ITStaffUser
from app.db.database import get_db
from app.schemas.ticket import (
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
)


DatabaseSession = Annotated[Session, Depends(get_db)]


@router.post(
    "",
    response_model=TicketResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_ticket(
    ticket: TicketCreate,
    db: DatabaseSession,
    current_user: EmployeeUser,
) -> TicketResponse:
    created_ticket = ticket_service.create_ticket(db, ticket, current_user.id)
    return TicketResponse.model_validate(created_ticket)


@router.get(
    "",
    response_model=list[TicketResponse],
)
def list_tickets(
    db: DatabaseSession,
    current_user: CurrentUser,
    requester_id: Annotated[int | None, Query(gt=0)] = None,
    assignee_id: Annotated[int | None, Query(gt=0)] = None,
    unassigned: bool = False,
    assigned_to_me: bool = False,
) -> list[TicketResponse]:
    if current_user.role == "employee":
        requester_id = current_user.id
        assignee_id = None
        unassigned = False
    elif assigned_to_me:
        if assignee_id is not None or unassigned:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "assigned_to_me=true cannot be combined with assignee_id "
                    "or unassigned=true"
                ),
            )
        assignee_id = current_user.id
    elif assignee_id is not None and unassigned:
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


@router.get(
    "/{ticket_id}",
    response_model=TicketDetailResponse,
)
def get_ticket(
    ticket_id: int,
    db: DatabaseSession,
    current_user: CurrentUser,
) -> TicketDetailResponse:
    try:
        ticket = ticket_service.get_ticket_for_user(db, ticket_id, current_user)
    except ticket_service.TicketNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found",
        ) from None
    except ticket_service.TicketAccessForbiddenError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this ticket",
        ) from None
    ticket_response = TicketResponse.model_validate(ticket)
    response = TicketDetailResponse(
        **ticket_response.model_dump(),
        notes=ticket.notes,
        assigned_to_current_user=(ticket.assignee_id == current_user.id),
    )
    return response


@router.post(
    "/{ticket_id}/notes",
    response_model=TicketNoteResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_ticket_note(
    ticket_id: int,
    note: TicketNoteCreate,
    db: DatabaseSession,
    current_user: ITStaffUser,
) -> TicketNoteResponse:
    try:
        created_note = ticket_service.create_ticket_note(
            db,
            ticket_id,
            current_user.id,
            note,
        )
    except ticket_service.TicketNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found",
        ) from None
    except ticket_service.TicketNotAssignedToCurrentUserError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ticket must be assigned to the current IT staff user",
        ) from None
    return TicketNoteResponse.model_validate(created_note)


@router.patch(
    "/{ticket_id}/claim",
    response_model=TicketResponse,
)
def claim_ticket(
    ticket_id: int,
    db: DatabaseSession,
    current_user: ITStaffUser,
) -> TicketResponse:
    try:
        ticket = ticket_service.claim_ticket(db, ticket_id, current_user.id)
    except ticket_service.TicketNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found",
        ) from None
    except ticket_service.TicketAlreadyAssignedError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ticket is already assigned to another user",
        ) from None
    return TicketResponse.model_validate(ticket)


@router.patch(
    "/{ticket_id}/resolve",
    response_model=TicketResponse,
)
def resolve_ticket(
    ticket_id: int,
    db: DatabaseSession,
    current_user: ITStaffUser,
) -> TicketResponse:
    try:
        ticket = ticket_service.resolve_ticket(db, ticket_id, current_user.id)
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
    except ticket_service.TicketNotAssignedToCurrentUserError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ticket is assigned to another IT staff user",
        ) from None
    return TicketResponse.model_validate(ticket)
