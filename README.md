# Migration Planner UI

A monorepo containing the in-agent UI application and shared packages for the Migration Planner project.

## Project Structure

This project is organized as a **monorepo** using Yarn workspaces, which allows us to manage multiple related packages and applications in a single repository. The structure is divided into two main directories:

- **`apps/`** - Contains standalone applications (e.g., `agent-ui`)
- **`packages/`** - Contains reusable packages that can be shared across applications

This monorepo structure provides several benefits:

- **Code sharing**: Common functionality can be extracted into packages and reused across multiple apps
- **Consistent tooling**: Shared development tools and configurations ensure consistency across the codebase
- **Atomic changes**: Related changes across packages and apps can be made in a single commit
- **Simplified dependency management**: Dependencies are hoisted and shared where possible, reducing duplication

## Tooling

### Top-Level Tools

The root `package.json` provides workspace-wide scripts and dev dependencies that standardize development across all packages and apps:

**Available Scripts:**

- `yarn build:all` - Build all packages and apps
- `yarn bundle:all` - Bundle all packages for publishing
- `yarn clean:all` - Clean all build artifacts
- `yarn check:all` - Run linting checks across all workspaces
- `yarn check:fix:all` - Auto-fix linting issues
- `yarn format:all` - Format code across all workspaces

**Shared Dev Dependencies:**

- `@biomejs/biome` - Linting and formatting (configured in `biome.json`)
- `typescript` - TypeScript compiler (version ~5.5.0)
- `vite` - Build tool for applications
- Various type definitions (`@types/*`)

### Package-Specific Tools

Each package and app can define its own scripts and dependencies, but they inherit the shared tooling from the root. This separation is intentional and serves to:

- **Standardize packages**: All packages follow similar patterns (build, bundle, clean scripts)
- **Align dependency versions**: Shared dev dependencies ensure consistent TypeScript versions, build tools, and linting rules across the entire monorepo
- **Reduce duplication**: Common tools are defined once at the root level rather than in each package

**Common Package Scripts:**

- `build` - Compile TypeScript to JavaScript
- `bundle` - Build and package for distribution
- `clean` - Remove build artifacts
- `check` - Run linting checks using Biome
- `check:fix` - Auto-fix linting issues using Biome
- `format` - Format code using Biome

**App-Specific Scripts:**
Apps may include additional scripts like `start` and `preview` for development workflows.

## Packages

**Key Features:**

- Generated from OpenAPI spec using `typescript-fetch` generator
- Type-safe API calls and models
- ES6 module support
- Isomorphic code: Works in both Node.js and browser environments

### `@openshift-migration-advisor/ioc`

A lightweight dependency injection (IoC) container solution for React applications, inspired by InversifyJS. Provides a simple way to manage dependencies and inject them into React components.

**Key Features:**

- Singleton-scoped dependency injection container
- React Context-based provider pattern
- `useInjection` hook for accessing dependencies in components
- Minimal API surface for easy adoption

## Applications

### `agent-ui`

A React-based user interface application for the Migration Planner Agent. Built with Vite, React Router, and PatternFly components.

**Key Technologies:**

- React 18
- Vite
- React Router
- PatternFly React components
- Emotion CSS

## Adding a New Package or App

The best approach for adding a new package or app is to **copy an existing similar one** and adapt it to your needs. This ensures consistency with existing patterns and configurations.

**Steps:**

1. **Choose a similar package/app** as a template (e.g., copy `packages/api-client` for a new client package, or `apps/agent-ui` for a new app)

2. **Copy the directory** to your desired location (`packages/` for packages, `apps/` for apps)

3. **Update the following:**
   - `package.json`: Update `name`, `description`, and any package-specific dependencies
   - `tsconfig.json`: Adjust TypeScript configuration if needed
   - Source code: Replace with your implementation
   - README.md: Update documentation

4. **Add TypeScript project reference** in the root `tsconfig.json`:

   ```json
   {
     "references": [{ "path": "./your-new-package/tsconfig.json" }]
   }
   ```

5. **Ensure scripts follow conventions:**
   - `build` – Compile TypeScript
   - `bundle` – Build and package (for packages)
   - `clean` – Remove build artifacts
   - `check` – Run static analysis/linting (e.g., type checks, code lint)
   - `format` – Format code automatically

6. **Run from root** to verify:
   ```bash
   yarn install
   yarn build:all
   ```

## Getting Started

1. **Install dependencies:**

   ```bash
   yarn install
   ```

2. **Build all packages:**

   ```bash
   yarn build:all
   ```

3. **Start an application:**

   ```bash
   cd apps/agent-ui
   yarn start
   ```

4. **Run linting:**
   ```bash
   yarn check:all
   ```

## Local Development

For detailed instructions on setting up a complete local development environment with the Migration Planner backend and Agent, see:

- `docs/DEVELOPMENT.md`

## Development Workflow

- **Making changes**: Work in the appropriate package or app directory
- **Testing**: Run package-specific scripts or use workspace scripts from root
- **Linting/Formatting**: Use `yarn check:all` and `yarn format:all` from root
