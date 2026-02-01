#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="${ROOT_DIR}/output/local-dev"
PID_DIR="${LOG_DIR}/pids"

stop_service() {
  local name="$1"
  local pid_file="${PID_DIR}/${name}.pid"

  if [[ -f "${pid_file}" ]]; then
    local pid
    pid="$(cat "${pid_file}")"
    if ps -p "${pid}" > /dev/null 2>&1; then
      echo "[Local Dev] Stopping ${name} (PID ${pid})..."
      kill "${pid}" || true
    fi
    rm -f "${pid_file}"
  else
    echo "[Local Dev] ${name} not running"
  fi
}

stop_service "dashboard"
stop_service "worker"
stop_service "api"

if [[ "${SKIP_DOCKER:-0}" != "1" ]]; then
  echo "[Local Dev] Stopping Docker services..."
  docker compose -f "${ROOT_DIR}/docker-compose.local.yml" down
fi

echo "[Local Dev] Done."
