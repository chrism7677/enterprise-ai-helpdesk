import os
from collections.abc import AsyncGenerator, Generator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

# Required application identifiers are replaced at the validator boundary in
# authentication tests; setting them here keeps all tests independent of a
# developer's local .env file.
os.environ.setdefault(
    "ENTRA_TENANT_ID", "35aec465-2e0e-4877-8f10-e8d341af772c"
)
os.environ.setdefault(
    "ENTRA_API_CLIENT_ID", "aa87e07e-dda0-4fce-aed8-0a7a04eb253d"
)
os.environ.setdefault("ENTRA_REQUIRED_SCOPE", "access_as_user")

from app.api.deps import get_current_user
from app.db.database import Base, get_db
from app.db.models import Ticket, User
from app.main import app


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(
        bind=engine,
        autoflush=False,
        expire_on_commit=False,
    )
    Base.metadata.create_all(engine)

    with TestingSessionLocal() as session:
        session.add_all(
            [
                User(
                    id=1,
                    email="employee@example.com",
                    name="Demo Employee",
                    password_hash="not-used-in-api-tests",
                    role="employee",
                ),
                User(
                    id=2,
                    email="it.staff@example.com",
                    name="Demo IT Staff",
                    password_hash="not-used-in-api-tests",
                    role="it_staff",
                ),
                User(
                    id=3,
                    email="other.it.staff@example.com",
                    name="Other IT Staff",
                    password_hash="not-used-in-api-tests",
                    role="it_staff",
                ),
                User(
                    id=4,
                    email="other.employee@example.com",
                    name="Other Employee",
                    password_hash="not-used-in-api-tests",
                    role="employee",
                ),
            ]
        )
        session.commit()
        yield session

    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture
def ticket(db_session: Session) -> Ticket:
    ticket = Ticket(
        title="Cannot connect to VPN",
        description="The VPN client times out during connection.",
        category="network",
        priority="high",
        requester_id=1,
    )
    db_session.add(ticket)
    db_session.commit()
    db_session.refresh(ticket)
    return ticket


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture
async def client(
    db_session: Session,
) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db() -> AsyncGenerator[Session, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture
async def authenticated_client(
    client: AsyncClient,
    db_session: Session,
) -> AsyncGenerator[AsyncClient, None]:
    async def override_current_user() -> User:
        user = db_session.get(User, 1)
        assert user is not None
        return user

    app.dependency_overrides[get_current_user] = override_current_user
    yield client
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
async def it_staff_authenticated_client(
    client: AsyncClient,
    db_session: Session,
) -> AsyncGenerator[AsyncClient, None]:
    async def override_current_user() -> User:
        user = db_session.get(User, 2)
        assert user is not None
        return user

    app.dependency_overrides[get_current_user] = override_current_user
    yield client
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
async def other_employee_authenticated_client(
    client: AsyncClient,
    db_session: Session,
) -> AsyncGenerator[AsyncClient, None]:
    async def override_current_user() -> User:
        user = db_session.get(User, 4)
        assert user is not None
        return user

    app.dependency_overrides[get_current_user] = override_current_user
    yield client
    app.dependency_overrides.pop(get_current_user, None)
