# ============================================================================
# Database commands
# ============================================================================

# ── Prisma ─────────────────────────────────────────────────────────────────

.PHONY: db-generate db-push db-reset db-studio

db-generate: ## Regenerate Prisma client
	bunx prisma generate

db-push: ## Push schema to dev DB
	bunx prisma db push

db-reset: ## Reset dev DB (WARNING: destroys data)
	@echo "WARNING: This will destroy all data in the dev database!"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	bunx prisma db push --force-reset

db-studio: ## Open Prisma Studio
	bunx prisma studio

# ── Database shells ────────────────────────────────────────────────────────

.PHONY: db-shell db-logs

db-shell: ## Access PostgreSQL shell
	docker compose exec postgres psql -U postgres -d inviduality_dev

db-logs: ## Follow PostgreSQL logs
	docker compose logs -f postgres
