from pwdlib import PasswordHash
from sqlalchemy import select

from app.db.database import SessionLocal
from app.db.models import User


password_hash = PasswordHash.recommended()

DEMO_USERS = [
    {
        "email": "demoemp@example.com",
        "name": "Demo Employee",
        "role": "employee",
        "entra_oid": "4a38fe5c-e8dd-4aad-877d-5320a81653a1",
    },
    {
        "email": "demoit@example.com",
        "name": "Demo IT Staff",
        "role": "it_staff",
        "entra_oid": "e543f1b4-afa1-4536-bfe3-da54bf5381f0",
    },
    {
        "email": "demohr@example.com",
        "name": "Demo HR",
        "role": "employee",
        "entra_oid": "a0dc8699-8e28-4b9c-84d7-877ce0969383",
    },
    {
        "email": "desktopsupport@example.com",
        "name": "Demo Desktop Support",
        "role": "it_staff",
        "entra_oid": "bc48113e-cc11-465c-aa04-2b63ce916cea",
    },
]


def seed_users() -> None:
    with SessionLocal() as db:
        for user_data in DEMO_USERS:
            existing_user = db.scalar(
                select(User).where(
                    User.entra_oid == user_data["entra_oid"]
                )
            )

            if existing_user is None:
                db.add(
                    User(
                        **user_data,
                        password_hash=password_hash.hash(
                            "unused-entra-auth"
                        ),
                    )
                )

        db.commit()


if __name__ == "__main__":
    seed_users()