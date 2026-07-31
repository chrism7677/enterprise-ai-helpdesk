#SQLAlchemy database setup
#DeclarativeBase is the modern SQLAlchemy declarative pattern for defining mapped classes

from collections.abc import AsyncGenerator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    pass


engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[Session, None]:
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()
