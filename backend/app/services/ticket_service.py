from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.models import Ticket, TicketNote, User
from app.schemas.ticket import TicketClaim, TicketCreate, TicketNoteCreate


class TicketNotFoundError(Exception):
    """Raised when a requested ticket does not exist."""


class AssigneeNotFoundError(Exception):
    """Raised when a proposed ticket assignee does not exist."""


class InvalidAssigneeRoleError(Exception):
    """Raised when a proposed assignee is not an IT staff user."""


class NoteAuthorNotFoundError(Exception):
    """Raised when a proposed note author does not exist."""


class InvalidNoteAuthorRoleError(Exception):
    """Raised when a proposed note author is not an IT staff user."""


class TicketAlreadyAssignedError(Exception):
    """Raised when a ticket is assigned to a different user."""


class TicketNotClaimedError(Exception):
    """Raised when an unassigned ticket is resolved."""


def create_ticket(db: Session, ticket_data: TicketCreate) -> Ticket:
    ticket = Ticket(**ticket_data.model_dump())

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
) -> list[Ticket]:
    statement = select(Ticket).order_by(Ticket.created_at, Ticket.id)
    if requester_id is not None:
        statement = statement.where(Ticket.requester_id == requester_id)
    return list(db.scalars(statement).all())


def get_ticket(db: Session, ticket_id: int) -> Ticket:
    ticket = db.get(Ticket, ticket_id)
    if ticket is None:
        raise TicketNotFoundError
    return ticket


def create_ticket_note(
    db: Session,
    ticket_id: int,
    author_id: int,
    note_data: TicketNoteCreate,
) -> TicketNote:
    get_ticket(db, ticket_id)
    author = db.get(User, author_id)
    if author is None:
        raise NoteAuthorNotFoundError
    if author.role != "it_staff":
        raise InvalidNoteAuthorRoleError

    note = TicketNote(
        ticket_id=ticket_id,
        author_id=author.id,
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
    claim_data: TicketClaim,
) -> Ticket:
    ticket = get_ticket(db, ticket_id)
    assignee = db.get(User, claim_data.assignee_id)
    if assignee is None:
        raise AssigneeNotFoundError
    if assignee.role != "it_staff":
        raise InvalidAssigneeRoleError
    if (
        ticket.assignee_id is not None
        and ticket.assignee_id != assignee.id
    ):
        raise TicketAlreadyAssignedError

    ticket.assignee_id = assignee.id
    if ticket.status != "resolved":
        ticket.status = "in_progress"

    try:
        db.commit()
        db.refresh(ticket)
    except SQLAlchemyError:
        db.rollback()
        raise

    return ticket


def resolve_ticket(db: Session, ticket_id: int) -> Ticket:
    ticket = get_ticket(db, ticket_id)
    if ticket.assignee_id is None:
        raise TicketNotClaimedError

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
