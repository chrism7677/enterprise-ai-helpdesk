from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.models import Ticket, TicketNote, User
from app.schemas.ticket import TicketCreate, TicketNoteCreate


class TicketNotFoundError(Exception):
    """Raised when a requested ticket does not exist."""


class TicketAlreadyAssignedError(Exception):
    """Raised when a ticket is assigned to a different user."""


class TicketNotClaimedError(Exception):
    """Raised when an unassigned ticket is resolved."""


class TicketAccessForbiddenError(Exception):
    """Raised when a user is not allowed to access a ticket."""


class TicketNotAssignedToCurrentUserError(Exception):
    """Raised when assignment-sensitive work is attempted by a non-assignee."""


def create_ticket(
    db: Session,
    ticket_data: TicketCreate,
    requester_id: int,
) -> Ticket:
    ticket = Ticket(
        **ticket_data.model_dump(),
        requester_id=requester_id,
    )

    try:
        db.add(ticket)
        db.commit()
        db.refresh(ticket)
    except SQLAlchemyError:
        db.rollback()
        raise

    return ticket


def list_tickets(
    db: Session,
    requester_id: int | None = None,
    assignee_id: int | None = None,
    unassigned: bool = False,
) -> list[Ticket]:
    statement = select(Ticket).order_by(Ticket.created_at, Ticket.id)
    if requester_id is not None:
        statement = statement.where(Ticket.requester_id == requester_id)
    if assignee_id is not None:
        statement = statement.where(Ticket.assignee_id == assignee_id)
    if unassigned:
        statement = statement.where(Ticket.assignee_id.is_(None))
    return list(db.scalars(statement).all())


def get_ticket(db: Session, ticket_id: int) -> Ticket:
    ticket = db.get(Ticket, ticket_id)
    if ticket is None:
        raise TicketNotFoundError
    return ticket


def get_ticket_for_user(
    db: Session,
    ticket_id: int,
    current_user: User,
) -> Ticket:
    ticket = get_ticket(db, ticket_id)
    if (
        current_user.role == "employee"
        and ticket.requester_id != current_user.id
    ):
        raise TicketAccessForbiddenError
    return ticket


def create_ticket_note(
    db: Session,
    ticket_id: int,
    author_id: int,
    note_data: TicketNoteCreate,
) -> TicketNote:
    ticket = get_ticket(db, ticket_id)

    if ticket.assignee_id != author_id:
        raise TicketNotAssignedToCurrentUserError

    note = TicketNote(
        ticket_id=ticket_id,
        author_id=author_id,
        **note_data.model_dump(),
    )

    try:
        db.add(note)
        db.commit()
        db.refresh(note)
    except SQLAlchemyError:
        db.rollback()
        raise

    return note


def claim_ticket(
    db: Session,
    ticket_id: int,
    assignee_id: int,
) -> Ticket:
    ticket = get_ticket(db, ticket_id)
    if (
        ticket.assignee_id is not None
        and ticket.assignee_id != assignee_id
    ):
        raise TicketAlreadyAssignedError

    ticket.assignee_id = assignee_id
    if ticket.status != "resolved":
        ticket.status = "in_progress"

    try:
        db.commit()
        db.refresh(ticket)
    except SQLAlchemyError:
        db.rollback()
        raise

    return ticket


def resolve_ticket(
    db: Session,
    ticket_id: int,
    assignee_id: int,
) -> Ticket:
    ticket = get_ticket(db, ticket_id)
    if ticket.assignee_id is None:
        raise TicketNotClaimedError
    if ticket.assignee_id != assignee_id:
        raise TicketNotAssignedToCurrentUserError

    if ticket.status == "resolved":
        return ticket

    ticket.status = "resolved"
    try:
        db.commit()
        db.refresh(ticket)
    except SQLAlchemyError:
        db.rollback()
        raise

    return ticket
