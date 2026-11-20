# Following "observability-for-devops" with BelastingBuddy

This stack mirrors the tutorial at
[LondheShubham153/observability-for-devops](https://github.com/LondheShubham153/observability-for-devops)
(`LEARN.md`), with **our app in place of its notes app**. Read its `LEARN.md` for the
concepts, and use this page for the commands and queries that work here.

## What is the same, what is different

| Tutorial | Here | Notes |
|---|---|---|
| `docker compose up -d --build` | `make up` | Same thing |
| `./scripts/traffic.sh [normal\|errors] [s]` | `make traffic` or `./scripts/traffic.sh [normal\|errors] [s]` | Hits our pages; `errors` mode hits `/nope-*` (404) |
| Notes app on `:8000` (Django) | BelastingBuddy on **`:8080`** (nginx, static site) | |
| Auto-instrumented Python app sends OTLP | **nginx's OTel module** sends a span per request | Turned on by `observability/nginx/otel.conf` (Compose only) |
| App logs via OTel SDK | nginx **JSON access log** with `trace_id`, tailed by the collector (`filelog`) | Same result in Loki |
| App metrics `http_server_duration_milliseconds_*` | **`traces_span_metrics_*`**, built from the spans by the collector's `spanmetrics` connector | Same labels idea, see below |
| `exported_job="notes-app"` / `service_name="notes-app"` | `exported_job="belastingbuddy"` / **`service_name="belastingbuddy"`** | |
| cAdvisor on `:8080` | cAdvisor on **`:8081`** | 8080 is our app |
| Grafana opens on "Start Here" | Opens on **Overview (SRE)**; the tutorial's RED/logs/traces views are in **RED, logs & traces** | Plus our blackbox SLO panels |
| Alerts `TargetDown`, `HighErrorRate` | Same two, **plus** our `SiteDown`, `ErrorBudgetBurnFast`, `SlowResponses`, `NginxExporterDown` | |
| Prometheus, Alertmanager, Loki, Tempo, Grafana, node-exporter, cAdvisor, collector | Same images and versions | |
| Not in the tutorial | blackbox exporter, nginx-exporter | Our SLI for the 99.9% SLO |

URLs: Grafana http://localhost:3000 · Prometheus http://localhost:9090 · Alertmanager
http://localhost:9093 · cAdvisor http://localhost:8081 · Loki http://localhost:3100 (API).

> Grafana login: `admin` / `admin` on a **fresh** volume. If you changed the password before,
> it is kept in the `grafana-data` volume. Forgot it? `make reset` wipes all data (also
> metrics, logs and traces) and starts from scratch.

## Section by section

### 2. Start it
```bash
make up
make traffic          # 60 s of mixed traffic (pages + a few 404s)
```
Wait ~30 s (spans are turned into metrics every 15 s, then scraped every 15 s).

### 3. Metrics with PromQL (Explore → Prometheus)
```promql
up
sum(rate(traces_span_metrics_calls_total{service_name="belastingbuddy"}[1m]))
sum by (http_status_code) (rate(traces_span_metrics_calls_total{service_name="belastingbuddy"}[1m]))
histogram_quantile(0.95, sum by (le) (rate(traces_span_metrics_duration_milliseconds_bucket{service_name="belastingbuddy"}[1m])))
100 - avg(rate(node_cpu_seconds_total{mode="idle"}[1m])) * 100
topk(3, container_memory_usage_bytes{id=~"/docker/.+"})
```
Our own (not in the tutorial): `rate(nginx_http_requests_total[1m])`, `probe_success`,
`sli:availability:ratio_5m`.

> p95 latency is tiny (≈1 ms): nginx serves files from memory. That is real, not a bug.
> `span_name` is nginx's `location` (`/`, `/_next/static/`), not the URL, so the number of
> series stays small even when someone requests a million random URLs.

**Metric types in our stack:** counter `traces_span_metrics_calls_total`, `nginx_http_requests_total`;
gauge `nginx_connections_active`, `probe_success`; histogram `traces_span_metrics_duration_milliseconds_bucket`;
summary `go_gc_duration_seconds{job="prometheus"}`.

### 4. Logs with LogQL (Explore → Loki)
```logql
{service_name="belastingbuddy"}
{service_name="belastingbuddy"} |= "404"
{service_name="belastingbuddy"} | detected_level="warn"
{service_name="belastingbuddy"} | status >= 400
sum(count_over_time({service_name="belastingbuddy"}[1m]))
sum by (status) (count_over_time({service_name="belastingbuddy"} [5m]))
```
Levels come from the HTTP status: 5xx = error, 4xx = warn, the rest info. Each JSON field
(`method`, `uri`, `status`, `duration_s`, `user_agent`, …) is searchable.

### 5. Traces with TraceQL (Explore → Tempo → TraceQL)
```traceql
{ resource.service.name = "belastingbuddy" }
{ resource.service.name = "belastingbuddy" && span.http.status_code >= 400 }
{ span.http.target = "/guides/box-3/" }
{ resource.service.name = "belastingbuddy" && span.http.status_code = 404 }
```
A trace here is **one span** (nginx answers from disk, there is nothing downstream). The
tutorial's app has child spans for the database; ours doesn't have a database.
`make trace` sends a hand-made trace as service `belastingbuddy-demo`.

### 6. Jump between signals
1. `curl -s localhost:8080/guides/box-3/ >/dev/null`
2. Explore → Tempo → `{ span.http.target = "/guides/box-3/" }` → open a trace.
3. Click the span → **Logs for this span** → the exact access-log line of that request.
4. The other way round: in Loki, open a log line → **View trace** (next to `trace_id`).

Works because nginx writes `$otel_trace_id` into each log line, the collector puts it on
the log record, and the datasources (`grafana/provisioning/datasources/datasources.yml`)
are told how to link them.

### 7. Alerting
```bash
./scripts/traffic.sh errors 150    # HighErrorRate: pending after ~45 s, firing within ~2 min
./scripts/traffic.sh normal 120    # ... and it resolves
docker compose stop node-exporter  # TargetDown fires within ~1 min
docker compose start node-exporter
docker compose stop app            # our SiteDown fires after ~1 min (NginxExporterDown after ~2)
docker compose start app
```
Watch http://localhost:9090/alerts and http://localhost:9093. The *Firing alerts* tile on
**RED, logs & traces** turns red.

Challenge from the tutorial (p95 above 100 ms) with our metric:
```yaml
- alert: SlowP95
  expr: histogram_quantile(0.95, sum by (le) (rate(traces_span_metrics_duration_milliseconds_bucket{service_name="belastingbuddy"}[5m]))) > 100
  for: 2m
```
Add it to `prometheus/alerts.yml`, then `docker compose restart prometheus`.

### 8. How the pipeline is wired
- `Dockerfile`: installs `nginx-module-otel` and loads it, **off** by default (Kubernetes is unchanged).
- `nginx/otel.conf` (mounted by Compose): `otel_trace on`, exporter → `otel-collector:4317`, JSON access log with trace IDs.
- `otel/otel-collector.yaml`: receivers (`otlp`, `filelog/nginx`) → processors → exporters
  (`otlp_grpc/tempo`, `otlp_http/loki`, `prometheus`) and the `spanmetrics` connector.

### 9. Add your own telemetry
Our app has no server code in these containers (the `/api` runs on Cloudflare Pages), so
the tutorial's Python example has nowhere to go. Two ways to practise anyway:
- Send OTLP by hand: `scripts/send-test-trace.sh` shows the JSON format; change the span
  name/attributes and find it with TraceQL.
- Run the tutorial's Python snippet locally with
  `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 OTEL_SERVICE_NAME=my-app opentelemetry-instrument python app.py`:
  our collector accepts it and routes it like everything else.

### 10. Troubleshooting (ours)
| Symptom | Fix |
|---|---|
| RED panels empty | `make traffic`, wait ~30 s |
| `HighErrorRate` never fires | It needs **more than 50 %** failing requests for a full minute. Other traffic at the same time (a browser tab, another loop) dilutes it: stop that, or run `errors` longer |
| No new traces while the collector was down | nginx keeps serving; spans from that time are dropped. Nothing to fix |
| Loki shows nothing | The collector only reads **new** lines (`start_at: end`). Send traffic after it started |
| Grafana password rejected | It's stored in the volume; `make reset` (deletes all data) |
| Old/odd data after upgrading | `make reset` |
