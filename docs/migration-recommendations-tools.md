# Migration recommendation tools — shared-components extraction

Design for moving **forms, results, and tool chrome** from `migration-planner-ui-app` into `@openshift-migration-advisor/shared-components`, while each app keeps **API wiring and view-models**.

## Goals

- Reuse the same PatternFly UX in **ui-app** (planner-sdk) and **agent-ui** (agent-sdk).
- Keep shared code **SDK-agnostic**: presentation + pure helpers only.
- Preserve existing behavior (partner cost gating, utilization comparison, read-only example report).

## Layering

```
┌─────────────────────────────────────────────────────────────┐
│  App (ui-app / agent-ui)                                     │
│  • View-models (store, fetch, errors)                        │
│  • SDK → domain mapping (formValuesToRequest, etc.)          │
│  • Thin *ToolView containers                                 │
└───────────────────────────┬─────────────────────────────────┘
                            │ props + callbacks
┌───────────────────────────▼─────────────────────────────────┐
│  shared-components / migration-recommendations               │
│  • Landing + catalog (done)                                  │
│  • ToolLayout, RecommendationTemplate, RecommendationToolActions │
│  • Per-tool forms + results (phased)                         │
│  • UI form types + *ResponseLike shapes                      │
│  • Pure formatters / utilization math                        │
└─────────────────────────────────────────────────────────────┘
```

## Tool inventory (ui-app source)

| Tool ID | Container | Form | Result | View-model |
|---------|-----------|------|--------|------------|
| `architecture` | `ArchitectureToolView` | `SizingInputForm` | `SizingResult` | `useArchitectureToolViewModel` |
| `time-estimation` | `TimeEstimationToolView` | `TimeEstimationForm` | `TimeEstimationResult` | `useTimeEstimationToolViewModel` |
| `complexity` | `ComplexityToolView` | — | `ComplexityResult` | `useComplexityToolViewModel` |
| `cost-estimation` | `CostEstimationToolView` | `CostEstimationForm` | `CostEstimationResult` | `useCostEstimationToolViewModel` |

App source today: `src/ui/report/views/cluster-sizer/`.

## Shared package layout

```text
packages/shared-components/src/report/migration-recommendations/
  types.ts                          # RecommendationToolId, catalog (existing)
  constants.ts                      # Tool cards (existing)
  RecommendationToolsLanding.tsx
  MigrationRecommendationsView.tsx
  tools/
    ToolLayout.tsx
    RecommendationTemplate.tsx
    RecommendationToolActions.tsx
    architecture/
      sizingFormTypes.ts
      sizingConstants.ts
      clusterRequirementsResponseLike.ts
      utilizationSizing.ts
      sizingFormatters.ts
      utilizationComparisonData.ts
      SizingInputForm.tsx
      SizingResult.tsx
      UtilizationComparisonCards.tsx
    time-estimation/
    complexity/
```

`cost-estimation` UI stays in **ui-app** (partner-only; not part of this extraction).

## Type strategy

| Kind | Where |
|------|--------|
| `SizingFormValues`, `ClusterMode`, … | **shared** (`sizingFormTypes.ts`) |
| `ClusterRequirementsResponse` (planner-sdk) | **ui-app** — re-export or import from sdk |
| `ClusterRequirementsResponseLike` | **shared** — minimal fields the result UI reads |
| `formValuesToRequest`, enum maps | **ui-app** only |

Planner/agent responses passed into shared components must satisfy `*Like` interfaces (structural typing).

## Container pattern (per app)

```tsx
import {
  ToolLayout,
  RecommendationTemplate,
  RecommendationToolActions,
  SizingInputForm,
  SizingResult,
  getRecommendationToolTitle,
} from "@openshift-migration-advisor/shared-components";

// App view-model hook (planner or agent API)
const vm = useArchitectureToolViewModel(assessmentId, clusterId, options);

return (
  <ToolLayout title={...} onBack={onBack} actions={...}>
    <RecommendationTemplate
      preferencesContent={<SizingInputForm {...fieldProps} />}
      resultsContent={<SizingResult clusterName={...} formValues={...} sizerOutput={...} />}
      onGenerate={() => void vm.calculate()}
      ...
    />
  </ToolLayout>
);
```

`MigrationRecommendationsView` + `renderSelectedTool` stays the tab-level shell; each tool can use the same building blocks inside `renderSelectedTool`.

## Phased delivery

| Phase | Scope | Status |
|-------|--------|--------|
| **0** | Landing + `MigrationRecommendationsView` | Done |
| **1** | Tool chrome + architecture form/result | Done |
| **2** | Time estimation form/result + time utils | Done |
| **3** | Complexity result + charts + help | Done |

Extraction scope for shared-components **ends at phase 3**. Cost estimation and a shared tool router remain app-specific unless revisited later.

## ui-app migration rules

1. Replace moved files with **re-exports** from `@openshift-migration-advisor/shared-components` where paths are widely imported (e.g. `constants` sizing slice, `ToolLayout`).
2. Keep **tests** for SDK mapping in ui-app; move **presentation tests** with components.
3. Bump published `@openshift-migration-advisor/shared-components` before CI consumes new exports.

## agent-ui notes

- Implement agent-specific view-models that return the same props shared forms expect.
- Map agent-sdk cluster sizing responses → `ClusterRequirementsResponseLike`.
- Cost estimation is **ui-app only** today; add in agent-ui only if product requires it.

### offline-analyzer integration (this repo)

- **Tab:** Migration recommendations on the VMs overview report (`?tab=recommendations`, tool via `?recommendationTool=complexity`).
- **API:** `POST /api/v1/complexity-estimation` with optional `filterExpression` (see `assisted-migration-agent` analyzer OpenAPI).
- **App code:** `apps/offline-analyzer/src/pages/MigrationRecommendations/`.
- **Catalog:** only **Migration complexity** in `ENABLED_RECOMMENDATION_TOOL_IDS` until more endpoints exist.
- **Scope:** `buildRecommendationScopeExpression` aligns with cluster / vCenter report dropdowns (`vcenter_id`, `cluster_id` filter fields).

Complexity UI is not in the published agent-sdk yet; offline-analyzer uses `migrationComplexityApi.ts` (`fetch`). After OpenAPI is published to npm SDK, swap the view-model to the generated client (optional: `scripts/generate-agent-sdk-local.sh` with `analyzer/api/v1/openapi.yaml`).

**Follow-up:** agent-ui fleet + group report tabs (separate PR; requires agent v2 route or dev feature flag).

## Copy / clipboard

Plain-text export (`generatePlainTextRecommendation`, etc.) stays in the **app** until shapes are unified; shared components accept `onCopy` from containers.

## Icons

Shared package uses `@patternfly/react-icons` (e.g. `CopyIcon`), not ui-app `RhUi*` icons.

## References

- [shared-components package](./shared-components-package.md)
- ui-app: `src/ui/report/views/cluster-sizer/`
