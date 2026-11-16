# DevOps learning path for BelastingBuddy

BelastingBuddy is a static website (Next.js exported to HTML). That makes it a *good* practice target:
the app is simple, so you can focus on the DevOps tools. Work through the steps **in order**; each one builds on the last.

```
 git push ──► GitHub Actions ──► Docker image ──► GHCR registry
   (CI: test, lint, scan)            │                  │
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
npm test && npm run build
```

## Step 1–2 – Docker & Compose (everything local, ~10 min)
```bash
make up                # = docker compose up -d --build
```
- App http://localhost:8080 · Prometheus http://localhost:9090 · Grafana http://localhost:3000 (admin/admin)
- Try: `docker compose ps`, `docker compose logs app`, `docker image ls belastingbuddy` (small!), `docker compose down`.
- **Learn:** multi-stage builds, layer caching, non-root user, HEALTHCHECK, volumes, networks (services reach each other by name, e.g. `http://app:8080`).

## Step 3 – GitHub Actions
Compare with the course repo: `ci.yml` uses a **matrix** + **reusable workflow** (`workflow_call`), `pipeline.yml` chains jobs with **needs**, uses **concurrency**, **permissions** and **GITHUB_TOKEN**.
1. Push a branch, open a PR → `CI` runs (tests, hadolint, gitleaks, npm audit, terraform/k8s/ansible validation).
2. Merge to `main` → `Pipeline` runs: CI → build image → push to `ghcr.io/choureydurgesh/belastingbuddy:<sha>` → Trivy scan → commit new tag to `k8s/overlays/prod`.
3. After the first push: GitHub → Packages → make the package **public** (so Kubernetes/Ansible can pull without credentials).
4. Repo Settings → Actions → General → Workflow permissions → **Read and write** (needed for the gitops commit).

## Step 4 – Kubernetes (local with kind)
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
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d
kubectl -n argocd port-forward svc/argocd-server 8443:443     # https://localhost:8443  user: admin
make argocd-apps       # registers belastingbuddy + kube-prometheus-stack + otel-collector
```
- **Demo for the interview:** change `replicas` in git → Argo shows *OutOfSync* → syncs by itself. Then `kubectl scale` by hand → Argo **self-heals** it back.

## Step 6 – Terraform
```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars    # edit it
terraform init && terraform plan && terraform apply
terraform destroy                               # when finished – avoids AWS cost!
```
- **Learn:** providers, resources vs data sources, variables/outputs, state (and why remote state), `plan` before `apply`, generated Ansible inventory.

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
- **Why GHCR + SHA tags?** No extra secrets; every running image maps to one commit; no mutable `latest` in prod (prod overlay pins the SHA).
- **Security (shift-left):** hadolint, gitleaks, npm audit, Trivy, non-root container, dropped capabilities, least-privilege `permissions:`, IMDSv2 + encrypted disk in Terraform.
- **Reliability:** 2 replicas, rolling update with maxUnavailable 0, probes, PDB, HPA, SLO-based alerts.
- **Trade-offs you made:** static site on Cloudflare Pages is cheaper/simpler in production; this stack is a *learning* platform. Saying this shows judgement.
- **Next steps:** Loki for logs, real OTel instrumentation, Terraform remote state + OIDC auth, Argo CD image updater, sealed secrets.
