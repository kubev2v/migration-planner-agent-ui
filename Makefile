# Migration Planner UI Makefile

# Show help
.PHONY: help
help:
	@echo "Migration Planner UI Makefile"
	@echo ""
	@echo "Available targets:"
	@echo "  install   Install agent UI dependencies"
	@echo "  run     Start the agent UI dev server"
	@echo "  help          Show this help message"

.PHONY: install run

install:
	@echo "📦 Installing agent UI dependencies..."
	@if command -v yarn >/dev/null 2>&1; then \
		yarn install; \
	else \
		echo "❌ Error: yarn is required. Install with: npm install -g yarn"; \
		exit 1; \
	fi

run:
	@echo ""
	@echo "Agent UI: http://localhost:3001"
	@echo ""
	cd apps/agent-ui && yarn start

# Default target to show help
.DEFAULT_GOAL := help
