import pytest
from httpx import AsyncClient

from app.db.models import Ticket

pytestmark = pytest.mark.anyio


async def test_it_staff_cannot_create_ticket(
    it_staff_authenticated_client: AsyncClient,
) -> None:
    response = await it_staff_authenticated_client.post(
        "/tickets",
        json={
            "title": "Cannot connect to VPN",
            "description": "The VPN client times out during connection.",
            "category": "network",
            "priority": "high",
            "requester_id": 1,
        },
    )

    assert response.status_code == 403
    assert response.json() == {"detail": "Employee role required"}


@pytest.mark.parametrize(
    ("method", "path_suffix", "request_body"),
    [
        ("POST", "/notes", {"body": "Investigating the issue."}),
        ("PATCH", "/claim", None),
        ("PATCH", "/resolve", None),
    ],
)
async def test_employee_cannot_access_it_staff_ticket_actions(
    authenticated_client: AsyncClient,
    ticket: Ticket,
    method: str,
    path_suffix: str,
    request_body: dict[str, object] | None,
) -> None:
    response = await authenticated_client.request(
        method,
        f"/tickets/{ticket.id}{path_suffix}",
        json=request_body,
    )

    assert response.status_code == 403
    assert response.json() == {"detail": "IT staff role required"}


async def test_shared_ticket_reads_allow_it_staff(
    it_staff_authenticated_client: AsyncClient,
    ticket: Ticket,
) -> None:
    collection_response = await it_staff_authenticated_client.get("/tickets")
    detail_response = await it_staff_authenticated_client.get(
        f"/tickets/{ticket.id}"
    )

    assert collection_response.status_code == 200
    assert [item["id"] for item in collection_response.json()] == [ticket.id]
    assert detail_response.status_code == 200
    assert detail_response.json()["id"] == ticket.id
