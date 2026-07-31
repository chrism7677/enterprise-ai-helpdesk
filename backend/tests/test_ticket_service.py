from unittest.mock import MagicMock

import pytest
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.services import ticket_service
from app.schemas.ticket import TicketCreate


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
