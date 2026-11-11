export {
  CARD_EMPTY_STATE_DESCRIPTION,
  CardEmptyState,
  type CardEmptyStateProps,
} from "./CardEmptyState.js";
export {
  ChartDownloadButton,
  ChartHeaderActions,
} from "./ChartDownloadButton.js";
export {
  type BuildChartDocument,
  type BuildPdfDocument,
  type CaptureChartElement,
  ChartExportProvider,
  type ChartExportProviderProps,
  type EncodeChartPng,
  type ZipChartFiles,
} from "./ChartExportProvider.js";
export { ChartExportSurface } from "./ChartExportSurface.js";
export {
  ClustersOverview,
  type ClustersOverviewProps,
  type InventoryDataLike,
} from "./ClustersOverview.js";
export {
  CpuAndMemoryOverview,
  type CpuAndMemoryOverviewProps,
} from "./CpuAndMemoryOverview.js";
export { captureChartElement } from "./captureChartElement.js";
export {
  CHART_EXPORT_CAPTURING_ATTR,
  CHART_EXPORT_HIDE_ATTR,
  CHART_EXPORT_SCROLL_ATTR,
  type ChartCaptureSource,
  type ChartExportFile,
  type ChartExportMeta,
  type ChartExportView,
  canvasToBlob,
  chartExportHideProps,
  chartExportRootStyle,
  chartExportScrollProps,
  chartExportViewsFromLabels,
  chartPngFilename,
  downloadBlob,
  type PdfTextPage,
  type PdfTextPageItem,
  type RegisteredChart,
  releaseCanvas,
  restoreChartExportViews,
  shouldIgnoreChartExportElement,
  slugifyExportName,
  sortRegisteredChartsByDocumentOrder,
  toBulkChartCaptureSources,
} from "./chartExport.js";
export {
  type ChartExportApi,
  type ChartExportFormat,
  useChartExport,
  useRegisterChart,
} from "./chartExportContext.js";
export {
  getChartExportFilename,
  getChartZipFilename,
  getDatedChartExportBasename,
} from "./chartExportFilenames.js";
export {
  chartColorFailure,
  chartColorSuccess,
  REPORT_CARD_EMPTY_STATE_TITLES,
} from "./constants.js";
export {
  DashboardEmptyStateBase,
  type DashboardEmptyStateBaseProps,
} from "./DashboardEmptyStateBase.js";
export { dashboardStyles, tableFullWidthStyle } from "./dashboardStyles.js";
export {
  EmptySearchResults,
  type EmptySearchResultsProps,
} from "./EmptySearchResults.js";
export {
  ErrorTable,
  type ErrorTableProps,
  type MigrationIssueLike,
} from "./ErrorTable.js";
export {
  FeatureStatusBadge,
  type FeatureStatusBadgeProps,
} from "./FeatureStatusBadge.js";
export {
  HostPowerStates,
  type HostPowerStatesProps,
} from "./HostPowerStates.js";
export {
  type HostLike,
  HostsOverview,
  type HostsOverviewProps,
} from "./HostsOverview.js";
export {
  buildHtmlFromCharts,
  buildHtmlReport,
  escapeHtml,
  type HtmlReportImage,
} from "./htmlExport.js";
export {
  InfrastructureSummary,
  type InfrastructureSummaryProps,
} from "./InfrastructureSummary.js";
export type {
  ClusterDetailRow,
  ClusterDetailsModel,
  FeatureStatus,
  HostCapability,
  InfrastructureSummaryModel,
  InventoryCluster,
  InventoryDatastore,
  InventoryHost,
  InventoryInfra,
  InventoryNetwork,
  InventoryVms,
  NetworkLabel,
} from "./infrastructureSummaryModel.js";
export {
  booleanToFeatureStatus,
  buildClusterDetailRows,
  buildClusterDetails,
  buildInfrastructureSummary,
  countVCenters,
  formatVSphereVersion,
  hostCapabilityStatus,
  visibleNetworks,
  vsanStatus,
} from "./infrastructureSummaryModel.js";
export {
  getRecommendationToolCards,
  getRecommendationToolTitle,
  isRecommendationToolAvailable,
  RECOMMENDATION_TOOL_CARDS,
} from "./migration-recommendations/constants.js";
export {
  MigrationRecommendationsView,
  type MigrationRecommendationsViewProps,
} from "./migration-recommendations/MigrationRecommendationsView.js";
export {
  disabledToolCardStyle,
  RecommendationToolsLanding,
  type RecommendationToolsLandingProps,
  toolCardStyle,
} from "./migration-recommendations/RecommendationToolsLanding.js";
export type {
  ClusterRequirementsResponseLike,
  ClusterSizingLike,
  InventoryTotalsLike,
  OptimizationStatusLike,
  ResourceConsumptionLike,
  SavingsLike,
} from "./migration-recommendations/tools/architecture/clusterRequirementsResponseLike.js";
export { SizingInputForm } from "./migration-recommendations/tools/architecture/SizingInputForm.js";
export {
  SizingResult,
  type SizingResultProps,
} from "./migration-recommendations/tools/architecture/SizingResult.js";
export {
  CLUSTER_MODE_OPTIONS,
  CONTROL_PLANE_CPU_OPTIONS,
  CONTROL_PLANE_MEMORY_OPTIONS,
  CONTROL_PLANE_OPTIONS,
  CPU_OPTIONS,
  CPU_OVERCOMMIT_OPTIONS,
  DEFAULT_FORM_VALUES,
  DEFAULT_WORKLOAD_FORM_VALUES,
  HA_OPTIONS,
  MEMORY_OPTIONS,
  MEMORY_OVERCOMMIT_OPTIONS,
  SMT_THREADS_MAX,
  SMT_THREADS_MIN,
  WORKER_NODE_PRESETS,
} from "./migration-recommendations/tools/architecture/sizingConstants.js";
export {
  formatNumber,
  formatRatio,
  getCpuOvercommitLabel,
  getMemoryOvercommitLabel,
} from "./migration-recommendations/tools/architecture/sizingFormatters.js";
export {
  type ClusterMode,
  type HAReplicaCount,
  isControlPlaneOnlyClusterMode,
  type MemoryOvercommitRatio,
  type OvercommitRatio,
  type SizingFormValues,
  type WorkerNodePreset,
  type WorkloadFormValues,
} from "./migration-recommendations/tools/architecture/sizingFormTypes.js";
export { UtilizationComparisonCards } from "./migration-recommendations/tools/architecture/UtilizationComparisonCards.js";
export {
  getUtilizationComparisonData,
  type UtilizationComparisonData,
} from "./migration-recommendations/tools/architecture/utilizationComparisonData.js";
export {
  computeEffectiveCpu,
  computeEffectiveMemory,
  formatUtilizationPercent,
  getOptimizationStatusMessage,
  hasUtilizationComparison,
  type UtilizationComparisonResponse,
} from "./migration-recommendations/tools/architecture/utilizationSizing.js";
export {
  ComplexityResult,
  type ComplexityResultProps,
} from "./migration-recommendations/tools/complexity/ComplexityResult.js";
export {
  COMPLEXITY_COLORS,
  COMPLEXITY_LABELS,
} from "./migration-recommendations/tools/complexity/complexityConstants.js";
export type {
  ComplexityDiskScoreEntryLike,
  ComplexityOSNameEntryLike,
  MigrationComplexityResponseLike,
  MigrationEstimationByComplexityResponseLike,
  OsDiskEstimationEntryLike,
} from "./migration-recommendations/tools/complexity/complexityTypes.js";
export { MigrationComplexityHelpPopover } from "./migration-recommendations/tools/complexity/MigrationComplexityHelpPopover.js";
export { OsComplexityChart } from "./migration-recommendations/tools/complexity/OsComplexityChart.js";
export {
  limitOsChartData,
  OS_CHART_MAX_BARS,
  sortComplexityOsData,
} from "./migration-recommendations/tools/complexity/osComplexityChartData.js";
export {
  type RecommendationPhase,
  RecommendationTemplate,
} from "./migration-recommendations/tools/RecommendationTemplate.js";
export {
  RecommendationToolActions,
  type RecommendationToolActionsProps,
} from "./migration-recommendations/tools/RecommendationToolActions.js";
export {
  ToolLayout,
  type ToolLayoutProps,
} from "./migration-recommendations/tools/ToolLayout.js";
export type {
  EstimationDetailLike,
  MigrationEstimationResponseLike,
  SchemaEstimationResultLike,
} from "./migration-recommendations/tools/time-estimation/migrationEstimationResponseLike.js";
export { TimeEstimationForm } from "./migration-recommendations/tools/time-estimation/TimeEstimationForm.js";
export {
  generateTimeEstimationPlainText,
  TimeEstimationResult,
  type TimeEstimationResultProps,
} from "./migration-recommendations/tools/time-estimation/TimeEstimationResult.js";
export {
  DEFAULT_ESTIMATION_FORM_VALUES,
  ESTIMATION_SLIDER_LIMITS,
} from "./migration-recommendations/tools/time-estimation/timeEstimationConstants.js";
export type { EstimationFormValues } from "./migration-recommendations/tools/time-estimation/timeEstimationFormTypes.js";
export {
  type ParsedAssumption,
  parsePostMigrationChecks,
  parseStorageOffload,
  parseStorageTransfer,
} from "./migration-recommendations/tools/time-estimation/timeParsingUtils.js";
export {
  durationToHours,
  formatDuration,
  formatHumanDuration,
  parseDuration,
} from "./migration-recommendations/tools/time-estimation/timeUtils.js";
export type {
  RecommendationToolCard,
  RecommendationToolCatalogOptions,
  RecommendationToolId,
} from "./migration-recommendations/types.js";
export {
  type NetworkInfraLike,
  type NetworkLike,
  NetworkOverview,
  type NetworkOverviewProps,
  type NicCountHistogram,
  type NicCountSummary,
} from "./NetworkOverview.js";
export { OSBarChart, OSDistribution } from "./OSDistribution.js";
export { OsSupportTiersHelpPopover } from "./OsSupportTiersHelpPopover.js";
export { OsUpgradeNotice } from "./OsUpgradeNotice.js";
export {
  OsNameCell,
  OsUpgradeRecommendationPopover,
} from "./OsUpgradeRecommendationPopover.js";
export type {
  OSDistributionEntry,
  SupportTierBadgeStyle,
} from "./osSupportTier.js";
export {
  getSupportTierBadgeColor,
  getSupportTierBadgeInlineStyle,
  getSupportTierDefinition,
  getSupportTierLegendLabel,
  getSupportTierSortOrder,
  hasOsUpgradeNotice,
  ORDERED_SUPPORT_TIERS,
  resolveSupportTier,
  SUPPORT_TIER_BADGE_COLORS,
  SUPPORT_TIER_BADGE_INLINE_STYLES,
  SUPPORT_TIER_DEFINITIONS,
  SUPPORT_TIER_LABELS,
  SUPPORT_TIER_LEARN_MORE_URL,
  SupportTier,
} from "./osSupportTier.js";
export { default as PopoverIcon } from "./PopoverIcon.js";
export {
  PowerStateCard,
  type PowerStateCardProps,
} from "./PowerStateCard.js";
export { buildPdfFromCharts } from "./pdfExport.js";
export {
  type PdfExportSegment,
  sliceCanvas,
  splitSegmentForPageHeight,
} from "./pdfPage.js";
export type { PowerStateChartModel } from "./powerStates.js";
export {
  buildHostPowerStateChart,
  buildVmPowerStateChart,
  HOST_POWER_COLORS,
  VM_POWER_COLORS,
} from "./powerStates.js";
export {
  ExportReportButton,
  type ExportReportButtonProps,
  ReportExportMenu,
  type ReportExportMenuProps,
} from "./ReportExportMenu.js";
export { ReportTable, type ReportTableProps } from "./ReportTable.js";
export {
  type ReportExportOption,
  type ReportExportSection,
  type StandardReportExportHandlers,
  type StandardReportExportOptionsConfig,
  standardReportExportOptions,
} from "./reportExportOptions.js";
export {
  type StorageDiskTierData,
  StorageOverview,
  type StorageOverviewProps,
} from "./StorageOverview.js";
export { SupportTierBadge } from "./SupportTierBadge.js";
export {
  ALL_TIERS_FILTER,
  type OsBarChartViewModel,
  type OsTableRow,
  useOsBarChartViewModel,
} from "./useOsBarChartViewModel.js";
export {
  VCenterClusterDetails,
  type VCenterClusterDetailsProps,
} from "./VCenterClusterDetails.js";
export {
  type IssuesBreakdownLike,
  VMMigrationStatus,
  type VMMigrationStatusProps,
} from "./VMMigrationStatus.js";
export {
  VmPowerStates,
  type VmPowerStatesProps,
} from "./VmPowerStates.js";
export {
  WarningsTable,
  type WarningsTableProps,
} from "./WarningsTable.js";
export { zipChartPngs } from "./zipChartPngs.js";
