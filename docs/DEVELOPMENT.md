# Development Guide

This guide explains how to run and test the Migration Planner UI locally.

## Prerequisites

- Node.js 20.19+ or 22.12+
- Yarn 4.12.0+
- Docker or Podman (for running the migration-planner and agent)

## Local Development Setup

### 1. Start the Migration Planner Backend

First, you need to run the migration-planner service, which provides the API backend.

```bash
# Clone the migration-planner repository (if not already done)
git clone https://github.com/kubev2v/migration-planner.git
cd migration-planner

# Build and run the planner
make build
make run
```

The migration-planner API should now be accessible at `http://localhost:3443`.

### 2. Start the Assisted Migration Agent

The agent collects inventory data from vCenter and communicates with the migration-planner backend.

```bash
# Clone the assisted-migration-agent repository (if not already done)
git clone https://github.com/kubev2v/assisted-migration-agent.git
cd assisted-migration-agent

# Build and run the agent
make build
export PLANNER_BASE_URL=http://localhost:3443 make run
```

The agent API should now be accessible at `http://localhost:3001`.

### 3. Install Dependencies

```bash
cd migration-planner-ui
make install
```

### 4. Start the Development Server

```bash
# Start only the agent-ui workspace
make run
```

The UI will be available at **http://localhost:3001**

### 6. Access the Application

1. Open your browser and navigate to `http://localhost:3001`
2. You should see the login page where you can enter your vCenter credentials
3. After successful authentication, the agent will collect inventory data
4. You can then view the assessment report with migration insights

## Development Workflow

### Running Tests

```bash
# Run all tests
yarn test:all

# Run tests for agent-ui only
yarn workspace @openshift-migration-advisor/agent-ui test
```

### Linting and Formatting

```bash
# Check code quality
yarn check:all

# Auto-fix issues
yarn check:fix:all
```

### Building

```bash
# Build all workspaces
yarn build:all

# Build only agent-ui
yarn workspace @openshift-migration-advisor/agent-ui build
```

### Type Checking

```bash
# Type check all workspaces
yarn typecheck:all
```

## Architecture

```
┌─────────────────────┐
│   Browser (UI)      │
│  localhost:3001     │
└──────────┬──────────┘
           │
           │ HTTP/REST
           ▼
┌─────────────────────┐
│  Assisted Agent     │
│  localhost:8000     │
└──────┬───────┬──────┘
       │       │
       │       │ Collects data from
       │       ▼
       │  ┌─────────────────────┐
       │  │      vCenter        │
       │  └─────────────────────┘
       │
       │ HTTP/REST
       ▼
┌─────────────────────┐
│ Migration Planner   │
│  localhost:3443     │
└─────────────────────┘
```

## Troubleshooting

### Port Already in Use

If you get an error that port 3001 is already in use:

```bash
# Find and kill the process using the port
lsof -ti:3001 | xargs kill -9

# Or use a different port
yarn workspace @openshift-migration-advisor/agent-ui start --port 3002
```

### CORS Issues

If you encounter CORS errors, ensure that:

1. The agent is configured to allow requests from `http://localhost:3001`
2. Your browser is not blocking the requests
3. The agent service is running and accessible

### Agent Not Connecting

If the UI cannot connect to the agent:

```bash
# Check if the agent is running
curl http://localhost:8000/api/v1/status

# Check the agent logs
podman logs assisted-migration-agent
```

### Build Errors

If you encounter build errors:

```bash
# Clean all build artifacts
yarn clean:all

# Reinstall dependencies
rm -rf node_modules
yarn install

# Try building again
yarn build:all
```

## Hot Reload

The development server supports hot module replacement (HMR). Changes to your source files will automatically reload in the browser without losing application state.

## Additional Resources

- [Migration Planner Repository](https://github.com/kubev2v/migration-planner)
- [Assisted Migration Agent Repository](https://github.com/kubev2v/assisted-migration-agent)
- [PatternFly Documentation](https://www.patternfly.org/v6/)
- [Vite Documentation](https://vitejs.dev/)
