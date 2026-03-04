# ============================================================================
# Code quality commands
# ============================================================================

.PHONY: check lint format

check: ## Lint + format in one pass (auto-fix)
	bun run check

lint: ## Lint only (auto-fix)
	bun run lint

format: ## Format only (auto-fix)
	bun run format
