from collections.abc import AsyncGenerator, Generator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

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
