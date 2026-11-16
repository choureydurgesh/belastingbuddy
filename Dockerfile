# =============================================================================
# DOCKER CONCEPT: multi-stage build
#   Stage 1 ("build")  -> has Node + all dev tools, turns the source into static files
#   Stage 2 ("runtime")-> tiny nginx image that ONLY contains the finished files
# Result: final image is ~50 MB instead of ~1 GB, and has no build tools an attacker could use.
# =============================================================================

# ---------- Stage 1: build the static site ----------
FROM node:22-alpine AS build
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
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

# Our own nginx config: caching headers, /healthz and /stub_status (metrics).
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy ONLY the built site from stage 1 - nothing else comes along.
COPY --from=build /app/out /usr/share/nginx/html

EXPOSE 8080

# Docker will mark the container "unhealthy" if this fails (docker ps shows it).
# JSON ("exec") form; `|| exit 1` maps any wget error to 1, the code Docker reads as unhealthy.
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD ["sh", "-c", "wget -q --spider http://127.0.0.1:8080/healthz || exit 1"]
