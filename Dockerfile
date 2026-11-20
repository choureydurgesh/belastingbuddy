# =============================================================================
# DOCKER CONCEPT: multi-stage build
#   Stage 1 ("build")  -> has Node + all dev tools, turns the source into static files
#   Stage 2 ("runtime")-> tiny nginx image that ONLY contains the finished files
# Result: final image is ~50 MB instead of ~1 GB, and has no build tools an attacker could use.
# =============================================================================

# ---------- Stage 1: build the static site ----------
# --platform=$BUILDPLATFORM: run this stage natively on the build machine, even when
# building an arm64 image on an amd64 runner. Its output (static HTML/JS) is the same
# for every CPU, so there is no need to emulate Node.
FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /app

# Copy ONLY the dependency files first. Docker caches each step ("layer"),
# so `npm ci` is re-run only when package*.json change, not on every code edit.
COPY package.json package-lock.json ./
# `npm ci` installs the exact versions in the lockfile (reproducible).
# --ignore-scripts stops dependencies from running their own install scripts during the build.
RUN npm ci --ignore-scripts

# Now copy the source code and build. next.config.ts has output:"export",
# so this produces plain HTML/CSS/JS in the /app/out folder.
COPY . .
RUN npm run build

# ---------- Stage 2: serve it with nginx ----------
# "nginx-unprivileged" runs as a NON-root user on port 8080 (required by many
# Kubernetes security policies, and good practice anyway).
# 1.30 = nginx's current *stable* line.
FROM nginxinc/nginx-unprivileged:1.30-alpine AS runtime

# The base image is only rebuilt every few weeks, so security fixes released since then
# are missing (Trivy flags them). Install them on every build, then switch back to the
# image's non-root user (uid 101):
#  - Alpine's own repos: OS packages (openssl, busybox, ...)
#  - nginx itself from nginx.org's repo (signed; the image already trusts its key). The base
#    image pins the exact version (nginx=1.30.6-r1), so `apk upgrade` alone keeps it; "<1.31"
#    takes the newest 1.30.x patch but never jumps to a new release line. Example: 1.30.7
#    fixed 6 HIGH/CRITICAL CVEs on 18 Nov 2026, before the base image was rebuilt with it.
#  - the optional nginx modules (geoip, image-filter, njs, xslt) are removed: our config
#    loads none of them, and code that isn't there can't have CVEs.
#  - except nginx's official OpenTelemetry module (ngx_otel_module), same repo and version as
#    nginx. It is LOADED but OFF: no otel_* directive is in the image's config, so in
#    Kubernetes nothing changes. Docker Compose mounts observability/nginx/otel.conf, which
#    turns tracing on (every request -> a span -> Tempo) and writes JSON access logs that
#    carry the trace_id to /var/log/nginx/otel/ (picked up by the collector -> Loki).
USER root
# DL3018 reviewed: "nginx<1.31" IS a pin (to the 1.30 line); an exact version would need a
# bump for every patch and would downgrade nginx once the base image ships a newer one.
# hadolint ignore=DL3018
RUN apk del --no-cache nginx-module-geoip nginx-module-image-filter nginx-module-njs nginx-module-xslt \
 && apk upgrade --no-cache \
 && apk add --no-cache --upgrade \
      --repository "https://nginx.org/packages/alpine/v$(cut -d. -f1,2 /etc/alpine-release)/main" \
      "nginx<1.31" "nginx-module-otel<1.31" \
 && rm /usr/lib/nginx/modules/ngx_otel_module-debug.so \
 && sed -i '1i load_module modules/ngx_otel_module.so;' /etc/nginx/nginx.conf \
 && install -d -o 101 -g 0 -m 755 /var/log/nginx/otel
USER 101

# Our own nginx config: caching headers, /healthz and /stub_status (metrics).
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy ONLY the built site from stage 1 - nothing else comes along.
COPY --from=build /app/out /usr/share/nginx/html

EXPOSE 8080

# Docker will mark the container "unhealthy" if this fails (docker ps shows it).
# JSON ("exec") form; `|| exit 1` maps any wget error to 1, the code Docker reads as unhealthy.
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD ["sh", "-c", "wget -q --spider http://127.0.0.1:8080/healthz || exit 1"]
