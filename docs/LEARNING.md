# DevOps learning path for BelastingBuddy

BelastingBuddy is a static website (Next.js exported to HTML). That makes it a *good* practice target:
the app is simple, so you can focus on the DevOps tools. Work through the steps **in order**; each one builds on the last.

```
 git push ──► GitHub Actions ──► Docker image ──► GHCR registry (+ copy on Docker Hub)
   (CI: test, lint, scan)      (amd64 + arm64)          │
                                     ▼                  ▼
                     k8s/overlays/prod tag updated   Ansible pulls it to a VM
                                     │                  (Terraform made the VM)
                                     ▼
                                  Argo CD ──► Kubernetes ──► Prometheus ──► Grafana
                                                   └──────► OpenTelemetry Collector
```

| # | Tool | Folder | One-sentence idea |
|---|------|--------|-------------------|
| 1 | Docker | `Dockerfile`, `docker/` | Package the app + its runtime into one portable box (image). |
| 2 | Docker Compose | `docker-compose.yml` | Start several boxes (app, Prometheus, Grafana…) with one command. |
| 3 | GitHub Actions | `.github/workflows/` | Robots that test, build and ship on every `git push`. |
| 4 | Kubernetes | `k8s/` | Keeps N copies of your box running, heals and scales them. |
| 5 | Argo CD | `argocd/` | Watches git and makes the cluster match it (GitOps). |
| 6 | Terraform | `terraform/` | Creates cloud servers from code. |
| 7 | Ansible | `ansible/` | Configures a server from code (install Docker, start the app). |
| 8 | SRE / Observability | `observability/` | Measure (Prometheus), see (Grafana), trace (OpenTelemetry), alert, SLOs. |

---
## Step 0 – clone & one-time prep
```bash
git clone https://github.com/choureydurgesh/belastingbuddy.git
cd belastingbuddy
npm ci                 # exact versions from the committed package-lock.json (reproducible)
npm run lint && npm test && npm run build
```

## Step 1–2 – Docker & Compose (everything local, ~10 min)
```bash
make up                # = docker compose up -d --build
```
- App http://localhost:8080 · Prometheus http://localhost:9090 · Grafana http://localhost:3000 (admin/admin)
- If Grafana/Prometheus say "site can't be reached": the stack isn't running. `docker compose ps` should list 6 services; if it lists nothing, run `make up` again and read its output.
- The container serves the **frontend only**. The `/api` functions (feedback, reminders) run on Cloudflare Pages, so those two features work on the live site, not on localhost.
- Try: `docker compose ps`, `docker compose logs app`, `docker image ls belastingbuddy` (small!), `docker compose down`.
- **Learn:** multi-stage builds, layer caching, non-root user, HEALTHCHECK, volumes, networks (services reach each other by name, e.g. `http://app:8080`).

## Step 3 – GitHub Actions
Compare with the course repo: `ci.yml` uses a **matrix** + **reusable workflow** (`workflow_call`), `pipeline.yml` chains jobs with **needs**, uses **concurrency**, **permissions** and **GITHUB_TOKEN**.
1. Push a branch, open a PR → `CI` runs (tests, ESLint, hadolint, gitleaks, npm audit gate, terraform/k8s/ansible validation).
   - **Layers of static analysis:** `tsc` (types) and ESLint (`npm run lint`, React/Next.js rules) run on every PR and on your laptop; SonarCloud adds deeper analysis and a quality gate.
   - **npm audit gate** (`npm run audit:gate`, `scripts/audit-gate.mjs`): fails on any high/critical advisory except those listed in `.npm-audit-allowlist.json` with a reason and a review date. It also fails once a review date passes or a listed advisory disappears, so exceptions can't be forgotten.
2. Merge to `main` → `Pipeline` runs: CI → build an **amd64 + arm64** image → push to `ghcr.io/choureydurgesh/belastingbuddy:<sha>` (and Docker Hub, see 4) → Trivy scan → commit new tag to `k8s/overlays/prod`. About 2 minutes.
3. After the first push: GitHub → Packages → make the package **public** (so Kubernetes/Ansible can pull without credentials).
4. Optional Docker Hub copy: repo Settings → Secrets and variables → Actions → **Variables** `DOCKERHUB_USERNAME` (your *Docker Hub* username, not GitHub's) and **Secrets** `DOCKERHUB_TOKEN` (Docker Hub access token, Read & Write). Without them the Docker Hub push is skipped.
5. No other setup: GHCR uses the built-in `GITHUB_TOKEN`, and each job asks for the permissions it needs (e.g. `contents: write` for the gitops commit), so the repo's default *read* workflow permissions are fine.
- **Learn:** a reusable workflow can't ask for more permissions than its caller grants – if a called job needs e.g. `pull-requests: read`, the calling job in `pipeline.yml` must grant it too, or the run fails at startup.
- Every step has a `name:`, so the Actions log reads like a checklist instead of showing pinned action SHAs.

## Step 3b – Self-hosted runner on your laptop (showcase)
All normal jobs run on **GitHub-hosted** runners (`runs-on: ubuntu-latest`). To show the other option, `self-hosted-demo.yml` runs lint, tests and build on a runner on **your laptop**:
```bash
make runner-up                          # ephemeral runner in a Linux container (label: laptop)
gh workflow run self-hosted-demo.yml    # or Actions -> "Self-hosted runner demo" -> Run workflow
gh run watch                            # first step prints the laptop's hostname and CPU
make runner-down                        # stop it and remove it from GitHub
```
- **Labels decide where a job runs:** the demo asks for `[self-hosted, linux, laptop]`; everything else asks for `ubuntu-latest`, so normal CI never lands on the laptop.
- **Public repo = be careful:** a self-hosted runner executes whatever the workflow says. The demo is manual-only (no `pull_request`), so code from forks can't run on your machine.
- **Isolation:** the runner runs in Docker with no host folders, no Docker socket, not privileged, 2 CPUs / 4 GB. The image's `runner` user has passwordless `sudo` (workflows often need `apt-get`), so the protection is the **container boundary**, not the user account.
- **How a Linux container runs on a Mac:** macOS can't run Linux containers itself, so Docker Desktop starts a small Linux VM (`docker info` shows kernel `…-linuxkit`). Containers run inside that VM and share its kernel. The image `ghcr.io/actions/actions-runner` is a multi-arch index; on an M-series Mac Docker pulls the `linux/arm64` variant (Ubuntu 24.04 + the runner software in `/home/runner`).

**Do it by hand once** (what `make runner-up` automates):
```bash
# 1. Token: GitHub -> Settings -> Actions -> Runners -> New self-hosted runner -> Linux, ARM64 -> copy the token
# 2. A Linux "machine": a throwaway container from the official image
docker run -it --rm --name bb-runner --cpus 2 --memory 4g ghcr.io/actions/actions-runner:2.338.2 bash
#    inside: whoami (runner), uname -m (aarch64), ls (config.sh run.sh ...), ls /Users (not found: Mac files invisible)
# 3. Register and start
./config.sh --url https://github.com/choureydurgesh/belastingbuddy --token <TOKEN> --name laptop-demo --labels laptop --ephemeral --unattended
./run.sh                                # "Listening for Jobs"; Settings -> Runners shows laptop-demo Idle
# 4. Second terminal: gh workflow run self-hosted-demo.yml ; gh run watch
# 5. After the job the ephemeral runner unregisters and exits; `exit` removes the container (--rm)
```
| By hand | What `scripts/runner.sh` does instead |
|---|---|
| Copy token from the UI | `gh api -X POST repos/…/actions/runners/registration-token` |
| `docker run -it … bash` | `docker run -d` with the image **pinned by digest** |
| Token on the command line | Passed as an env variable, `unset` before `run.sh`, never written to disk |
| Watch the Runners page | Polls the API until the runner is `online` |
| Remove in the UI | `make runner-down` deletes the container and the registration |
- **Ephemeral:** it takes one job, then GitHub removes it and the container exits, so no state leaks between jobs. Run `make runner-up` again for the next one.
- **Hosted vs self-hosted:** hosted = clean VM per job, no maintenance, billed minutes on private repos. Self-hosted = your hardware, network and tools (e.g. reach a private network), but you patch, secure and keep it online. If the laptop is off, the job waits in the queue.

## Step 4 – Kubernetes (local with kind)
Works on Intel and Apple Silicon Macs: the image is multi-arch, so each node pulls its own CPU type.
```bash
make kind-up kind-load
kubectl apply -k k8s/overlays/dev                # will complain about ServiceMonitor until step 8 – that's fine
kubectl -n belastingbuddy-dev get pods,svc,ingress,hpa
kubectl -n belastingbuddy-dev port-forward svc/belastingbuddy 8080:80
```
- **Learn:** Pod vs Deployment vs Service vs Ingress, probes, requests/limits, rolling update (`kubectl set image …` and watch `kubectl rollout status`), self-healing (`kubectl delete pod …`), HPA, PDB, Kustomize overlays.

## Step 5 – Argo CD (GitOps)
```bash
make argocd-install
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d; echo   # password, user: admin
kubectl -n argocd port-forward svc/argocd-server 8443:443     # https://localhost:8443 - keep this terminal open
make argocd-apps       # registers belastingbuddy + kube-prometheus-stack + otel-collector
```
- The password is new on every install. Accept the browser's self-signed certificate warning.
- Argo CD reads this repo **without credentials**, so the repo must be **public**. If the app shows *Unknown* with "authentication required: Repository not found", the repo is private: make it public, or give Argo CD a read-only deploy key.
- **Demo for the interview:** change `replicas` in git → Argo shows *OutOfSync* → syncs by itself. Then `kubectl scale` by hand → Argo **self-heals** it back.

## Step 6 – Terraform
```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars    # edit it
terraform init && terraform plan && terraform apply
terraform destroy                               # when finished – avoids AWS cost!
```
- **Learn:** providers, resources vs data sources, variables/outputs, state (and why remote state), `plan` before `apply`, generated Ansible inventory.
- **In CI** (`.github/workflows/terraform.yml`): until you add the repo secrets `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` and `SSH_PUBLIC_KEY`, the job uses dummy values and only runs `terraform validate`. Add them and `plan` (and manual apply/destroy) switch on by themselves.

## Step 7 – Ansible
```bash
cd ansible
ansible-playbook site.yml --check --diff   # dry run
ansible-playbook site.yml                  # real run; run it twice -> 2nd time shows "changed=0" (idempotent)
```
Needs `ansible-galaxy collection install community.general` for the firewall tasks.

## Step 8 – SRE & Observability
**The 3 pillars:** metrics (Prometheus) · traces (OpenTelemetry) · logs (`docker compose logs`, later Loki).
```bash
make trace           # sends a fake trace; you will see it printed by the collector
```
- Prometheus → Status → Targets (all UP?) → try queries: `rate(nginx_http_requests_total[1m])`, `probe_success`.
- Grafana → Dashboards → BelastingBuddy → *Overview (SRE)*.
- Generate traffic: `for i in $(seq 200); do curl -s localhost:8080/ >/dev/null; done`
- **Break it on purpose:** `docker compose stop app` → within ~1 min the `SiteDown` alert fires (Prometheus → Alerts). Start it again → resolves.
- **SRE words to know:** SLI (what you measure: probe success), SLO (target: 99.9 %), error budget (0.1 % ≈ 43 min/month), burn rate (how fast you spend it – see `ErrorBudgetBurnFast`), toil, runbook, postmortem.

> Honest note: the site is static, so it has no server code that produces traces by itself. The collector pipeline is
> real and working; to get *real* traces you would add the OpenTelemetry JS SDK to the browser app or to the
> Cloudflare Functions in `functions/api/`. That is a good "next step" to mention.

### Runbook: site down
1. Grafana "Site up?" panel red? → `docker compose ps` / `kubectl get pods`.
2. `docker compose logs app` / `kubectl logs deploy/belastingbuddy`.
3. Recent deploy? `kubectl rollout undo deploy/belastingbuddy` (or revert the gitops commit – Argo rolls back).
4. Write a blameless postmortem.

---
## Interview talking points
- **Why GitOps?** Git is the audit log and rollback button; nobody needs cluster credentials in CI.
- **Why GHCR + SHA tags?** GHCR logs in with the per-run `GITHUB_TOKEN`, so there is no long-lived registry password; every running image maps to one commit; no mutable `latest` in prod (prod overlay pins the SHA). The same image is also published to Docker Hub (identical digest) for visibility.
- **Why multi-arch?** One tag holds amd64 and arm64 images, so it runs on cloud VMs, ARM servers and Apple Silicon. The Node build runs natively (`--platform=$BUILDPLATFORM`); only the small nginx stage is emulated.
- **Security (shift-left):** ESLint, hadolint, gitleaks, npm audit gate with documented exceptions, Trivy, non-root container, dropped capabilities, least-privilege `permissions:`, IMDSv2 + encrypted disk in Terraform.
- **Reliability:** 2 replicas, rolling update with maxUnavailable 0, probes, PDB, HPA, SLO-based alerts.
- **Trade-offs you made:** static site on Cloudflare Pages is cheaper/simpler in production; this stack is a *learning* platform. Saying this shows judgement.
- **Next steps:** Loki for logs, real OTel instrumentation, Terraform remote state + OIDC auth, Argo CD image updater, sealed secrets.
