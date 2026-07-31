from fastapi import FastAPI

from app.api.routes.tickets import router as ticket_router


app = FastAPI()


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(ticket_router)
