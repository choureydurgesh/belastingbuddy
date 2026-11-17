#!/usr/bin/env bash
# Self-hosted GitHub Actions runner on this laptop, inside a Linux Docker container.
# Showcase only: the real CI and Pipeline keep running on GitHub-hosted runners.
#
#   ./scripts/runner.sh up       register an EPHEMERAL runner (label "laptop") and start it
#   ./scripts/runner.sh status   show the container and the runner as GitHub sees it
#   ./scripts/runner.sh logs     follow the runner's log
#   ./scripts/runner.sh down     stop it and remove its registration from GitHub
#
# Why a container: the jobs expect Linux (like ubuntu-latest), and the job can't see your
# files - nothing from the Mac is mounted and there is no Docker socket inside.
# Why ephemeral: the runner takes ONE job, then GitHub removes it and the container exits,
# so nothing from one job is left for the next. Run `up` again for another job.
# Needs: Docker running, and `gh` logged in with admin rights on the repo.
set -euo pipefail

REPO="${REPO:-choureydurgesh/belastingbuddy}"
NAME="${RUNNER_NAME:-laptop-demo}"
CONTAINER="bb-runner"
# Official image from github.com/actions/runner, pinned by digest (tag 2.338.2, amd64 + arm64)
IMAGE="ghcr.io/actions/actions-runner:2.338.2@sha256:6d0b2d80d80f143f77dcb676e50920100bbb547e39e883454d57f45ab8c31300"

runner_id() {
  gh api "repos/$REPO/actions/runners" --jq ".runners[] | select(.name == \"$NAME\") | .id"
}

case "${1:-}" in
  up)
    if docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
      echo "Runner is already running. './scripts/runner.sh status' or 'down'."; exit 0
    fi
    # Short-lived (1 hour) registration token. It goes to the container as an env variable,
    # not as a command-line argument, and is never written to disk here.
    RUNNER_TOKEN="$(gh api -X POST "repos/$REPO/actions/runners/registration-token" --jq .token)"
    export RUNNER_TOKEN REPO NAME
    docker run -d --rm --name "$CONTAINER" \
      --cpus 2 --memory 4g \
      -e RUNNER_TOKEN -e REPO -e NAME \
      "$IMAGE" \
      bash -c './config.sh --url "https://github.com/$REPO" --token "$RUNNER_TOKEN" --name "$NAME" \
                 --labels laptop --ephemeral --unattended --replace --disableupdate \
               && unset RUNNER_TOKEN && ./run.sh' >/dev/null
    echo "Starting runner '$NAME' (labels: self-hosted, Linux, $(uname -m | sed 's/arm64/ARM64/;s/x86_64/X64/'), laptop)..."
    for _ in $(seq 30); do
      status="$(gh api "repos/$REPO/actions/runners" --jq ".runners[] | select(.name == \"$NAME\") | .status" 2>/dev/null || true)"
      [ "$status" = "online" ] && { echo "Runner is online. Start the demo: gh workflow run self-hosted-demo.yml"; exit 0; }
      sleep 2
    done
    echo "Runner did not come online in 60 s. Check: ./scripts/runner.sh logs"; exit 1
    ;;
  status)
    docker ps --filter "name=^${CONTAINER}$" --format 'container: {{.Names}} {{.Status}}' | grep . || echo "container: not running"
    gh api "repos/$REPO/actions/runners" --jq '.runners[] | "github:    \(.name) \(.status) busy=\(.busy) labels=\([.labels[].name] | join(","))"' | grep . || echo "github:    no self-hosted runners registered"
    ;;
  logs)
    docker logs -f "$CONTAINER"
    ;;
  down)
    docker stop "$CONTAINER" >/dev/null 2>&1 && echo "container stopped" || echo "container was not running"
    id="$(runner_id || true)"
    if [ -n "$id" ]; then gh api -X DELETE "repos/$REPO/actions/runners/$id" && echo "runner '$NAME' removed from GitHub"; else echo "no registration left on GitHub"; fi
    ;;
  *)
    sed -n '2,15p' "$0" | sed 's/^# \{0,1\}//'; exit 1
    ;;
esac
