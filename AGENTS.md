## Project overview and structure
This repository is an early-stage Enterprise AI Helpdesk portfolio project.

Current technology stack:
- React with Vite and TypeScript
- FastAPI
- PostgreSQL with pgvector
- SQLAlchemy 2.x
- Alembic
- Docker Compose

The repository is organized as a monorepo with separate backend/ and frontend/ directories.

Current backend architecture includes:
- SQLAlchemy 2.x models
- Alembic migrations
- PostgreSQL
- Pydantic schemas
- FastAPI dependency injection
- Environment-based configuration
- Pytest test suite
- The backend currently contains working API routes and supporting services. 


Inspect the existing implementation before making changes. Reuse established patterns whenever appropriate rather than introducing new architectural styles.

Use the repository's existing database dependency pattern. Do not create a second engine, session factory, or database configuration.

Minimize changes outside the requested scope.

Avoid reformatting unrelated files.

Avoid moving files unless necessary to accomplish the requested task.


## Design philosophy
- This project is intended to demonstrate production-quality software engineering.
- Favor maintainability, readability, and clear architecture over minimizing lines of code or implementing clever shortcuts.
- When multiple reasonable implementations exist, prefer the one a senior engineer would expect to see in a well-maintained production codebase.


## Scope constraints
Do not:
- modify the React frontend
- add authentication or authorization
- add Docker or deployment changes
- add AI, RAG, vector search, agents, or external API calls
- redesign the entire project structure
- rename unrelated modules
- generate a new Alembic migration unless the existing Ticket model actually -requires a schema change
- delete old files unless they are unquestionably obsolete
- add speculative abstractions or generic repository layers
- Do not expose credentials in source code.
- Do not add unrelated features.

Prefer the smallest maintainable implementation that satisfies the checkpoints.


## Coding conventions
- Prefer SQLAlchemy 2.x style.
- Use type hints for all public functions.
- Keep business logic inside services, not API routes.
- Keep route handlers thin.
- Follow existing naming conventions.
- Avoid duplicate logic
- Prefer readable code over clever code.
- Do not introduce unnecessary abstractions.


## Verification
After implementation:
- Run the existing backend test suite.
- Run any new tests you added.
- If the repository already contains pytest, mypy, Ruff, ESLint, or other configured tooling, run the relevant checks for modified code.
- Inspect new registered routes and confirm that the  public paths are correct.
- If practical in the current environment, start the application or use FastAPI's test client to verify new endpoints.

Do not report a command as passing unless you actually ran it.


## Response format
Provide:
- a concise summary of the implementation
- the files changed
- all verification commands run and their results
- any assumptions made
- any issue that remains unresolved
- If verification fails, explain exactly why rather than claiming success.

Do not merely describe code that should be written. Implement it and verify it.
