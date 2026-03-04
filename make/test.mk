# ============================================================================
# Testing commands
# ============================================================================

.PHONY: test test-watch test-integration test-e2e test-all test-file

test: ## Run unit tests
	bun run test

test-watch: ## Run unit tests in watch mode
	bun run test -- --watch

test-integration: ## Run integration tests (Docker required)
	bun run test:integration

test-e2e: ## Run E2E tests (Docker required)
	bun run test:e2e

test-all: ## Run all tests
	bun run test
	bun run test:integration
	bun run test:e2e

test-file: ## Run specific test file (FILE=path)
	bun run test -- --testPathPattern=$(FILE)
