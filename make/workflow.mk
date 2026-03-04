# ============================================================================
# Workflow commands
# ============================================================================

DOCKER_COMPOSE := docker compose

.PHONY: dev dev-fresh dev-reset ci pre-push

dev: ## Start dev environment with logs
	$(DOCKER_COMPOSE) build
	$(DOCKER_COMPOSE) up -d
	$(DOCKER_COMPOSE) logs -f app

dev-fresh: ## Clean rebuild from scratch
	$(DOCKER_COMPOSE) down -v --remove-orphans
	$(DOCKER_COMPOSE) build --no-cache
	$(DOCKER_COMPOSE) up -d

dev-reset: ## Restart dev keeping data
	$(DOCKER_COMPOSE) down
	$(DOCKER_COMPOSE) up -d

ci: ## Run CI pipeline (check + test)
	bun run check
	bun run test

pre-push: ## Run before pushing (check + test)
	bun run check
	bun run test
