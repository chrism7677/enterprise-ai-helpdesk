from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.tickets import router as ticket_router


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(ticket_router)


"""
Startup Sequence

# Navigate to backend directory
cd backend

# Start PostgreSQL
docker compose up -d

# Activate virtual environment
source .venv/bin/activate

# Apply any pending database migrations
alembic upgrade head

# Start FastAPI
uvicorn app.main:app --reload
"""
