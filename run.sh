#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$ROOT_DIR/mvp-jewelry-app"

PORT="${PORT:-3000}"
RESET_BUILD="${RESET_BUILD:-0}"
PRISMA_STUDIO="${PRISMA_STUDIO:-0}"
SKIP_INSTALL="${SKIP_INSTALL:-0}"
SKIP_MIGRATE="${SKIP_MIGRATE:-0}"
SKIP_SEED="${SKIP_SEED:-0}"
KILL_PORT="${KILL_PORT:-0}"

log() {
  printf '[run] %s\n' "$*"
}

warn() {
  printf '[run] warning: %s\n' "$*" >&2
}

has_image_api_key() {
  if [ -n "${GOOGLE_API_KEY:-}" ] || [ -n "${GEMINI_API_KEY:-}" ] || [ -n "${IMAGE_API_KEY:-}" ]; then
    return 0
  fi

  for env_file in .env.local .env; do
    if [ -f "$env_file" ] && grep -Eq '^[[:space:]]*(GOOGLE_API_KEY|GEMINI_API_KEY|IMAGE_API_KEY)=' "$env_file"; then
      return 0
    fi
  done

  return 1
}

kill_port_if_requested() {
  if [ "$KILL_PORT" != "1" ]; then
    return 0
  fi

  if ! command -v lsof >/dev/null 2>&1; then
    warn 'KILL_PORT=1 was set, but lsof is not installed. Skipping port cleanup.'
    return 0
  fi

  local pids
  pids="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)"
  if [ -z "$pids" ]; then
    return 0
  fi

  warn "Stopping process(es) currently listening on port $PORT: $pids"
  kill $pids
}

warn_if_port_is_busy() {
  if ! command -v lsof >/dev/null 2>&1; then
    return 0
  fi

  if lsof -tiTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    warn "Port $PORT is already in use. Stop the old server, run KILL_PORT=1 ./run.sh, or choose another port with PORT=3001 ./run.sh."
  fi
}

if [ ! -d "$APP_DIR" ]; then
  printf '[run] error: expected app directory at %s\n' "$APP_DIR" >&2
  exit 1
fi

cd "$APP_DIR"

if [ "$SKIP_INSTALL" != "1" ] && [ ! -d node_modules ]; then
  log 'node_modules not found, running npm install'
  npm install
fi

if [ "$RESET_BUILD" = "1" ]; then
  log 'Removing .next because RESET_BUILD=1'
  rm -rf .next
fi

mkdir -p public/generated

log 'Generating Prisma client'
npm run prisma:generate

if [ "$SKIP_MIGRATE" != "1" ]; then
  log 'Applying Prisma migrations'
  npx prisma migrate deploy
fi

if [ "$SKIP_SEED" != "1" ]; then
  log 'Seeding demo user'
  npm run db:seed
fi

if ! has_image_api_key; then
  warn 'No Google/Gemini image API key was found in the shell, .env.local, or .env. Image generation will fail until one is configured.'
fi

kill_port_if_requested
warn_if_port_is_busy

studio_pid=''
cleanup() {
  if [ -n "$studio_pid" ] && kill -0 "$studio_pid" >/dev/null 2>&1; then
    log 'Stopping Prisma Studio'
    kill "$studio_pid" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM

if [ "$PRISMA_STUDIO" = "1" ]; then
  log 'Starting Prisma Studio at http://localhost:5555'
  npx prisma studio --port 5555 > .prisma-studio.log 2>&1 &
  studio_pid="$!"
fi

log "Starting Next dev server at http://localhost:$PORT"

if [ "$PRISMA_STUDIO" = "1" ]; then
  npx next dev -p "$PORT"
else
  exec npx next dev -p "$PORT"
fi
