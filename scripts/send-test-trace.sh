#!/usr/bin/env bash
# Sends ONE fake trace to the OpenTelemetry collector over OTLP/HTTP so you can SEE the pipeline work.
# Then find it in Grafana -> Explore -> Tempo  (TraceQL: { resource.service.name = "belastingbuddy-demo" })
# Usage: ./scripts/send-test-trace.sh [collector-url]
set -euo pipefail
URL="${1:-http://localhost:4318}/v1/traces"
SEC=$(date +%s)
NOW=${SEC}000000000
END=${SEC}050000000                       # the span lasts 50 ms
TRACE_ID=$(openssl rand -hex 16)
SPAN_ID=$(openssl rand -hex 8)
curl -sS -X POST "$URL" -H 'Content-Type: application/json' -d "{
  \"resourceSpans\": [{
    \"resource\": {\"attributes\": [{\"key\": \"service.name\", \"value\": {\"stringValue\": \"belastingbuddy-demo\"}}]},
    \"scopeSpans\": [{\"spans\": [{
      \"traceId\": \"$TRACE_ID\",
      \"spanId\": \"$SPAN_ID\",
      \"name\": \"calculate-refund\",
      \"kind\": 1,
      \"startTimeUnixNano\": \"$NOW\",
      \"endTimeUnixNano\": \"$END\"
    }]}]
  }]
}" && echo "trace sent: $TRACE_ID"
