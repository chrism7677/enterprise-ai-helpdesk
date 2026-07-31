
#For Phase 1, create:
#employee@example.com
#itstaff@example.com


from pwdlib import PasswordHash
from sqlalchemy import select

from app.db.database import SessionLocal
from app.db.models import User


password_hash = PasswordHash.recommended()


def seed_users() -> None:
    with SessionLocal() as db:
        existing_user = db.scalar(
            select(User).where(User.email == "employee@example.com")
        )

        if existing_user is None:
            db.add_all(
                [
                    User(
                        email="employee@example.com",
                        name="Demo Employee",
                        password_hash=password_hash.hash(
                            "EmployeePassword123!"
                        ),
                        role="employee",
                    ),
                    User(
                        email="itstaff@example.com",
                        name="Demo IT Staff",
                        password_hash=password_hash.hash(
                            "ITStaffPassword123!"
                        ),
                        role="it_staff",
                    ),
                ]
            )

            db.commit()


if __name__ == "__main__":
    seed_users()

#run withpython -m scripts.seed, python runs the file with __name__ set to "__main__".
