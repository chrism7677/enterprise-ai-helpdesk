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
Running the backend

cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
"""
