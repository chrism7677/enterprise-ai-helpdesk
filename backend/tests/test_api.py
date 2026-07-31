import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.anyio


async def test_health_check(client: AsyncClient) -> None:
    response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


async def test_ticket_queue_is_empty(client: AsyncClient) -> None:
    response = await client.get("/tickets")

    assert response.status_code == 200
    assert response.json() == []


async def test_create_ticket_and_retrieve_it(client: AsyncClient) -> None:
    request_body = {
        "title": "Cannot connect to VPN",
        "description": "The VPN client times out during connection.",
        "category": "network",
        "priority": "high",
        "requester_id": 1,
    }

    create_response = await client.post("/tickets", json=request_body)

    assert create_response.status_code == 201
    created_ticket = create_response.json()
    assert created_ticket["id"] == 1
    assert created_ticket["status"] == "open"
    assert created_ticket["assignee_id"] is None
    assert {
        key: created_ticket[key] for key in request_body
    } == request_body

    queue_response = await client.get("/tickets")

    assert queue_response.status_code == 200
    assert queue_response.json() == [created_ticket]


async def test_create_ticket_rejects_invalid_data(
    client: AsyncClient,
) -> None:
    response = await client.post(
        "/tickets",
        json={
            "title": "",
            "description": "A description",
            "category": "invalid-category",
            "requester_id": 1,
        },
    )

    assert response.status_code == 422


async def test_create_ticket_rejects_unknown_requester(
    client: AsyncClient,
) -> None:
    response = await client.post(
        "/tickets",
        json={
            "title": "Cannot connect to VPN",
            "description": "The VPN client times out during connection.",
            "category": "network",
            "priority": "high",
            "requester_id": 999,
        },
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Requester not found"}
