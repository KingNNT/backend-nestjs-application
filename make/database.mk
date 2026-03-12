# ============================================================================
# Database commands
# ============================================================================

# ── Drizzle ──────────────────────────────────────────────────────────────

.PHONY: db-generate db-migrate db-push db-studio

db-generate: ## Generate migration SQL from schema changes
	bunx drizzle-kit generate

db-migrate: ## Apply migrations to DB
	bunx drizzle-kit migrate

db-push: ## Push schema to dev DB (no migration files)
	bunx drizzle-kit push

db-studio: ## Open Drizzle Studio
	bunx drizzle-kit studio

# ── Database shells ────────────────────────────────────────────────────────

.PHONY: db-shell db-logs

db-shell: ## Access PostgreSQL shell
	docker compose exec postgres psql -U postgres -d inviduality_dev

db-logs: ## Follow PostgreSQL logs
	docker compose logs -f postgres
