# Migration Planner UI Makefile

CONTAINER_RUNTIME := $(shell command -v podman 2> /dev/null || echo docker)
# The OpenAPI Generator CLI container image, adapted from https://openapi-generator.tech/#tryDocker
IMAGE := quay.io/jkilzi/openapi-generator-cli
TAG := 7.18.0
# Arguments to pass to the OpenAPI Generator CLI
ARGS :=

# Interact directly with the tool
.PHONY: openapi-generator-cli
openapi-generator-cli:
	$(CONTAINER_RUNTIME) run \
	--name openapi-generator-cli \
	--rm \
	-v $(PWD):/opt/app-root/src/workspace:Z \
	--userns=keep-id \
	-u $(shell id -u):$(shell id -g) $(IMAGE):$(TAG) $(ARGS)

# Generate something
.PHONY: generate
generate:
	$(MAKE) openapi-generator-cli ARGS="generate $(ARGS)"

# Cleans up the API client
.PHONY: _clean-api-client
_clean-api-client:
	rm -rf packages/api-client/src packages/api-client/docs;

# Updates the API client
.PHONY: api-client
api-client: _clean-api-client
	$(MAKE) generate ARGS="--generator-key api-client"

# Clean up OpenAPI Generator CLI container image
.PHONY: clean
clean:
	$(CONTAINER_RUNTIME) rmi $(IMAGE)

# Show help
.PHONY: help
help:
	@echo "Migration Planner UI Makefile"
	@echo ""
	@echo "Available targets:"
	@echo "  openapi-generator-cli   Executes `openapi-generator-cli` allowing access to all CLI commands"
	@echo "  api-client              Updates the API client"
	@echo "  generate                Runs `openapi-generator-cli generate`, optionally pass --generator-key <key> or other arguments"
	@echo "                          See openapitools.json for keys (e.g., make generate ARGS=\"--generator-key api-client\")"
	@echo "  clean                   Remove the OpenAPI Generator CLI container image"
	@echo "  help                    Show this help message"
	@echo ""
	@echo "Container runtime: $(CONTAINER_RUNTIME)"

# Default target to show help
.DEFAULT_GOAL := help
