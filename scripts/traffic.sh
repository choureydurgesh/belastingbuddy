#!/usr/bin/env bash
# Generate traffic against the app so dashboards, traces and logs have something to show.
#
# Usage:  ./scripts/traffic.sh [normal|errors] [seconds]
#   normal  (default)  real pages + static assets, and the occasional 404
#   errors             mostly 404s, enough to trigger the HighErrorRate alert
#
# Override the target with:  APP=http://host:8080 ./scripts/traffic.sh
set -uo pipefail

MODE="${1:-normal}"
SECONDS_TO_RUN="${2:-60}"
APP="${APP:-http://localhost:8080}"

if [ "$MODE" != "normal" ] && [ "$MODE" != "errors" ]; then
  echo "Usage: $0 [normal|errors] [seconds]" >&2
  exit 1
fi

if ! curl -fs -o /dev/null --max-time 3 "$APP/healthz"; then
  echo "Cannot reach $APP. Is the stack up?  make up" >&2
  exit 1
fi

PAGES=(/ /guides/ /guides/30-percent-ruling/ /guides/box-3/ /guides/m-form/ /privacy/ /return/ /robots.txt /sitemap.xml)

echo "Sending '$MODE' traffic to $APP for ${SECONDS_TO_RUN}s (Ctrl+C to stop)..."

end=$(( $(date +%s) + SECONDS_TO_RUN ))
count=0
while [ "$(date +%s)" -lt "$end" ]; do
  if [ "$MODE" = "errors" ]; then
    # 4 failing requests for every good one
    for _ in 1 2 3 4; do curl -s -o /dev/null "$APP/nope-$RANDOM"; done
    curl -s -o /dev/null "$APP/"
    count=$(( count + 5 ))
  else
    curl -s -o /dev/null "$APP${PAGES[$(( RANDOM % ${#PAGES[@]} ))]}"
    curl -s -o /dev/null "$APP${PAGES[$(( RANDOM % ${#PAGES[@]} ))]}"
    curl -s -o /dev/null "$APP/"
    # one 404 in every 5 rounds
    if [ $(( count % 5 )) -eq 0 ]; then
      curl -s -o /dev/null "$APP/does-not-exist"
    fi
    count=$(( count + 3 ))
  fi
  sleep 0.5
done

echo "Done: about $count requests sent. Metrics, traces and logs show up in Grafana within ~30s."
