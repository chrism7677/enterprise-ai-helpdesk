#!/usr/bin/env bash

set -Eeuo pipefail

if [[ -z "${APP_DIR:-}" ]]; then
  echo "ERROR: APP_DIR is required." >&2
  exit 2
fi

if [[ -z "${DEPLOY_REF:-}" ]]; then
  echo "ERROR: DEPLOY_REF is required." >&2
  exit 2
fi

if [[ "$DEPLOY_REF" != demo-* || "$DEPLOY_REF" == "demo-" ]]; then
  echo "ERROR: DEPLOY_REF must be a demo-* release tag; received: $DEPLOY_REF" >&2
  exit 2
fi

for prerequisite in git docker; do
  if ! command -v "$prerequisite" >/dev/null 2>&1; then
    echo "ERROR: Required command is unavailable: $prerequisite" >&2
    exit 1
  fi
done

if ! docker compose version >/dev/null 2>&1; then
  echo "ERROR: Docker Compose v2 is required." >&2
  exit 1
fi

if [[ ! -d "$APP_DIR/.git" ]]; then
  echo "ERROR: APP_DIR is not a Git checkout: $APP_DIR" >&2
  exit 1
fi

cd "$APP_DIR"

if ! git check-ref-format "refs/tags/$DEPLOY_REF" >/dev/null 2>&1; then
  echo "ERROR: DEPLOY_REF is not a valid Git tag name: $DEPLOY_REF" >&2
  exit 2
fi

echo "Fetching release tags from origin..."
if ! git ls-remote --exit-code --tags origin "refs/tags/$DEPLOY_REF" >/dev/null 2>&1; then
  echo "ERROR: Release tag does not exist on origin: $DEPLOY_REF" >&2
  exit 1
fi
git fetch --tags --force origin

if ! git show-ref --verify --quiet "refs/tags/$DEPLOY_REF"; then
  echo "ERROR: Release tag was not fetched: $DEPLOY_REF" >&2
  exit 1
fi

release_commit="$(git rev-parse --verify "refs/tags/$DEPLOY_REF^{commit}")"
git checkout --detach "refs/tags/$DEPLOY_REF"

if [[ "$(git rev-parse HEAD)" != "$release_commit" ]]; then
  echo "ERROR: Checked-out commit does not match release tag $DEPLOY_REF." >&2
  exit 1
fi

if [[ ! -f .env.production ]]; then
  echo "ERROR: Missing production environment file: $APP_DIR/.env.production" >&2
  exit 1
fi

if [[ ! -f compose.prod.yaml ]]; then
  echo "ERROR: Missing production Compose file: $APP_DIR/compose.prod.yaml" >&2
  exit 1
fi

compose=(docker compose --env-file .env.production -f compose.prod.yaml)

wait_for_health() {
  local service="$1"
  local timeout_seconds="$2"
  local container_id
  local health_status
  local deadline=$((SECONDS + timeout_seconds))

  container_id="$("${compose[@]}" ps -q "$service")"
  if [[ -z "$container_id" ]]; then
    echo "ERROR: Service has no running container: $service" >&2
    return 1
  fi

  while ((SECONDS < deadline)); do
    health_status="$(
      docker inspect \
        --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' \
        "$container_id"
    )"

    case "$health_status" in
      healthy)
        echo "Service is healthy: $service"
        return 0
        ;;
      unhealthy | exited | dead)
        echo "ERROR: Service $service entered state: $health_status" >&2
        "${compose[@]}" logs --tail=100 "$service" >&2 || true
        return 1
        ;;
    esac

    sleep 2
  done

  echo "ERROR: Timed out waiting for service health: $service" >&2
  "${compose[@]}" logs --tail=100 "$service" >&2 || true
  return 1
}

echo "Validating production Compose configuration..."
"${compose[@]}" config --quiet

echo "Building production application images..."
"${compose[@]}" build backend
"${compose[@]}" build frontend

echo "Starting PostgreSQL..."
"${compose[@]}" up -d db
wait_for_health db 120

echo "Applying pending Alembic migrations..."
"${compose[@]}" run --rm --no-deps backend alembic upgrade head

echo "Seeding required application users..."
"${compose[@]}" run --rm --no-deps backend python -m scripts.seed

echo "Starting application services..."
"${compose[@]}" up -d --no-deps backend frontend
wait_for_health backend 120
wait_for_health frontend 120

echo "Production services for $DEPLOY_REF are healthy."
"${compose[@]}" ps
