import pytest
from httpx import AsyncClient
from sqlalchemy.orm import Session

from app.db.models import Ticket, TicketNote

pytestmark = pytest.mark.anyio


async def test_employee_list_returns_only_authenticated_users_tickets(
    authenticated_client: AsyncClient,
    db_session: Session,
) -> None:
    db_session.add_all(
        [
            Ticket(
                title="My ticket",
                description="Owned by the authenticated employee.",
                category="software",
                requester_id=1,
            ),
            Ticket(
                title="Another employee ticket",
                description="Must not be returned.",
                category="hardware",
                requester_id=4,
            ),
        ]
    )
    db_session.commit()

    response = await authenticated_client.get(
        "/tickets",
        params={"requester_id": 4, "assignee_id": 3},
    )

    assert response.status_code == 200
    assert [item["title"] for item in response.json()] == ["My ticket"]


async def test_employee_cannot_read_another_employees_ticket_or_notes(
    authenticated_client: AsyncClient,
    db_session: Session,
) -> None:
    other_ticket = Ticket(
        title="Private employee ticket",
        description="Owned by another employee.",
        category="access",
        requester_id=4,
    )
    db_session.add(other_ticket)
    db_session.commit()
    db_session.refresh(other_ticket)
    db_session.add(
        TicketNote(
            ticket_id=other_ticket.id,
            author_id=2,
            body="Note attached to another employee's ticket.",
        )
    )
    db_session.commit()

    response = await authenticated_client.get(f"/tickets/{other_ticket.id}")

    assert response.status_code == 403
    assert response.json() == {
        "detail": "You do not have access to this ticket"
    }


async def test_it_staff_can_read_any_ticket(
    it_staff_authenticated_client: AsyncClient,
    db_session: Session,
) -> None:
    other_ticket = Ticket(
        title="Queue ticket",
        description="Visible to IT staff.",
        category="network",
        requester_id=4,
        assignee_id=3,
    )
    db_session.add(other_ticket)
    db_session.commit()
    db_session.refresh(other_ticket)

    response = await it_staff_authenticated_client.get(
        f"/tickets/{other_ticket.id}"
    )

    assert response.status_code == 200
    assert response.json()["id"] == other_ticket.id
    assert response.json()["assigned_to_current_user"] is False


async def test_it_staff_can_list_tickets_assigned_to_self(
    it_staff_authenticated_client: AsyncClient,
    db_session: Session,
) -> None:
    db_session.add_all(
        [
            Ticket(
                title="Assigned to me",
                description="Assigned to authenticated IT staff.",
                category="software",
                requester_id=1,
                assignee_id=2,
            ),
            Ticket(
                title="Assigned to someone else",
                description="Must not be returned.",
                category="hardware",
                requester_id=4,
                assignee_id=3,
            ),
        ]
    )
    db_session.commit()

    response = await it_staff_authenticated_client.get(
        "/tickets", params={"assigned_to_me": "true"}
    )

    assert response.status_code == 200
    assert [item["title"] for item in response.json()] == ["Assigned to me"]


async def test_it_staff_cannot_resolve_another_users_ticket(
    it_staff_authenticated_client: AsyncClient,
    db_session: Session,
) -> None:
    other_ticket = Ticket(
        title="Assigned elsewhere",
        description="Another IT staff member owns this assignment.",
        category="network",
        requester_id=1,
        assignee_id=3,
        status="in_progress",
    )
    db_session.add(other_ticket)
    db_session.commit()
    db_session.refresh(other_ticket)

    response = await it_staff_authenticated_client.patch(
        f"/tickets/{other_ticket.id}/resolve"
    )

    assert response.status_code == 403
    assert response.json() == {
        "detail": "Ticket is assigned to another IT staff user"
    }
