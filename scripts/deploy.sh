#!/usr/bin/env bash
# ==============================================================================
# CreaBeast Prototype Deployment Script
#
# Usage:
#   ./scripts/deploy.sh [subdomain] [--with-db]
#
# Examples:
#   ./scripts/deploy.sh myapp
#   ./scripts/deploy.sh saas-mvp --with-db
# ==============================================================================

set -euo pipefail

SUBDOMAIN_ARG=""
WITH_DB=false

for arg in "$@"; do
  case "$arg" in
    --with-db)
      WITH_DB=true
      ;;
    *)
      if [ -z "$SUBDOMAIN_ARG" ]; then
        SUBDOMAIN_ARG="$arg"
      fi
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "$ROOT_DIR"

# 1. Check or create .env file
if [ ! -f .env ]; then
  echo "=> Creating .env from .env.example..."
  cp .env.example .env
fi

# 2. Update SUBDOMAIN if provided as argument
if [ -n "$SUBDOMAIN_ARG" ]; then
  echo "=> Setting SUBDOMAIN=${SUBDOMAIN_ARG} in .env..."
  if grep -q "^SUBDOMAIN=" .env; then
    sed -i "s/^SUBDOMAIN=.*/SUBDOMAIN=${SUBDOMAIN_ARG}/" .env
  else
    echo "SUBDOMAIN=${SUBDOMAIN_ARG}" >> .env
  fi
  # Also set COMPOSE_PROJECT_NAME to avoid name conflicts
  if grep -q "^COMPOSE_PROJECT_NAME=" .env; then
    sed -i "s/^COMPOSE_PROJECT_NAME=.*/COMPOSE_PROJECT_NAME=${SUBDOMAIN_ARG}/" .env
  else
    echo "COMPOSE_PROJECT_NAME=${SUBDOMAIN_ARG}" >> .env
  fi
fi

# Source .env
set -a
# shellcheck disable=SC1091
source .env
set +a

SUBDOMAIN="${SUBDOMAIN:-demo}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-prototype}"
DOMAIN="${SUBDOMAIN}.creabeast.com"

echo "=================================================================="
echo " Deploying CreaBeast Prototype: ${COMPOSE_PROJECT_NAME}"
echo " Target URL: https://${DOMAIN}"
echo " Database Profile: $([ "$WITH_DB" = true ] && echo "ENABLED (PostgreSQL)" || echo "DISABLED (Standalone / External DB)")"
echo "=================================================================="

# 3. Check for external network root_default
if command -v docker >/dev/null 2>&1; then
  if ! docker network inspect root_default >/dev/null 2>&1; then
    echo "=> Notice: Docker network 'root_default' not found."
    echo "   Creating 'root_default' network for local simulation..."
    docker network create root_default || true
  fi
fi

# 4. Build and run via Docker Compose
COMPOSE_ARGS=()
if [ "$WITH_DB" = true ]; then
  COMPOSE_ARGS+=(--profile with-db)
fi

echo "=> Building and starting containers..."
docker compose "${COMPOSE_ARGS[@]}" up -d --build

echo "=> Deployment completed successfully!"
echo "   Public URL:     https://${DOMAIN}"
echo "   Healthcheck:    https://${DOMAIN}/api/healthz"
echo "   Container:      ${COMPOSE_PROJECT_NAME}-${SUBDOMAIN}-web"
echo "=================================================================="
