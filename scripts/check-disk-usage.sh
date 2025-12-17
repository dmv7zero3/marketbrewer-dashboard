#!/usr/bin/env bash
set -euo pipefail

THRESHOLD=${1:-80}
shift || true

# Default paths to check if not provided
PATHS=("/data" "/var/lib/marketbrewer")
if [[ $# -gt 0 ]]; then
  PATHS=("$@")
fi

exceeded=0

printf "Checking disk usage (threshold=%s%%)\n" "$THRESHOLD"
for p in "${PATHS[@]}"; do
  if [[ -d "$p" ]]; then
    # Use POSIX output format, get Used% column and strip %
    used_pct=$(df -P "$p" | awk 'NR==2{gsub("%", "", $5); print $5}')
    printf "%s: %s%% used\n" "$p" "$used_pct"
    if [[ "$used_pct" -ge "$THRESHOLD" ]]; then
      printf "WARNING: %s usage %s%% exceeds threshold %s%%\n" "$p" "$used_pct" "$THRESHOLD" >&2
      exceeded=1
    fi
  else
    printf "SKIP: %s does not exist\n" "$p"
  fi
done

exit "$exceeded"
