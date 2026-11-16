#!/usr/bin/env bash
# Sends ONE fake trace to the OpenTelemetry collector over OTLP/HTTP so you can SEE the pipeline work.
# Then run:  docker compose logs otel-collector | tail -40
# Usage: ./scripts/send-test-trace.sh [collector-url]
set -euo pipefail
URL="${1:-http://localhost:4318}/v1/traces"
NOW=$(date +%s)000000000
curl -sS -X POST "$URL" -H 'Content-Type: application/json' -d "{
  \"resourceSpans\": [{
    \"resource\": {\"attributes\": [{\"key\": \"service.name\", \"value\": {\"stringValue\": \"belastingbuddy-demo\"}}]},
    \"scopeSpans\": [{\"spans\": [{
      \"traceId\": \"5b8efff798038103d269b633813fc60c\",
      \"spanId\": \"eee19b7ec3c1b174\",
      \"name\": \"calculate-refund\",
      \"kind\": 1,
      \"startTimeUnixNano\": \"$NOW\",
      \"endTimeUnixNano\": \"$NOW\"
    }]}]
  }]
}" && echo "trace sent"
