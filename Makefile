# =============================================================================
# Makefile for Backend NestJS Application (Docker-first)
# =============================================================================

SHELL := /bin/bash

# -----------------------------------------------------------------------------
# Docker Compose Configuration
# -----------------------------------------------------------------------------
DOCKER_COMPOSE := docker compose

# -----------------------------------------------------------------------------
# Colors
# -----------------------------------------------------------------------------
BOLD := \033[1m
RESET := \033[0m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
BLUE := \033[34m
CYAN := \033[36m

# -----------------------------------------------------------------------------
# Default Target
# -----------------------------------------------------------------------------
.DEFAULT_GOAL := help

.PHONY: help
help: ## Show this help message
	@echo -e "$(BOLD)$(CYAN)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(RESET)"
	@echo -e "$(BOLD)  Backend NestJS Application Commands$(RESET)"
	@echo -e "$(BOLD)$(CYAN)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(RESET)"
	@echo ""
	@echo -e "$(BOLD)$(YELLOW)Docker & Environment:$(RESET)"
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' make/docker.mk | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(BLUE)%-22s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo -e "$(BOLD)$(YELLOW)Code Quality:$(RESET)"
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' make/quality.mk | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(BLUE)%-22s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo -e "$(BOLD)$(YELLOW)Testing:$(RESET)"
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' make/test.mk | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(BLUE)%-22s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo -e "$(BOLD)$(YELLOW)Database:$(RESET)"
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' make/database.mk | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(BLUE)%-22s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo -e "$(BOLD)$(YELLOW)Utilities:$(RESET)"
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' make/utils.mk | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(BLUE)%-22s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo -e "$(BOLD)$(YELLOW)Workflows:$(RESET)"
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' make/workflow.mk | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(BLUE)%-22s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo -e "$(BOLD)$(CYAN)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(RESET)"
	@echo -e "  $(BOLD)Tip:$(RESET) Use $(CYAN)make <command>$(RESET) to run a command"
	@echo -e "$(BOLD)$(CYAN)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(RESET)"

# -----------------------------------------------------------------------------
# Include Modular Makefiles
# -----------------------------------------------------------------------------
include make/docker.mk
include make/database.mk
include make/quality.mk
include make/test.mk
include make/utils.mk
include make/workflow.mk
