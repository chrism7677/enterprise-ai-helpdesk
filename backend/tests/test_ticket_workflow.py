import pytest
from httpx import AsyncClient
from sqlalchemy.orm import Session

from app.db.models import Ticket

pytestmark = pytest.mark.anyio


async def test_get_existing_ticket(
    client: AsyncClient,
    ticket: Ticket,
) -> None:
    response = await client.get(f"/tickets/{ticket.id}")

    assert response.status_code == 200
    assert response.json()["id"] == ticket.id


async def test_get_missing_ticket(client: AsyncClient) -> None:
    response = await client.get("/tickets/999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Ticket not found"}


async def test_claim_ticket_persists_assignee_and_status(
    client: AsyncClient,
    db_session: Session,
    ticket: Ticket,
) -> None:
    response = await client.patch(
        f"/tickets/{ticket.id}/claim",
        json={"assignee_id": 2},
    )

    assert response.status_code == 200
    assert response.json()["assignee_id"] == 2
    assert response.json()["status"] == "in_progress"
    db_session.expire_all()
    persisted_ticket = db_session.get(Ticket, ticket.id)
    assert persisted_ticket is not None
    assert persisted_ticket.assignee_id == 2
    assert persisted_ticket.status == "in_progress"


async def test_claim_missing_ticket(client: AsyncClient) -> None:
    response = await client.patch(
        "/tickets/999/claim",
        json={"assignee_id": 2},
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Ticket not found"}


async def test_claim_with_missing_assignee(
    client: AsyncClient,
    ticket: Ticket,
) -> None:
    response = await client.patch(
        f"/tickets/{ticket.id}/claim",
        json={"assignee_id": 999},
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Assignee not found"}


async def test_claim_rejects_employee(
    client: AsyncClient,
    ticket: Ticket,
) -> None:
    response = await client.patch(
        f"/tickets/{ticket.id}/claim",
        json={"assignee_id": 1},
    )

    assert response.status_code == 400
    assert response.json() == {
        "detail": "Assignee must be an IT staff user"
    }


async def test_claim_rejects_different_assignee(
    client: AsyncClient,
    db_session: Session,
    ticket: Ticket,
) -> None:
    ticket.assignee_id = 3
    ticket.status = "in_progress"
    db_session.commit()

    response = await client.patch(
        f"/tickets/{ticket.id}/claim",
        json={"assignee_id": 2},
    )

    assert response.status_code == 409
    assert response.json() == {
        "detail": "Ticket is already assigned to another user"
    }
    db_session.expire_all()
    persisted_ticket = db_session.get(Ticket, ticket.id)
    assert persisted_ticket is not None
    assert persisted_ticket.assignee_id == 3


async def test_repeated_claim_by_same_assignee_is_idempotent(
    client: AsyncClient,
    db_session: Session,
    ticket: Ticket,
) -> None:
    ticket.assignee_id = 2
    ticket.status = "in_progress"
    db_session.commit()

    response = await client.patch(
        f"/tickets/{ticket.id}/claim",
        json={"assignee_id": 2},
    )

    assert response.status_code == 200
    assert response.json()["assignee_id"] == 2
    assert response.json()["status"] == "in_progress"


async def test_resolve_claimed_ticket_persists_status(
    client: AsyncClient,
    db_session: Session,
    ticket: Ticket,
) -> None:
    ticket.assignee_id = 2
    ticket.status = "in_progress"
    db_session.commit()

    response = await client.patch(f"/tickets/{ticket.id}/resolve")

    assert response.status_code == 200
    assert response.json()["status"] == "resolved"
    db_session.expire_all()
    persisted_ticket = db_session.get(Ticket, ticket.id)
    assert persisted_ticket is not None
    assert persisted_ticket.status == "resolved"


async def test_resolve_missing_ticket(client: AsyncClient) -> None:
    response = await client.patch("/tickets/999/resolve")

    assert response.status_code == 404
    assert response.json() == {"detail": "Ticket not found"}


async def test_resolve_rejects_unassigned_ticket(
    client: AsyncClient,
    ticket: Ticket,
) -> None:
    response = await client.patch(f"/tickets/{ticket.id}/resolve")

    assert response.status_code == 409
    assert response.json() == {
        "detail": "Ticket must be claimed before it can be resolved"
    }


async def test_resolve_already_resolved_ticket_is_idempotent(
    client: AsyncClient,
    db_session: Session,
    ticket: Ticket,
) -> None:
    ticket.assignee_id = 2
    ticket.status = "resolved"
    db_session.commit()

    response = await client.patch(f"/tickets/{ticket.id}/resolve")

    assert response.status_code == 200
    assert response.json()["status"] == "resolved"
    db_session.expire_all()
    persisted_ticket = db_session.get(Ticket, ticket.id)
    assert persisted_ticket is not None
    assert persisted_ticket.status == "resolved"
