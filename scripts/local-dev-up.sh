#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="${ROOT_DIR}/output/local-dev"
PID_DIR="${LOG_DIR}/pids"

mkdir -p "${LOG_DIR}" "${PID_DIR}"

NPM_RUN="npm"
NODE20_BIN="/usr/local/opt/node@20/bin/node"
NODE20_NPM_CLI="/usr/local/opt/node@20/lib/node_modules/npm/bin/npm-cli.js"
TS_NODE_REGISTER="ts-node/register/transpile-only"
TS_NODE_CJS="TS_NODE_COMPILER_OPTIONS='{\"module\":\"CommonJS\"}'"
if [[ -x "${NODE20_BIN}" && -f "${NODE20_NPM_CLI}" ]]; then
  export PATH="/usr/local/opt/node@20/bin:${PATH}"
  NPM_RUN="${NODE20_BIN} ${NODE20_NPM_CLI}"
fi

export API_TOKEN="${API_TOKEN:-local-dev-token}"
export CORS_ALLOW_ORIGINS="${CORS_ALLOW_ORIGINS:-http://localhost:3002,http://localhost:3003}"

if [[ "${SKIP_DOCKER:-0}" != "1" ]]; then
  export DDB_ENDPOINT="${DDB_ENDPOINT:-http://localhost:8000}"
  export SQS_ENDPOINT="${SQS_ENDPOINT:-http://localhost:4566}"
fi

if [[ "${SKIP_DOCKER:-0}" != "1" ]]; then
  echo "[Local Dev] Starting DynamoDB Local + LocalStack..."
  if ! docker info > /dev/null 2>&1; then
    echo "[Local Dev] Docker daemon is not running. Start Docker Desktop and retry."
    exit 1
  fi
  docker compose -f "${ROOT_DIR}/docker-compose.local.yml" up -d
else
  echo "[Local Dev] Docker skipped. Using AWS endpoints."
fi

echo "[Local Dev] Bootstrapping local table/queue..."
(cd "${ROOT_DIR}" && eval ${TS_NODE_CJS} "${NODE20_BIN}" -r "${TS_NODE_REGISTER}" scripts/local-bootstrap.ts)

echo "[Local Dev] Seeding clients..."
(cd "${ROOT_DIR}" && eval ${TS_NODE_CJS} "${NODE20_BIN}" -r "${TS_NODE_REGISTER}" scripts/seed-clients.ts)

start_service() {
  local name="$1"
  local command="$2"
  local log_file="${LOG_DIR}/${name}.log"
  local pid_file="${PID_DIR}/${name}.pid"

  if [[ -f "${pid_file}" ]]; then
    local existing_pid
    existing_pid="$(cat "${pid_file}")"
    if ps -p "${existing_pid}" > /dev/null 2>&1; then
      echo "[Local Dev] ${name} already running (PID ${existing_pid})"
      return
    fi
  fi

  echo "[Local Dev] Starting ${name}..."
  nohup bash -lc "cd \"${ROOT_DIR}\" && ${command}" > "${log_file}" 2>&1 &
  echo $! > "${pid_file}"
}

start_service "api" "${TS_NODE_CJS} ${NODE20_BIN} -r ${TS_NODE_REGISTER} packages/lambda-api/src/local-server.ts"
start_service "worker" "${TS_NODE_CJS} ${NODE20_BIN} -r ${TS_NODE_REGISTER} packages/lambda-worker/src/local-worker.ts"
start_service "dashboard" "${NPM_RUN} run dev:dashboard"

echo "[Local Dev] Services started."
echo "  - API: http://localhost:3001"
echo "  - Dashboard: http://localhost:3002"
echo "Logs: ${LOG_DIR}"
