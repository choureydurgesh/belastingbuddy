# Shortcuts so you don't have to remember long commands. Run `make help`.
.PHONY: help up down reset logs traffic trace kind-up kind-load k8s-dev argocd-install argocd-apps tf-plan ansible runner-up runner-status runner-logs runner-down
help:            ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*##' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-16s %s\n", $$1, $$2}'
up:              ## Run app + observability stack locally (Prometheus, Grafana, Loki, Tempo, OTel, Alertmanager)
	docker compose up -d --build
down:            ## Stop everything (data is kept)
	docker compose down
reset:           ## Stop everything AND delete all stored metrics, logs and traces
	docker compose down -v
logs:            ## Follow logs
	docker compose logs -f
traffic:         ## 60s of demo traffic (MODE=errors to trigger HighErrorRate)
	./scripts/traffic.sh $(or $(MODE),normal) $(or $(SECS),60)
trace:           ## Send one hand-made test trace (find it in Grafana -> Explore -> Tempo)
	./scripts/send-test-trace.sh && docker compose logs --tail=10 otel-collector
kind-up:         ## Create a local Kubernetes cluster (needs kind)
	kind create cluster --name bb
kind-load:       ## Build image and load it into kind (no registry needed)
	docker build -t belastingbuddy:local . && kind load docker-image belastingbuddy:local --name bb
k8s-dev:         ## Deploy the dev overlay (without ServiceMonitor CRD -> install monitoring first or ignore that error)
	kubectl apply -k k8s/overlays/dev
argocd-install:  ## Install Argo CD into the cluster
	kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -
	kubectl apply -n argocd --server-side -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
argocd-apps:     ## Tell Argo CD what to deploy (GitOps)
	kubectl apply -f argocd/
tf-plan:         ## Preview cloud infrastructure
	cd terraform && terraform init && terraform plan
ansible:         ## Configure the server and deploy
	cd ansible && ansible-playbook site.yml
runner-up:       ## Start a self-hosted GitHub Actions runner on this laptop (Docker, ephemeral)
	./scripts/runner.sh up
runner-status:   ## Show the self-hosted runner (container + GitHub)
	./scripts/runner.sh status
runner-logs:     ## Follow the self-hosted runner's log
	./scripts/runner.sh logs
runner-down:     ## Stop the self-hosted runner and remove it from GitHub
	./scripts/runner.sh down
