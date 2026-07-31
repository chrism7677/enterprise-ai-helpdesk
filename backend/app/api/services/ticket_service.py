from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.models import Ticket
from app.schemas.ticket import TicketCreate


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


def list_tickets(db: Session) -> list[Ticket]:
    statement = select(Ticket).order_by(Ticket.created_at, Ticket.id)
    return list(db.scalars(statement).all())
