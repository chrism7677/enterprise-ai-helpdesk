import pytest
from httpx import AsyncClient
from sqlalchemy.orm import Session

from app.db.models import Ticket

pytestmark = pytest.mark.anyio


async def test_health_check(client: AsyncClient) -> None:
    response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


async def test_ticket_route_rejects_missing_authentication(
    client: AsyncClient,
) -> None:
    response = await client.get("/tickets")

    assert response.status_code == 401
    assert response.json() == {
        "detail": "Authentication credentials are required"
    }
    assert response.headers["www-authenticate"] == "Bearer"


async def test_ticket_queue_is_empty(
    authenticated_client: AsyncClient,
) -> None:
    response = await authenticated_client.get("/tickets")

    assert response.status_code == 200
    assert response.json() == []


async def test_create_ticket_and_retrieve_it(
    authenticated_client: AsyncClient,
) -> None:
    request_body = {
        "title": "Cannot connect to VPN",
        "description": "The VPN client times out during connection.",
        "category": "network",
        "priority": "high",
    }

    create_response = await authenticated_client.post(
        "/tickets", json=request_body
    )

    assert create_response.status_code == 201
    created_ticket = create_response.json()
    assert created_ticket["id"] == 1
    assert created_ticket["status"] == "open"
    assert created_ticket["requester_id"] == 1
    assert created_ticket["assignee_id"] is None
    assert {key: created_ticket[key] for key in request_body} == request_body

    queue_response = await authenticated_client.get("/tickets")

    assert queue_response.status_code == 200
    assert queue_response.json() == [created_ticket]


async def test_create_ticket_rejects_invalid_data(
    authenticated_client: AsyncClient,
) -> None:
    response = await authenticated_client.post(
        "/tickets",
        json={
            "title": "",
            "description": "A description",
            "category": "invalid-category",
        },
    )

    assert response.status_code == 422


async def test_create_ticket_ignores_client_supplied_requester_id(
    authenticated_client: AsyncClient,
) -> None:
    response = await authenticated_client.post(
        "/tickets",
        json={
            "title": "Cannot connect to VPN",
            "description": "The VPN client times out during connection.",
            "category": "network",
            "priority": "high",
            "requester_id": 4,
        },
    )

    assert response.status_code == 201
    assert response.json()["requester_id"] == 1


async def test_ticket_queue_can_be_filtered_by_requester(
    it_staff_authenticated_client: AsyncClient,
    db_session: Session,
) -> None:
    db_session.add_all(
        [
            Ticket(
                title="Employee ticket",
                description="Requested by the demo employee.",
                category="software",
                priority="medium",
                requester_id=1,
            ),
            Ticket(
                title="Different requester ticket",
                description="Requested by another existing user.",
                category="hardware",
                priority="low",
                requester_id=2,
            ),
        ]
    )
    db_session.commit()

    unfiltered_response = await it_staff_authenticated_client.get("/tickets")
    filtered_response = await it_staff_authenticated_client.get(
        "/tickets", params={"requester_id": 1}
    )

    assert unfiltered_response.status_code == 200
    assert [ticket["title"] for ticket in unfiltered_response.json()] == [
        "Employee ticket",
        "Different requester ticket",
    ]
    assert filtered_response.status_code == 200
    assert [ticket["title"] for ticket in filtered_response.json()] == [
        "Employee ticket"
    ]


async def test_ticket_queue_assignment_filters(
    it_staff_authenticated_client: AsyncClient,
    db_session: Session,
) -> None:
    tickets = [
        Ticket(
            title="Unassigned employee ticket",
            description="Waiting in the queue.",
            category="software",
            priority="medium",
            requester_id=1,
        ),
        Ticket(
            title="Assigned to demo IT staff",
            description="Being handled by user 2.",
            category="network",
            priority="high",
            requester_id=1,
            assignee_id=2,
        ),
        Ticket(
            title="Assigned to other IT staff",
            description="Being handled by user 3.",
            category="hardware",
            priority="low",
            requester_id=2,
            assignee_id=3,
        ),
    ]
    db_session.add_all(tickets)
    db_session.commit()
    for ticket in tickets:
        db_session.refresh(ticket)

    unfiltered_response = await it_staff_authenticated_client.get("/tickets")
    requester_response = await it_staff_authenticated_client.get(
        "/tickets", params={"requester_id": 1}
    )
    assignee_response = await it_staff_authenticated_client.get(
        "/tickets", params={"assignee_id": 2}
    )
    unassigned_response = await it_staff_authenticated_client.get(
        "/tickets", params={"unassigned": "true"}
    )

    assert unfiltered_response.status_code == 200
    assert [item["id"] for item in unfiltered_response.json()] == [
        ticket.id for ticket in tickets
    ]
    assert requester_response.status_code == 200
    assert [item["id"] for item in requester_response.json()] == [
        tickets[0].id,
        tickets[1].id,
    ]
    assert assignee_response.status_code == 200
    assert [item["id"] for item in assignee_response.json()] == [
        tickets[1].id
    ]
    assert unassigned_response.status_code == 200
    assert [item["id"] for item in unassigned_response.json()] == [
        tickets[0].id
    ]


async def test_ticket_queue_rejects_conflicting_assignment_filters(
    it_staff_authenticated_client: AsyncClient,
) -> None:
    response = await it_staff_authenticated_client.get(
        "/tickets",
        params={"assignee_id": 2, "unassigned": "true"},
    )

    assert response.status_code == 400
    assert response.json() == {
        "detail": "assignee_id and unassigned=true cannot be used together"
    }


async def test_ticket_queue_filtered_empty_result(
    it_staff_authenticated_client: AsyncClient,
) -> None:
    response = await it_staff_authenticated_client.get(
        "/tickets", params={"assignee_id": 999}
    )

    assert response.status_code == 200
    assert response.json() == []
