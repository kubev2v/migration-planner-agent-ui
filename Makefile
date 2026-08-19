# Migration Planner UI Makefile

# Show help
.PHONY: help
help:
	@echo "Migration Planner UI Makefile"
	@echo ""
	@echo "Available targets:"
	@echo "  build         Build agent UI dependencies"
	@echo "  run           Start the agent UI dev server"
	@echo "  stop          Stop the agent UI dev server"
	@echo "  build-local   Install agent UI dependencies"
	@echo "  run-local     Start the agent UI dev server"
	@echo "  stop-local    Stop the agent UI dev server"
	@echo "  help          Show this help message"

.PHONY: build run stop build-local run-local stop-local

build:
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

stop:
	@echo "Agent UI runs in foreground - stopped when process is terminated"

build-local:
	@echo "📦 Installing agent UI dependencies..."
	@if command -v yarn >/dev/null 2>&1; then \
		yarn install; \
	else \
		echo "❌ Error: yarn is required. Install with: npm install -g yarn"; \
		exit 1; \
	fi

run-local:
	@echo ""
	@echo "Agent UI: http://localhost:3001"
	@echo ""
	cd apps/agent-ui && npx vite --host 127.0.0.1 --port 3001

stop-local:
	@echo "Agent UI runs in foreground - stopped when process is terminated"

# Default target to show help
.DEFAULT_GOAL := help
