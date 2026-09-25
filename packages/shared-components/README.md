# @openshift-migration-advisor/shared-components

Shared React UI components for Migration Advisor applications (agent UI and cloud assessment UI).

Includes:

- PatternFly form field wrappers (`react-hook-form`)
- Guest OS support-tier helpers and badges
- Report chart primitives (`MigrationDonutChart`)
- Chart export (`ChartExportProvider`, `ChartExportSurface`, PDF / PNG / HTML)
- Operating Systems distribution card
- Infrastructure summary, vCenter cluster details, and host/VM power-state cards

## Installation

```bash
# Yarn workspace (migration-planner-ui)
yarn workspace @openshift-migration-advisor/agent-ui add @openshift-migration-advisor/shared-components@workspace:*

# npm (migration-planner-ui-app)
npm install @openshift-migration-advisor/shared-components
```

## Usage

```tsx
import {
  buildInfrastructureSummary,
  ChartExportProvider,
  HostPowerStates,
  InfrastructureSummary,
  MigrationDonutChart,
  OSDistribution,
  ReportExportMenu,
  SupportTierBadge,
  TextInputFormGroup,
  useChartExport,
  VCenterClusterDetails,
  VmPowerStates,
} from "@openshift-migration-advisor/shared-components";

<ChartExportProvider>
  <Dashboard />
</ChartExportProvider>
```

`ChartExportProvider` lazy-loads capture, ZIP, PDF, and HTML. Wrap the chart visual (not the Card chrome) in `ChartExportSurface`. All formats snapshot those same nodes, encode one chart at a time, and drop the canvas. There is no second print tree and no `isExportMode` render:

```tsx
import { ChartExportSurface } from "@openshift-migration-advisor/shared-components";

<Card>
  <CardTitle>CPU and memory</CardTitle>
  <CardBody>
    <ChartExportSurface id="cpu-memory" title="CPU and memory">
      <MigrationDonutChart {...chartProps} />
    </ChartExportSurface>
  </CardBody>
</Card>
```

`ReportExportMenu` accepts a fully custom `options` list. `standardReportExportOptions()` builds the PDF / HTML / PNG entries; omit a handler to hide that format.

Components are SDK-agnostic: pass already-shaped props (for example `OSDistributionEntry` maps). Map `agent-sdk` / `planner-sdk` models at the app boundary.

## Development

```bash
yarn workspace @openshift-migration-advisor/shared-components build
yarn workspace @openshift-migration-advisor/shared-components typecheck
yarn workspace @openshift-migration-advisor/shared-components test
yarn workspace @openshift-migration-advisor/shared-components check
```

## Publishing

The package is published to npm under `@openshift-migration-advisor/shared-components` via GitHub Actions, using the same OIDC Trusted Publishing flow as `@openshift-migration-advisor/ioc`.

**Workflow:** [`.github/workflows/release-shared-components.yaml`](../../.github/workflows/release-shared-components.yaml)

| Trigger | Result |
|---|---|
| Push to `main` / `stable` changing `packages/shared-components/**` | Prerelease: `{latestTag}-{12-char-sha}` |
| Tag `vX.Y.Z` | Release: `X.Y.Z` |

### One-time npm setup (required before first publish)

On [npmjs.com](https://www.npmjs.com/) for the `@openshift-migration-advisor` org, create the package (or claim the name) and configure a **Trusted Publisher**:

- **Repository:** `kubev2v/migration-planner-agent-ui` (or the current GitHub repo name)
- **Workflow:** `release-shared-components.yaml`
- **Environment:** leave empty unless you use GitHub Environments

No npm token is stored in the repo; publish uses OIDC (`id-token: write`).

## License

[Apache 2.0](LICENSE)