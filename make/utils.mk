# ============================================================================
# Utility commands
# ============================================================================

.PHONY: install shell clean clean-volumes clean-all health

install: ## Install dependencies
	bun install

shell: ## Access shell in app container
	docker compose exec app sh

clean: ## Remove containers and local images
	docker compose down --rmi local --remove-orphans

clean-volumes: ## Remove containers, images, and volumes (WARNING: destroys data)
	@echo "WARNING: This will destroy all data volumes!"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	docker compose down -v --rmi local --remove-orphans

clean-all: ## Deep clean everything (WARNING)
	@echo "WARNING: This will destroy all containers, images, and volumes!"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	docker compose down -v --rmi all --remove-orphans
	rm -rf node_modules dist coverage

health: ## Check app health
	@curl -sf http://localhost:3000/health 2>/dev/null && echo "OK" || echo "NOT REACHABLE"
