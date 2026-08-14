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


Inspect the current models, schemas, services, routes, database dependency, enums or constrained field values, and tests before editing. Reuse established patterns whenever appropriate rather than introducing new architectural styles.

Minimize changes outside the requested scope.

Avoid reformatting unrelated files.

Avoid moving files unless necessary to accomplish the requested task.


## Design philosophy
- This project is intended to demonstrate production-quality software engineering.
- Favor maintainability, readability, and clear architecture over minimizing lines of code or implementing clever shortcuts.
- When multiple reasonable implementations exist, prefer the one a senior engineer would expect to see in a well-maintained production codebase.


## Scope constraints
Do not:
- add Docker or deployment changes
- add AI, RAG, vector search, agents, or external API calls
- redesign the entire project structure
- rename unrelated modules
- generate a new Alembic migration unless the requested feature genuinely requires a database schema change
- delete old files unless they are unquestionably obsolete
- add speculative abstractions or generic repository layers
- expose credentials in source code.
- add unrelated features or do unrelated refactoring
- create another engine, session factory, or database configuration. 

Prefer the smallest maintainable implementation that satisfies the checkpoints.


## Coding conventions
- Prefer SQLAlchemy 2.x style.
- Use the existing SQLAlchemy Session dependency. 
- Use the existing database models rather than introducing duplicate types. 
- Do not change persisted enum or string values unless a genuine schema inconsistency requires it.
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
- Verify that app.main imports successfully.
- If the repository already contains pytest, mypy, Ruff, ESLint, or other configured tooling, run the relevant checks for modified code.
- Inspect new registered routes and confirm that the  public paths are correct.
- If practical in the current environment, start the application or use FastAPI's test client to verify new endpoints.

Do not report a command as passing unless you actually ran it. Report every command actually run and its result. If a command hangs or fails, report the exact point and error.


## Test execution on Windows / Codex

Run the backend test suite with:

pytest -v

Known Codex environment issue:
FastAPI/AnyIO tests may hang when executed inside the restricted Windows
sandbox because AnyIO worker-thread execution can be blocked.

If a sandboxed pytest run hangs:
1. Do not modify application or test code solely to work around the sandbox.
2. Confirm the issue with a minimal AnyIO/FastAPI reproduction if needed.
3. Re-run the test command outside the sandbox with approval.
4. Report clearly whether results came from sandboxed or non-sandboxed execution.


## Response format
Provide:
- a concise summary of the implementation
- the files changed
- all verification commands run and their results
- any assumptions made
- any issue that remains unresolved
- where missing-resource and workflow errors are translated into HTTP responses 
- how transaction rollback is handled 
- If verification fails, explain exactly why rather than claiming success.

Do not merely describe code that should be written. Implement it and verify it.
