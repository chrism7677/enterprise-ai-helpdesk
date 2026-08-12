from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy.orm import Session

from app.db.models import Ticket, TicketNote

pytestmark = pytest.mark.anyio


async def test_get_existing_ticket(
    authenticated_client: AsyncClient,
    ticket: Ticket,
) -> None:
    response = await authenticated_client.get(f"/tickets/{ticket.id}")

    assert response.status_code == 200
    assert response.json()["id"] == ticket.id


async def test_get_missing_ticket(authenticated_client: AsyncClient) -> None:
    response = await authenticated_client.get("/tickets/999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Ticket not found"}


async def test_create_ticket_note(
    authenticated_client: AsyncClient,
    db_session: Session,
    ticket: Ticket,
) -> None:
    response = await authenticated_client.post(
        f"/tickets/{ticket.id}/notes",
        json={"body": "Reset the VPN profile and asked the user to retry."},
    )

    assert response.status_code == 201
    created_note = response.json()
    assert created_note["ticket_id"] == ticket.id
    assert created_note["author_id"] == 2
    assert created_note["body"] == (
        "Reset the VPN profile and asked the user to retry."
    )
    persisted_note = db_session.get(TicketNote, created_note["id"])
    assert persisted_note is not None
    assert persisted_note.author_id == 2


async def test_create_note_for_missing_ticket(
    authenticated_client: AsyncClient,
) -> None:
    response = await authenticated_client.post(
        "/tickets/999/notes",
        json={"body": "Investigating the issue."},
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Ticket not found"}


async def test_create_ticket_note_rejects_blank_body(
    authenticated_client: AsyncClient,
    ticket: Ticket,
) -> None:
    response = await authenticated_client.post(
        f"/tickets/{ticket.id}/notes",
        json={"body": "   \n\t"},
    )

    assert response.status_code == 422


async def test_ticket_detail_returns_notes_in_chronological_order(
    authenticated_client: AsyncClient,
    db_session: Session,
    ticket: Ticket,
) -> None:
    now = datetime.now(timezone.utc)
    db_session.add_all(
        [
            TicketNote(
                ticket_id=ticket.id,
                author_id=2,
                body="Most recent note",
                created_at=now,
            ),
            TicketNote(
                ticket_id=ticket.id,
                author_id=2,
                body="Oldest note",
                created_at=now - timedelta(hours=1),
            ),
        ]
    )
    db_session.commit()

    response = await authenticated_client.get(f"/tickets/{ticket.id}")

    assert response.status_code == 200
    assert [note["body"] for note in response.json()["notes"]] == [
        "Oldest note",
        "Most recent note",
    ]


async def test_ticket_collection_does_not_include_note_histories(
    authenticated_client: AsyncClient,
    db_session: Session,
    ticket: Ticket,
) -> None:
    db_session.add(
        TicketNote(
            ticket_id=ticket.id,
            author_id=2,
            body="Internal work note",
        )
    )
    db_session.commit()

    response = await authenticated_client.get("/tickets")

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert "notes" not in response.json()[0]


async def test_claim_ticket_persists_assignee_and_status(
    authenticated_client: AsyncClient,
    db_session: Session,
    ticket: Ticket,
) -> None:
    response = await authenticated_client.patch(
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


async def test_claim_missing_ticket(
    authenticated_client: AsyncClient,
) -> None:
    response = await authenticated_client.patch(
        "/tickets/999/claim",
        json={"assignee_id": 2},
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Ticket not found"}


async def test_claim_with_missing_assignee(
    authenticated_client: AsyncClient,
    ticket: Ticket,
) -> None:
    response = await authenticated_client.patch(
        f"/tickets/{ticket.id}/claim",
        json={"assignee_id": 999},
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Assignee not found"}


async def test_claim_rejects_employee(
    authenticated_client: AsyncClient,
    ticket: Ticket,
) -> None:
    response = await authenticated_client.patch(
        f"/tickets/{ticket.id}/claim",
        json={"assignee_id": 1},
    )

    assert response.status_code == 400
    assert response.json() == {
        "detail": "Assignee must be an IT staff user"
    }


async def test_claim_rejects_different_assignee(
    authenticated_client: AsyncClient,
    db_session: Session,
    ticket: Ticket,
) -> None:
    ticket.assignee_id = 3
    ticket.status = "in_progress"
    db_session.commit()

    response = await authenticated_client.patch(
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
    authenticated_client: AsyncClient,
    db_session: Session,
    ticket: Ticket,
) -> None:
    ticket.assignee_id = 2
    ticket.status = "in_progress"
    db_session.commit()

    response = await authenticated_client.patch(
        f"/tickets/{ticket.id}/claim",
        json={"assignee_id": 2},
    )

    assert response.status_code == 200
    assert response.json()["assignee_id"] == 2
    assert response.json()["status"] == "in_progress"


async def test_resolve_claimed_ticket_persists_status(
    authenticated_client: AsyncClient,
    db_session: Session,
    ticket: Ticket,
) -> None:
    ticket.assignee_id = 2
    ticket.status = "in_progress"
    db_session.commit()

    response = await authenticated_client.patch(
        f"/tickets/{ticket.id}/resolve"
    )

    assert response.status_code == 200
    assert response.json()["status"] == "resolved"
    db_session.expire_all()
    persisted_ticket = db_session.get(Ticket, ticket.id)
    assert persisted_ticket is not None
    assert persisted_ticket.status == "resolved"


async def test_resolve_missing_ticket(
    authenticated_client: AsyncClient,
) -> None:
    response = await authenticated_client.patch("/tickets/999/resolve")

    assert response.status_code == 404
    assert response.json() == {"detail": "Ticket not found"}


async def test_resolve_rejects_unassigned_ticket(
    authenticated_client: AsyncClient,
    ticket: Ticket,
) -> None:
    response = await authenticated_client.patch(
        f"/tickets/{ticket.id}/resolve"
    )

    assert response.status_code == 409
    assert response.json() == {
        "detail": "Ticket must be claimed before it can be resolved"
    }


async def test_resolve_already_resolved_ticket_is_idempotent(
    authenticated_client: AsyncClient,
    db_session: Session,
    ticket: Ticket,
) -> None:
    ticket.assignee_id = 2
    ticket.status = "resolved"
    db_session.commit()

    response = await authenticated_client.patch(
        f"/tickets/{ticket.id}/resolve"
    )

    assert response.status_code == 200
    assert response.json()["status"] == "resolved"
    db_session.expire_all()
    persisted_ticket = db_session.get(Ticket, ticket.id)
    assert persisted_ticket is not None
    assert persisted_ticket.status == "resolved"
