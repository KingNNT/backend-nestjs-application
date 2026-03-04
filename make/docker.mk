# ============================================================================
# Docker Compose commands
# ============================================================================

DOCKER_COMPOSE := docker compose

# ── Development ────────────────────────────────────────────────────────────

.PHONY: build up down restart rebuild up-logs status logs logs-app logs-all start stop

build: ## Build dev Docker images
	$(DOCKER_COMPOSE) build

up: ## Start dev services
	$(DOCKER_COMPOSE) up -d

down: ## Stop all dev services
	$(DOCKER_COMPOSE) down

restart: ## Restart dev services
	$(DOCKER_COMPOSE) restart

rebuild: ## Rebuild and start dev services
	$(DOCKER_COMPOSE) down
	$(DOCKER_COMPOSE) build
	$(DOCKER_COMPOSE) up -d

up-logs: ## Start dev services with logs
	$(DOCKER_COMPOSE) up

status: ## Show service status
	$(DOCKER_COMPOSE) ps

logs: ## Follow app logs
	$(DOCKER_COMPOSE) logs -f app

logs-app: logs ## Alias for logs

logs-all: ## Follow all service logs
	$(DOCKER_COMPOSE) logs -f

start: up ## Alias for up
stop: down ## Alias for down
