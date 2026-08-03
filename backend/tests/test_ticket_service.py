from unittest.mock import MagicMock

import pytest
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.models import Ticket, User
from app.schemas.ticket import TicketClaim, TicketCreate
from app.services import ticket_service


def test_create_ticket_rolls_back_database_errors() -> None:
    db = MagicMock(spec=Session)
    database_error = SQLAlchemyError("commit failed")
    db.commit.side_effect = database_error
    ticket_data = TicketCreate(
        title="Cannot connect to VPN",
        description="The VPN client times out during connection.",
        category="network",
        priority="high",
        requester_id=1,
    )

    with pytest.raises(SQLAlchemyError) as caught_error:
        ticket_service.create_ticket(db, ticket_data)

    assert caught_error.value is database_error
    db.rollback.assert_called_once_with()
    db.refresh.assert_not_called()


def test_claim_ticket_rolls_back_database_errors() -> None:
    db = MagicMock(spec=Session)
    database_error = SQLAlchemyError("commit failed")
    db.commit.side_effect = database_error
    db.get.side_effect = [
        Ticket(id=1, requester_id=1, assignee_id=None, status="open"),
        User(id=2, role="it_staff"),
    ]

    with pytest.raises(SQLAlchemyError) as caught_error:
        ticket_service.claim_ticket(
            db,
            ticket_id=1,
            claim_data=TicketClaim(assignee_id=2),
        )

    assert caught_error.value is database_error
    db.rollback.assert_called_once_with()
    db.refresh.assert_not_called()


def test_resolve_ticket_rolls_back_database_errors() -> None:
    db = MagicMock(spec=Session)
    database_error = SQLAlchemyError("commit failed")
    db.commit.side_effect = database_error
    db.get.return_value = Ticket(
        id=1,
        requester_id=1,
        assignee_id=2,
        status="in_progress",
    )

    with pytest.raises(SQLAlchemyError) as caught_error:
        ticket_service.resolve_ticket(db, ticket_id=1)

    assert caught_error.value is database_error
    db.rollback.assert_called_once_with()
    db.refresh.assert_not_called()
