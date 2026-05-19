import {
  Alert,
  Button,
  Card,
  CardBody,
  CardTitle,
  Checkbox,
  Content,
  Dropdown,
  DropdownItem,
  DropdownList,
  EmptyState,
  EmptyStateBody,
  ExpandableSection,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  Grid,
  GridItem,
  JumpLinks,
  JumpLinksItem,
  Label,
  MenuToggle,
  type MenuToggleElement,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Popover,
  Progress,
  ProgressSize,
  ProgressStep,
  ProgressStepper,
  Select,
  SelectList,
  SelectOption,
  Spinner,
  Stack,
  StackItem,
  TextInput,
} from "@patternfly/react-core";
import {
  CheckCircleIcon,
  CopyIcon,
  EllipsisVIcon,
  ExclamationTriangleIcon,
  ExternalLinkAltIcon,
  PlusCircleIcon,
  QuestionCircleIcon,
  TimesCircleIcon,
  TrashIcon,
} from "@patternfly/react-icons";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CredentialsForbiddenError,
  cancelForecastPair,
  ForecastConflictError,
  getForecasterStatus,
  getPairCapabilities,
  getRuns,
  getStats,
  postCredentials,
  postDatastores,
  putCredentials,
  startForecast,
} from "./forecasterApi";
import type {
  DatastoreGroup,
  ForecasterCredentials,
  ForecasterDatastore,
  ForecasterStatus,
  ForecastPairStatus,
  ForecastRun,
  ForecastStats,
  SelectedPair,
} from "./forecasterTypes";
import { TechnologyPreviewBadge } from "./TechnologyPreviewBadge";

// ── Helpers ──────────────────────────────────────────────────────────────────

function groupDatastoresByArray(
  datastores: ForecasterDatastore[],
): DatastoreGroup[] {
  const map = new Map<string, DatastoreGroup>();
  for (const ds of datastores) {
    const key = ds.storageArrayId || `__ungrouped__${ds.name}`;
    if (!map.has(key)) {
      map.set(key, {
        storageArrayId: key,
        storageVendor: ds.storageVendor,
        storageModel: ds.storageModel,
        datastores: [],
      });
    }
    const group = map.get(key);
    if (group) group.datastores.push(ds);
  }
  return Array.from(map.values());
}

function forecastPairToSelectedPair(pair: ForecastPairStatus): SelectedPair {
  return {
    id: pair.pairName,
    name: pair.pairName,
    sourceDatastore: pair.sourceDatastore,
    targetDatastore: pair.targetDatastore,
  };
}

function pairLabel(pair: SelectedPair): string {
  return `${pair.sourceDatastore} → ${pair.targetDatastore}`;
}

// ── Shared sub-components ─────────────────────────────────────────────────────

interface PairProgressBarsProps {
  prepProgress: number | undefined;
  benchProgress: number;
  isPreparing: boolean;
  sourceDatastore: string;
  targetDatastore: string;
}

const PairProgressBars: React.FC<PairProgressBarsProps> = ({
  prepProgress,
  benchProgress,
  isPreparing,
  sourceDatastore,
  targetDatastore,
}) => (
  <>
    <div style={{ marginTop: "12px" }}>
      <Content component="p" style={{ fontWeight: 600, margin: "0 0 4px" }}>
        Prepare
      </Content>
      <Content component="small" style={{ display: "block" }}>
        Prepare environment for {sourceDatastore} → {targetDatastore}
      </Content>
      <Progress
        value={isPreparing ? (prepProgress ?? 0) : 100}
        size={ProgressSize.sm}
        measureLocation="outside"
        aria-label="Prep progress"
      />
    </div>
    <div style={{ marginTop: "16px" }}>
      <Content component="p" style={{ fontWeight: 600, margin: "0 0 4px" }}>
        Running
      </Content>
      <Content component="small" style={{ display: "block" }}>
        Benchmark progress for {sourceDatastore} → {targetDatastore}
      </Content>
      <Progress
        value={isPreparing ? 0 : benchProgress}
        size={ProgressSize.sm}
        measureLocation="outside"
        aria-label="Benchmark progress"
      />
    </div>
  </>
);

interface TempResourcesAcknowledgementProps {
  id: string;
  isChecked: boolean;
  onChange: (checked: boolean) => void;
}

const TempResourcesAcknowledgement: React.FC<
  TempResourcesAcknowledgementProps
> = ({ id, isChecked, onChange }) => (
  <Alert
    variant="warning"
    isInline
    title="The forecaster creates temporary virtual machines and virtual disks in your vCenter environment"
  >
    <Content component="p" style={{ marginBottom: "12px" }}>
      While all resources are cleaned up automatically after benchmarking,
      vCenter administrators should be aware of this activity.
    </Content>
    <Checkbox
      id={id}
      label="I understand temporary resources will be created in my vCenter environment."
      isChecked={isChecked}
      onChange={(_e, checked) => onChange(checked)}
    />
    <div style={{ marginTop: "8px" }}>
      <a
        href="https://docs.redhat.com/en/documentation/migration_toolkit_for_virtualization/2.10/html-single/planning_your_migration_to_red_hat_openshift_virtualization/index#about-storage-copy-offload_vmware"
        target="_blank"
        rel="noopener noreferrer"
      >
        Learn more <ExternalLinkAltIcon />
      </a>
    </div>
  </Alert>
);

// ── Sub-components ────────────────────────────────────────────────────────────

interface CredentialsStepProps {
  credentials: ForecasterCredentials;
  onChange: (c: ForecasterCredentials) => void;
  error: string | null;
  missingPrivileges: string[];
  isLoading: boolean;
  acknowledged: boolean;
  onAcknowledgedChange: (checked: boolean) => void;
}

const CredentialsStep: React.FC<CredentialsStepProps> = ({
  credentials,
  onChange,
  error,
  missingPrivileges,
  isLoading,
  acknowledged,
  onAcknowledgedChange,
}) => (
  <Stack hasGutter>
    <StackItem>
      <Content component="p">
        Enter your vCenter credentials. These are required to discover available
        datastores and run the benchmark.
      </Content>
    </StackItem>
    {error && (
      <StackItem>
        <Alert variant="danger" title="Error" isInline>
          {error}
          {missingPrivileges.length > 0 && (
            <div style={{ marginTop: "8px" }}>
              <strong>Missing privileges:</strong>
              <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
                {missingPrivileges.map((p) => (
                  <li key={p}>
                    <code>{p}</code>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Alert>
      </StackItem>
    )}
    <StackItem>
      <Form>
        <FormGroup label="vCenter URL" isRequired fieldId="vcenter-url">
          <TextInput
            id="vcenter-url"
            value={credentials.url}
            onChange={(_e, v) => onChange({ ...credentials, url: v })}
            placeholder="https://vcenter.example.com"
            isDisabled={isLoading}
          />
          <Content
            component="small"
            style={{ color: "var(--pf-t--global--text--color--200)" }}
          >
            Example: https://vcenter.example.com
          </Content>
        </FormGroup>
        <FormGroup label="Username" isRequired fieldId="vcenter-username">
          <TextInput
            id="vcenter-username"
            value={credentials.username}
            onChange={(_e, v) => onChange({ ...credentials, username: v })}
            placeholder="administrator@vsphere.local"
            isDisabled={isLoading}
          />
          <Content
            component="small"
            style={{ color: "var(--pf-t--global--text--color--200)" }}
          >
            Example: administrator@vsphere.local
          </Content>
        </FormGroup>
        <FormGroup label="Password" isRequired fieldId="vcenter-password">
          <TextInput
            id="vcenter-password"
            type="password"
            value={credentials.password}
            onChange={(_e, v) => onChange({ ...credentials, password: v })}
            isDisabled={isLoading}
          />
        </FormGroup>
      </Form>
    </StackItem>
    <StackItem>
      <TempResourcesAcknowledgement
        id="cred-acknowledge-temp-resources"
        isChecked={acknowledged}
        onChange={onAcknowledgedChange}
      />
    </StackItem>
  </Stack>
);

// ── Pair Selector ────────────────────────────────────────────────────────────

/** Maps API capability keys → human-readable labels */
const CAPABILITY_LIST: { key: string; label: string }[] = [
  { key: "xcopy", label: "XCOPY" },
  { key: "copy-offload", label: "Offload" },
  { key: "rdm", label: "RDM" },
  { key: "vvol", label: "VVols" },
];

function datastoreArrayLabel(ds: ForecasterDatastore): string | null {
  const parts = [
    ds.type,
    [ds.storageVendor, ds.storageModel].filter(Boolean).join(" "),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

interface PairRowProps {
  idx: number;
  pair: SelectedPair;
  datastores: ForecasterDatastore[];
  onChange: (idx: number, pair: SelectedPair) => void;
  onRemove: (idx: number) => void;
  canRemove: boolean;
  pairCapabilities: string[] | null;
  capsLoading: boolean;
}

const PairRow: React.FC<PairRowProps> = ({
  idx,
  pair,
  datastores,
  onChange,
  onRemove,
  canRemove,
  pairCapabilities,
  capsLoading,
}) => {
  const [isSrcOpen, setIsSrcOpen] = useState(false);
  const [isTgtOpen, setIsTgtOpen] = useState(false);

  const srcDs = datastores.find((d) => d.name === pair.sourceDatastore) ?? null;
  const tgtDs = datastores.find((d) => d.name === pair.targetDatastore) ?? null;

  const hasNoCapabilities =
    pairCapabilities !== null &&
    pairCapabilities.length === 0 &&
    !!pair.sourceDatastore &&
    !!pair.targetDatastore;

  const dsOptions = datastores.map((ds) => (
    <SelectOption key={ds.name} value={ds.name}>
      {ds.name}
      {ds.type ? ` (${ds.type})` : ""}
    </SelectOption>
  ));

  return (
    <div style={{ marginBottom: "16px" }}>
      <Flex alignItems={{ default: "alignItemsFlexStart" }}>
        <FlexItem grow={{ default: "grow" }}>
          <Grid hasGutter>
            <GridItem span={5}>
              <Select
                isScrollable
                isOpen={isSrcOpen}
                selected={pair.sourceDatastore || undefined}
                onSelect={(_e, v) => {
                  onChange(idx, { ...pair, sourceDatastore: v as string });
                  setIsSrcOpen(false);
                }}
                onOpenChange={setIsSrcOpen}
                toggle={(ref: React.Ref<MenuToggleElement>) => (
                  <MenuToggle
                    ref={ref}
                    isExpanded={isSrcOpen}
                    onClick={() => setIsSrcOpen((o) => !o)}
                    style={{ width: "100%" }}
                    status={hasNoCapabilities ? "danger" : undefined}
                  >
                    {pair.sourceDatastore || "Select source datastore"}
                  </MenuToggle>
                )}
              >
                <SelectList>{dsOptions}</SelectList>
              </Select>
              {srcDs && datastoreArrayLabel(srcDs) && (
                <Content
                  component="small"
                  style={{
                    display: "block",
                    marginTop: "4px",
                    color: "var(--pf-t--global--text--color--200)",
                  }}
                >
                  Storage array: <strong>{datastoreArrayLabel(srcDs)}</strong>
                </Content>
              )}
            </GridItem>
            <GridItem
              span={2}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                paddingTop: "6px",
              }}
            >
              <Content component="p" style={{ margin: 0, fontWeight: "bold" }}>
                →
              </Content>
            </GridItem>
            <GridItem span={5}>
              <Select
                isScrollable
                isOpen={isTgtOpen}
                selected={pair.targetDatastore || undefined}
                onSelect={(_e, v) => {
                  onChange(idx, { ...pair, targetDatastore: v as string });
                  setIsTgtOpen(false);
                }}
                onOpenChange={setIsTgtOpen}
                toggle={(ref: React.Ref<MenuToggleElement>) => (
                  <MenuToggle
                    ref={ref}
                    isExpanded={isTgtOpen}
                    onClick={() => setIsTgtOpen((o) => !o)}
                    style={{ width: "100%" }}
                    status={hasNoCapabilities ? "danger" : undefined}
                  >
                    {pair.targetDatastore || "Select target datastore"}
                  </MenuToggle>
                )}
              >
                <SelectList>{dsOptions}</SelectList>
              </Select>
              {tgtDs && datastoreArrayLabel(tgtDs) && (
                <Content
                  component="small"
                  style={{
                    display: "block",
                    marginTop: "4px",
                    color: "var(--pf-t--global--text--color--200)",
                  }}
                >
                  Storage array: <strong>{datastoreArrayLabel(tgtDs)}</strong>
                </Content>
              )}
              {hasNoCapabilities && (
                <Content
                  component="small"
                  style={{
                    display: "block",
                    marginTop: "4px",
                    color: "var(--pf-t--global--color--status--danger--100)",
                  }}
                >
                  Select different datastore pair with pair capabilities
                </Content>
              )}
            </GridItem>
          </Grid>

          {/* Pair capabilities */}
          {(capsLoading || pairCapabilities !== null) && (
            <div
              style={{
                marginTop: "10px",
                padding: "8px 14px",
                border: `1px solid ${hasNoCapabilities ? "var(--pf-t--global--color--status--danger--100)" : "var(--pf-t--global--color--brand--200)"}`,
                borderRadius: "4px",
                background: "var(--pf-t--global--background--color--100)",
              }}
            >
              {capsLoading ? (
                <Flex alignItems={{ default: "alignItemsCenter" }}>
                  <FlexItem>
                    <Spinner size="sm" />
                  </FlexItem>
                  <FlexItem>
                    <Content component="small">
                      Loading pair capabilities…
                    </Content>
                  </FlexItem>
                </Flex>
              ) : (
                <>
                  <Content
                    component="small"
                    style={{ fontWeight: 600, display: "block" }}
                  >
                    {hasNoCapabilities && (
                      <ExclamationTriangleIcon
                        color="var(--pf-t--global--color--status--danger--100)"
                        style={{ marginRight: "6px" }}
                      />
                    )}
                    Pair capabilities
                  </Content>
                  <Flex
                    style={{ marginTop: "6px", gap: "20px", flexWrap: "wrap" }}
                  >
                    {CAPABILITY_LIST.map(({ key, label }) => {
                      const supported = (pairCapabilities ?? []).includes(key);
                      return (
                        <FlexItem
                          key={key}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          {supported ? (
                            <CheckCircleIcon
                              color="var(--pf-t--global--color--status--success--100)"
                              aria-label="supported"
                            />
                          ) : (
                            <TimesCircleIcon
                              color="var(--pf-t--global--color--status--danger--100)"
                              aria-label="not supported"
                            />
                          )}
                          <Content component="small">{label}</Content>
                        </FlexItem>
                      );
                    })}
                  </Flex>
                </>
              )}
            </div>
          )}
        </FlexItem>
        <FlexItem style={{ paddingTop: "4px" }}>
          <Button
            variant="plain"
            aria-label="Remove pair"
            onClick={() => onRemove(idx)}
            isDisabled={!canRemove}
          >
            <TrashIcon />
          </Button>
        </FlexItem>
      </Flex>
    </div>
  );
};

interface SelectPairsStepProps {
  datastores: ForecasterDatastore[];
  groups: DatastoreGroup[];
  pairs: SelectedPair[];
  onPairsChange: (pairs: SelectedPair[]) => void;
  isLoading: boolean;
  error: string | null;
  basePath: string;
  onHasNoCaps?: (hasNoCaps: boolean) => void;
  showVmWarning?: boolean;
  vmAcknowledged?: boolean;
  onVmAcknowledgedChange?: (checked: boolean) => void;
}

/** Returns true when two or more complete pairs share the same source-array → target-array route. */
function hasDuplicateArrayRoutes(
  pairs: SelectedPair[],
  datastores: ForecasterDatastore[],
): boolean {
  const dsMap = new Map(datastores.map((d) => [d.name, d]));
  const seen = new Set<string>();
  for (const p of pairs) {
    if (!p.sourceDatastore || !p.targetDatastore) continue;
    const srcArrayId =
      dsMap.get(p.sourceDatastore)?.storageArrayId ?? p.sourceDatastore;
    const tgtArrayId =
      dsMap.get(p.targetDatastore)?.storageArrayId ?? p.targetDatastore;
    const key = `${srcArrayId}::${tgtArrayId}`;
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

const SelectPairsStep: React.FC<SelectPairsStepProps> = ({
  datastores,
  groups,
  pairs,
  onPairsChange,
  isLoading,
  error,
  basePath,
  onHasNoCaps,
  showVmWarning = false,
  vmAcknowledged = false,
  onVmAcknowledgedChange,
}) => {
  const showDuplicateWarning = hasDuplicateArrayRoutes(pairs, datastores);

  // Capabilities per pair: string[] (resolved), null (pending/error), or undefined (incomplete pair)
  const [pairCapsMap, setPairCapsMap] = useState<
    Record<string, string[] | null>
  >({});
  const [capsLoading, setCapsLoading] = useState(false);

  const completePairs = useMemo(
    () => pairs.filter((p) => p.sourceDatastore && p.targetDatastore),
    [pairs],
  );

  useEffect(() => {
    if (completePairs.length === 0) {
      setPairCapsMap({});
      setCapsLoading(false);
      return;
    }

    let cancelled = false;
    setCapsLoading(true);

    getPairCapabilities(basePath, {
      pairs: completePairs.map((p) => ({
        name: p.name,
        sourceDatastore: p.sourceDatastore,
        targetDatastore: p.targetDatastore,
      })),
    })
      .then((results) => {
        if (cancelled) return;
        const next: Record<string, string[]> = {};
        for (const p of completePairs) {
          const cap = results.find(
            (c) =>
              c.sourceDatastore === p.sourceDatastore &&
              c.targetDatastore === p.targetDatastore,
          );
          next[p.id] = cap?.capabilities ?? [];
        }
        setPairCapsMap(next);
      })
      .catch(() => {
        if (cancelled) return;
        const next: Record<string, null> = {};
        for (const p of completePairs) {
          next[p.id] = null;
        }
        setPairCapsMap(next);
      })
      .finally(() => {
        if (!cancelled) setCapsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [basePath, completePairs]);

  useEffect(() => {
    const anyNoCaps = completePairs.some((p) => {
      const caps = pairCapsMap[p.id];
      return caps !== null && caps !== undefined && caps.length === 0;
    });
    onHasNoCaps?.(anyNoCaps);
  }, [pairCapsMap, completePairs, onHasNoCaps]);

  const addPair = () => {
    const id = `pair-${Date.now()}`;
    onPairsChange([
      ...pairs,
      { id, name: id, sourceDatastore: "", targetDatastore: "" },
    ]);
  };

  const removePair = (idx: number) => {
    onPairsChange(pairs.filter((_, i) => i !== idx));
  };

  const updatePair = (idx: number, updated: SelectedPair) => {
    const newName =
      updated.sourceDatastore && updated.targetDatastore
        ? `${updated.sourceDatastore}-to-${updated.targetDatastore}`
        : updated.id;
    onPairsChange(
      pairs.map((p, i) => (i === idx ? { ...updated, name: newName } : p)),
    );
  };

  if (isLoading) {
    return (
      <EmptyState>
        <Spinner size="xl" />
        <EmptyStateBody>Loading datastores…</EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <Stack hasGutter>
      {error && (
        <StackItem>
          <Alert variant="danger" title="Error loading datastores" isInline>
            {error}
          </Alert>
        </StackItem>
      )}

      {groups.length > 0 && (
        <StackItem>
          <Content component="p">
            <strong>{datastores.length}</strong> datastores discovered across{" "}
            <strong>{groups.length}</strong> storage array group(s).
          </Content>
          <Content component="p">
            Select one or more source/target pairs to run a storage offload
            estimate on.{" "}
            <a
              href="https://docs.redhat.com/en/documentation/migration_toolkit_for_virtualization/2.10/html-single/planning_your_migration_to_red_hat_openshift_virtualization/index#about-storage-copy-offload_vmware"
              target="_blank"
              rel="noopener noreferrer"
            >
              Learn more <ExternalLinkAltIcon />
            </a>
          </Content>
        </StackItem>
      )}

      <StackItem>
        {/* Column headers — shown once above the first pair row */}
        <Grid hasGutter style={{ marginBottom: "4px" }}>
          <GridItem span={5}>
            <Flex
              alignItems={{ default: "alignItemsCenter" }}
              gap={{ default: "gapXs" }}
            >
              <FlexItem>
                <Content
                  component="small"
                  style={{ fontWeight: 600, display: "block" }}
                >
                  Source datastore
                </Content>
              </FlexItem>
              <FlexItem>
                <Popover
                  bodyContent="The selected source datastore and target datastore the estimation is based on."
                  position="top"
                  withFocusTrap={false}
                >
                  <QuestionCircleIcon
                    style={{
                      color: "var(--pf-t--global--text--color--200)",
                      cursor: "pointer",
                      fontSize: "0.85em",
                    }}
                    aria-label="Source datastore info"
                  />
                </Popover>
              </FlexItem>
            </Flex>
          </GridItem>
          <GridItem span={2} />
          <GridItem span={5}>
            <Flex
              alignItems={{ default: "alignItemsCenter" }}
              gap={{ default: "gapXs" }}
            >
              <FlexItem>
                <Content
                  component="small"
                  style={{ fontWeight: 600, display: "block" }}
                >
                  Target datastore
                </Content>
              </FlexItem>
              <FlexItem>
                <Popover
                  bodyContent="The selected source datastore and target datastore the estimation is based on."
                  position="top"
                  withFocusTrap={false}
                >
                  <QuestionCircleIcon
                    style={{
                      color: "var(--pf-t--global--text--color--200)",
                      cursor: "pointer",
                      fontSize: "0.85em",
                    }}
                    aria-label="Target datastore info"
                  />
                </Popover>
              </FlexItem>
            </Flex>
          </GridItem>
        </Grid>
        {pairs.map((pair, idx) => (
          <PairRow
            key={pair.id}
            idx={idx}
            pair={pair}
            datastores={datastores}
            onChange={updatePair}
            onRemove={removePair}
            canRemove={pairs.length > 1}
            pairCapabilities={pairCapsMap[pair.id] ?? null}
            capsLoading={
              capsLoading && !!pair.sourceDatastore && !!pair.targetDatastore
            }
          />
        ))}
        {showDuplicateWarning && (
          <Alert
            variant="warning"
            title="Duplicate storage array route"
            isInline
            style={{ marginTop: "16px" }}
          >
            More than one datastore pair targets the same storage array
            combination. Benchmarking each may not add new insight.
          </Alert>
        )}
        <Button
          variant="link"
          icon={<PlusCircleIcon />}
          onClick={addPair}
          style={{ marginTop: "8px" }}
        >
          Add another pair
        </Button>
      </StackItem>

      {showVmWarning && (
        <StackItem>
          <TempResourcesAcknowledgement
            id="pairs-acknowledge-temp-resources"
            isChecked={vmAcknowledged}
            onChange={(checked) => onVmAcknowledgedChange?.(checked)}
          />
        </StackItem>
      )}
    </Stack>
  );
};

// ── Running / Progress Step ───────────────────────────────────────────────────

interface RunningStepProps {
  status: ForecasterStatus | null;
  benchmarkDone: boolean;
  onCancelPair: (pairName: string) => void;
  cancelingPairName: string | null;
  onRerun: (pair: ForecastPairStatus) => void;
}

const RunningStep: React.FC<RunningStepProps> = ({
  status,
  benchmarkDone,
  onCancelPair,
  cancelingPairName,
  onRerun,
}) => {
  const cardsRef = useRef<HTMLDivElement>(null);
  const [openKebabId, setOpenKebabId] = useState<string | null>(null);

  if (!status) {
    return (
      <EmptyState>
        <Spinner size="xl" />
        <EmptyStateBody>Starting benchmark…</EmptyStateBody>
      </EmptyState>
    );
  }

  const allPairs = status.pairs ?? [];

  // Re-run only allowed when every pair has finished
  const allPairsTerminal =
    allPairs.length > 0 &&
    allPairs.every(
      (p) =>
        p.state === "completed" ||
        p.state === "canceled" ||
        p.state === "error",
    );

  return (
    <Stack hasGutter>
      {allPairs.length === 0 ? (
        <StackItem>
          <Flex alignItems={{ default: "alignItemsCenter" }}>
            <FlexItem>
              <Spinner size="md" />
            </FlexItem>
            <FlexItem>
              <Content component="p" style={{ margin: 0 }}>
                Starting benchmark…
              </Content>
            </FlexItem>
          </Flex>
        </StackItem>
      ) : (
        <StackItem>
          <div
            style={{
              display: "flex",
              gap: "24px",
              alignItems: "flex-start",
            }}
          >
            {/* Left: jump links navigation */}
            <div style={{ width: "260px", flexShrink: 0 }}>
              <JumpLinks
                isVertical
                label="Pair results"
                scrollableRef={cardsRef}
                offset={24}
              >
                {allPairs.map((pair) => (
                  <JumpLinksItem
                    key={pair.pairName}
                    href={`#pair-card-${pair.pairName}`}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        wordBreak: "break-word",
                        lineHeight: 1.4,
                      }}
                    >
                      {pair.sourceDatastore} → {pair.targetDatastore}
                    </span>
                  </JumpLinksItem>
                ))}
              </JumpLinks>
            </div>

            {/* Right: scrollable pair cards */}
            <div
              ref={cardsRef}
              style={{
                flex: 1,
                minWidth: 0,
                maxHeight: "600px",
                overflowY: "auto",
              }}
            >
              <Stack hasGutter>
                {allPairs.map((pair) => {
                  const isPreparing = pair.state === "preparing";
                  const prepProgress =
                    isPreparing &&
                    pair.prepBytesTotal &&
                    pair.prepBytesTotal > 0
                      ? Math.round(
                          ((pair.prepBytesUploaded || 0) /
                            pair.prepBytesTotal) *
                            100,
                        )
                      : undefined;
                  const benchProgress =
                    pair.totalRuns > 0
                      ? Math.round((pair.completedRuns / pair.totalRuns) * 100)
                      : 0;
                  const stateColor =
                    pair.state === "completed"
                      ? "green"
                      : pair.state === "error" || pair.state === "canceled"
                        ? "red"
                        : "blue";

                  const isCancelable =
                    !benchmarkDone &&
                    (pair.state === "running" ||
                      pair.state === "pending" ||
                      pair.state === "preparing");
                  const isCancelingThisPair =
                    cancelingPairName === pair.pairName;

                  return (
                    <StackItem key={pair.pairName}>
                      <Card id={`pair-card-${pair.pairName}`} isCompact>
                        <CardTitle>
                          <Flex
                            justifyContent={{
                              default: "justifyContentSpaceBetween",
                            }}
                            alignItems={{
                              default: "alignItemsCenter",
                            }}
                          >
                            <FlexItem>
                              <Content
                                component="p"
                                style={{ fontWeight: 600, margin: 0 }}
                              >
                                {pair.sourceDatastore} → {pair.targetDatastore}
                              </Content>
                              {pair.host && (
                                <Content
                                  component="small"
                                  style={{
                                    color:
                                      "var(--pf-t--global--text--color--200)",
                                  }}
                                >
                                  Host: {pair.host}
                                </Content>
                              )}
                            </FlexItem>
                            <FlexItem>
                              <Flex
                                gap={{ default: "gapSm" }}
                                alignItems={{ default: "alignItemsCenter" }}
                              >
                                <FlexItem>
                                  <Label color={stateColor}>{pair.state}</Label>
                                </FlexItem>
                                {isCancelable && (
                                  <FlexItem>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() =>
                                        onCancelPair(pair.pairName)
                                      }
                                      isLoading={isCancelingThisPair}
                                      isDisabled={cancelingPairName !== null}
                                    >
                                      Cancel benchmark
                                    </Button>
                                  </FlexItem>
                                )}
                                {(isCancelable ||
                                  pair.state === "canceled" ||
                                  pair.state === "error") && (
                                  <FlexItem>
                                    <Dropdown
                                      isOpen={openKebabId === pair.pairName}
                                      onOpenChange={(isOpen) =>
                                        !isOpen && setOpenKebabId(null)
                                      }
                                      onSelect={() => setOpenKebabId(null)}
                                      popperProps={{ position: "right" }}
                                      toggle={(toggleRef) => (
                                        <MenuToggle
                                          ref={toggleRef}
                                          variant="plain"
                                          onClick={() =>
                                            setOpenKebabId(
                                              openKebabId === pair.pairName
                                                ? null
                                                : pair.pairName,
                                            )
                                          }
                                          isExpanded={
                                            openKebabId === pair.pairName
                                          }
                                          aria-label="Pair actions"
                                        >
                                          <EllipsisVIcon />
                                        </MenuToggle>
                                      )}
                                    >
                                      <DropdownList>
                                        {isCancelable && (
                                          <DropdownItem
                                            key="cancel"
                                            isDisabled={
                                              cancelingPairName !== null
                                            }
                                            onClick={() => {
                                              onCancelPair(pair.pairName);
                                              setOpenKebabId(null);
                                            }}
                                          >
                                            Cancel benchmark
                                          </DropdownItem>
                                        )}
                                        {(pair.state === "canceled" ||
                                          pair.state === "error") && (
                                          <DropdownItem
                                            key="rerun"
                                            isDisabled={!allPairsTerminal}
                                            onClick={() => {
                                              if (allPairsTerminal)
                                                onRerun(pair);
                                              setOpenKebabId(null);
                                            }}
                                          >
                                            Re-run benchmark
                                          </DropdownItem>
                                        )}
                                      </DropdownList>
                                    </Dropdown>
                                  </FlexItem>
                                )}
                              </Flex>
                            </FlexItem>
                          </Flex>
                        </CardTitle>

                        <CardBody>
                          {/* Error state */}
                          {pair.state === "error" && (
                            <>
                              <Content
                                component="small"
                                style={{ display: "block" }}
                              >
                                Benchmark runs: {pair.completedRuns} /{" "}
                                {pair.totalRuns}
                              </Content>
                              <Alert
                                variant="danger"
                                title={
                                  pair.error ?? "An unexpected error occurred"
                                }
                                isInline
                                style={{ marginTop: "8px" }}
                              />
                            </>
                          )}

                          {/* Canceled state */}
                          {pair.state === "canceled" && (
                            <Alert
                              variant="warning"
                              title="Estimate cancelled"
                              isInline
                            >
                              Cancelled run: The estimate was stopped before
                              completion. You can run again when ready.
                            </Alert>
                          )}

                          {/* Completed state */}
                          {pair.state === "completed" && (
                            <Content
                              component="small"
                              style={{ display: "block" }}
                            >
                              Benchmark runs: {pair.completedRuns} /{" "}
                              {pair.totalRuns}
                            </Content>
                          )}

                          {/* Pending state — not yet started */}
                          {pair.state === "pending" && (
                            <Content
                              component="small"
                              style={{ display: "block", fontStyle: "italic" }}
                            >
                              Pending
                            </Content>
                          )}

                          {/* Active states: preparing or running — show both progress bars */}
                          {(isPreparing || pair.state === "running") && (
                            <>
                              <Content
                                component="small"
                                style={{ display: "block" }}
                              >
                                Benchmark runs: {pair.completedRuns} /{" "}
                                {pair.totalRuns}
                              </Content>
                              <PairProgressBars
                                prepProgress={prepProgress}
                                benchProgress={benchProgress}
                                isPreparing={isPreparing}
                                sourceDatastore={pair.sourceDatastore}
                                targetDatastore={pair.targetDatastore}
                              />
                            </>
                          )}
                        </CardBody>

                        {/* Re-run button for canceled / error pairs */}
                        {(pair.state === "canceled" ||
                          pair.state === "error") && (
                          <CardBody
                            style={{
                              borderTop:
                                "1px solid var(--pf-t--global--border--color--100)",
                              paddingTop: "8px",
                            }}
                          >
                            <Button
                              variant="primary"
                              isBlock
                              isDisabled={!allPairsTerminal}
                              title={
                                !allPairsTerminal
                                  ? "Wait for all pairs to finish"
                                  : undefined
                              }
                              onClick={() => onRerun(pair)}
                            >
                              Re-run benchmark
                            </Button>
                          </CardBody>
                        )}
                      </Card>
                    </StackItem>
                  );
                })}
              </Stack>
            </div>
          </div>
        </StackItem>
      )}
    </Stack>
  );
};

// ── Results Step ──────────────────────────────────────────────────────────────

/**
 * Cleans up Go duration strings (e.g. "21m9.807116185s" → "21m 10s",
 * "4h47m51.2s" → "4h 47m 51s"). Rounds fractional seconds to whole seconds
 * and adds spaces between units for readability.
 */
function formatGoDuration(raw: string): string {
  if (!raw) return raw;
  // Round fractional seconds to whole seconds
  let s = raw.replace(
    /(\d+(?:\.\d+)?)s$/,
    (_, sec) => `${Math.round(parseFloat(sec))}s`,
  );
  // Add spaces between unit boundaries: h→m, m→s
  s = s.replace(/h(\d)/, "h $1").replace(/m(\d)/, "m $1");
  return s;
}

interface ResultsStepProps {
  pairs: SelectedPair[];
  statsMap: Record<string, ForecastStats>;
  runs: ForecastRun[];
  isLoading: boolean;
  onRefresh: () => void;
  /** When a benchmark is running on the results page, pass the live status here
   *  so running pairs are shown with progress cards instead of results cards. */
  forecastStatus?: ForecasterStatus | null;
  benchmarkDone?: boolean;
  onCancelPair?: (pairName: string) => void;
  cancelingPairName?: string | null;
  onRerun?: (pair: ForecastPairStatus) => void;
}

/** Copies a plain-text summary of a pair's stats to the clipboard. */
function copyStatsAsText(
  pair: SelectedPair,
  stats: ForecastStats,
  pairRuns: ForecastRun[],
): void {
  const lines: string[] = [
    `${pair.sourceDatastore} → ${pair.targetDatastore}`,
    "",
    "Storage-offload estimate (for 1 TB transfer)",
    `  Expected:   ${stats.estimatePer1TB?.expected ?? "-"}`,
    `  Best case:  ${stats.estimatePer1TB?.bestCase ?? "-"}`,
    `  Worst case: ${stats.estimatePer1TB?.worstCase ?? "-"}`,
    "",
    "Throughput statistics",
    `  Samples:  ${stats.sampleCount}`,
    `  Mean:     ${stats.meanMbps?.toFixed(1) ?? "-"} MB/s`,
    `  Median:   ${stats.medianMbps?.toFixed(1) ?? "-"} MB/s`,
    `  Min/Max:  ${stats.minMbps?.toFixed(1) ?? "-"} / ${stats.maxMbps?.toFixed(1) ?? "-"} MB/s`,
    `  Std Dev:  ${stats.stddevMbps?.toFixed(1) ?? "-"} MB/s`,
    `  95% CI:   [${stats.ci95LowerMbps?.toFixed(1) ?? "-"}, ${stats.ci95UpperMbps?.toFixed(1) ?? "-"}] MB/s`,
  ];
  if (pairRuns.length > 0) {
    lines.push("", `Individual runs (${pairRuns.length})`);
    for (const r of pairRuns) {
      lines.push(
        `  Run ${r.iteration}: ${r.durationSec.toFixed(1)}s  ${r.throughputMbps.toFixed(1)} MB/s  ${r.method ?? "-"}`,
      );
    }
  }
  navigator.clipboard.writeText(lines.join("\n")).catch(() => undefined);
}

const ResultsStep: React.FC<ResultsStepProps> = ({
  pairs,
  statsMap,
  runs,
  isLoading,
  onRefresh,
  forecastStatus,
  benchmarkDone = true,
  onCancelPair,
  cancelingPairName,
  onRerun,
}) => {
  const cardsRef = useRef<HTMLDivElement>(null);
  const [expandedRuns, setExpandedRuns] = useState<Record<string, boolean>>({});
  const [openKebabId, setOpenKebabId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <EmptyState>
        <Spinner size="xl" />
        <EmptyStateBody>Loading results…</EmptyStateBody>
      </EmptyState>
    );
  }

  const toggleRuns = (pairName: string) =>
    setExpandedRuns((prev) => ({
      ...prev,
      [pairName]: !prev[pairName],
    }));

  // All pairs reported by the backend — used for the "all terminal" Re-run guard
  const livePairs = forecastStatus?.pairs ?? [];
  const allLivePairsTerminal =
    livePairs.length > 0 &&
    livePairs.every(
      (p) =>
        p.state === "completed" ||
        p.state === "canceled" ||
        p.state === "error",
    );

  // Backend running pairs whose source+target don't match any UI pair at all.
  // These are synthesised into SelectedPair so they can be rendered as running cards.
  const knownSourceTargetKeys = new Set(
    pairs.map((p) => `${p.sourceDatastore}||${p.targetDatastore}`),
  );
  const extraRunningPairs: SelectedPair[] = livePairs
    .filter(
      (fp) =>
        fp.state !== "completed" &&
        !knownSourceTargetKeys.has(
          `${fp.sourceDatastore}||${fp.targetDatastore}`,
        ),
    )
    .map((fp) => ({
      id: fp.pairName,
      name: fp.pairName,
      sourceDatastore: fp.sourceDatastore ?? "",
      targetDatastore: fp.targetDatastore ?? "",
    }));

  const copyAllAsText = () => {
    const sections: string[] = [];
    for (const p of pairs) {
      const stats = statsMap[p.name];
      if (!stats || stats.sampleCount === 0) continue;
      const pairRuns = runs.filter((r) => r.pairName === p.name);
      const lines: string[] = [
        `${p.sourceDatastore} → ${p.targetDatastore}`,
        "",
        "Storage-offload estimate (for 1 TB transfer)",
        `  Expected:   ${stats.estimatePer1TB?.expected ?? "-"}`,
        `  Best case:  ${stats.estimatePer1TB?.bestCase ?? "-"}`,
        `  Worst case: ${stats.estimatePer1TB?.worstCase ?? "-"}`,
        "",
        "Throughput statistics",
        `  Samples:  ${stats.sampleCount}`,
        `  Mean:     ${stats.meanMbps?.toFixed(1) ?? "-"} MB/s`,
        `  Median:   ${stats.medianMbps?.toFixed(1) ?? "-"} MB/s`,
        `  Min/Max:  ${stats.minMbps?.toFixed(1) ?? "-"} / ${stats.maxMbps?.toFixed(1) ?? "-"} MB/s`,
        `  Std Dev:  ${stats.stddevMbps?.toFixed(1) ?? "-"} MB/s`,
        `  95% CI:   [${stats.ci95LowerMbps?.toFixed(1) ?? "-"}, ${stats.ci95UpperMbps?.toFixed(1) ?? "-"}] MB/s`,
      ];
      if (pairRuns.length > 0) {
        lines.push("", `Individual runs (${pairRuns.length})`);
        for (const r of pairRuns) {
          lines.push(
            `  Run ${r.iteration}: ${r.durationSec.toFixed(1)}s  ${r.throughputMbps.toFixed(1)} MB/s  ${r.method ?? "-"}`,
          );
        }
      }
      sections.push(lines.join("\n"));
    }
    navigator.clipboard
      .writeText(sections.join("\n\n---\n\n"))
      .catch(() => undefined);
  };

  const hasAnyResults = pairs.some(
    (p) => statsMap[p.name] && statsMap[p.name].sampleCount > 0,
  );

  return (
    <Stack hasGutter>
      {hasAnyResults && (
        <StackItem>
          <Flex justifyContent={{ default: "justifyContentFlexEnd" }}>
            <FlexItem>
              <Button
                variant="link"
                icon={<CopyIcon />}
                iconPosition="start"
                onClick={copyAllAsText}
              >
                Copy all as plain text
              </Button>
            </FlexItem>
          </Flex>
        </StackItem>
      )}
      <StackItem>
        <div
          style={{
            display: "flex",
            gap: "24px",
            alignItems: "flex-start",
          }}
        >
          {/* Left: jump links navigation */}
          <div style={{ width: "260px", flexShrink: 0 }}>
            <JumpLinks
              isVertical
              label="Pair results"
              scrollableRef={cardsRef}
              offset={24}
            >
              {pairs.map((p) => {
                const liveStatus = forecastStatus?.pairs?.find(
                  (fp) =>
                    fp.pairName === p.name ||
                    (fp.sourceDatastore === p.sourceDatastore &&
                      fp.targetDatastore === p.targetDatastore),
                );
                const isActive =
                  !benchmarkDone &&
                  liveStatus &&
                  liveStatus.state !== "completed";
                return (
                  <JumpLinksItem key={p.name} href={`#result-card-${p.name}`}>
                    <span
                      style={{
                        display: "inline-block",
                        wordBreak: "break-word",
                        lineHeight: 1.4,
                      }}
                    >
                      {isActive && (
                        <Spinner
                          size="sm"
                          style={{
                            marginRight: "6px",
                            verticalAlign: "middle",
                          }}
                        />
                      )}
                      {pairLabel(p)}
                    </span>
                  </JumpLinksItem>
                );
              })}
              {extraRunningPairs.map((p) => (
                <JumpLinksItem key={p.name} href={`#result-card-${p.name}`}>
                  <span
                    style={{
                      display: "inline-block",
                      wordBreak: "break-word",
                      lineHeight: 1.4,
                    }}
                  >
                    <Spinner
                      size="sm"
                      style={{ marginRight: "6px", verticalAlign: "middle" }}
                    />
                    {pairLabel(p)}
                  </span>
                </JumpLinksItem>
              ))}
            </JumpLinks>
          </div>

          {/* Right: scrollable cards — running progress or results per pair */}
          <div
            ref={cardsRef}
            style={{
              flex: 1,
              minWidth: 0,
              maxHeight: "700px",
              overflowY: "auto",
            }}
          >
            <Stack hasGutter>
              {[...pairs, ...extraRunningPairs].map((p) => {
                const stats = statsMap[p.name];
                const pairRuns = runs.filter((r) => r.pairName === p.name);
                const isRunsExpanded = expandedRuns[p.name] ?? false;

                // Find live running status for this pair (if a benchmark is in progress).
                // Match by pairName first; fall back to source+target because the
                // backend may generate "{src}-to-{tgt}" names instead of using ours.
                const liveStatus = forecastStatus?.pairs?.find(
                  (fp) =>
                    fp.pairName === p.name ||
                    (fp.sourceDatastore === p.sourceDatastore &&
                      fp.targetDatastore === p.targetDatastore),
                );
                const isRunning =
                  !benchmarkDone &&
                  !!liveStatus &&
                  liveStatus.state !== "completed";

                // Running-card helpers (mirrors RunningStep logic)
                const isPreparing = liveStatus?.state === "preparing";
                const prepProgress =
                  isPreparing &&
                  liveStatus?.prepBytesTotal &&
                  liveStatus.prepBytesTotal > 0
                    ? Math.round(
                        ((liveStatus.prepBytesUploaded || 0) /
                          liveStatus.prepBytesTotal) *
                          100,
                      )
                    : undefined;
                const benchProgress =
                  liveStatus && liveStatus.totalRuns > 0
                    ? Math.round(
                        (liveStatus.completedRuns / liveStatus.totalRuns) * 100,
                      )
                    : 0;
                const stateColor = !liveStatus
                  ? "green"
                  : liveStatus.state === "completed"
                    ? "green"
                    : liveStatus.state === "error" ||
                        liveStatus.state === "canceled"
                      ? "red"
                      : "blue";
                // Only show "complete" when the pair is genuinely confirmed done.
                // When there is no live status yet the label stays undefined
                // (no badge shown) to avoid a misleading "complete" flash.
                const stateLabel: string | undefined = isRunning
                  ? liveStatus?.state
                  : liveStatus
                    ? liveStatus.state
                    : stats && stats.sampleCount > 0
                      ? "complete"
                      : undefined;
                const isCancelable =
                  !benchmarkDone &&
                  (liveStatus?.state === "running" ||
                    liveStatus?.state === "pending" ||
                    liveStatus?.state === "preparing");

                return (
                  <StackItem key={p.name}>
                    <Card id={`result-card-${p.name}`} isCompact>
                      <CardTitle>
                        <Flex
                          justifyContent={{
                            default: "justifyContentSpaceBetween",
                          }}
                          alignItems={{
                            default: "alignItemsCenter",
                          }}
                        >
                          <FlexItem>
                            <Content
                              component="h3"
                              style={{
                                fontWeight: 600,
                                margin: 0,
                                fontSize: "1.15rem",
                              }}
                            >
                              {p.sourceDatastore} → {p.targetDatastore}
                            </Content>
                            {liveStatus?.host && isRunning && (
                              <Content
                                component="small"
                                style={{
                                  color:
                                    "var(--pf-t--global--text--color--200)",
                                }}
                              >
                                Host: {liveStatus.host}
                              </Content>
                            )}
                          </FlexItem>
                          <FlexItem>
                            <Flex
                              gap={{ default: "gapSm" }}
                              alignItems={{
                                default: "alignItemsCenter",
                              }}
                            >
                              {!isRunning && stats && stats.sampleCount > 0 && (
                                <FlexItem>
                                  <Button
                                    variant="link"
                                    icon={<CopyIcon />}
                                    iconPosition="start"
                                    onClick={() =>
                                      copyStatsAsText(p, stats, pairRuns)
                                    }
                                  >
                                    Copy as plain text
                                  </Button>
                                </FlexItem>
                              )}
                              {stateLabel && (
                                <FlexItem>
                                  <Label color={stateColor}>{stateLabel}</Label>
                                </FlexItem>
                              )}
                              {isCancelable && (
                                <FlexItem>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => onCancelPair?.(p.name)}
                                    isLoading={cancelingPairName === p.name}
                                    isDisabled={cancelingPairName !== null}
                                  >
                                    Cancel benchmark
                                  </Button>
                                </FlexItem>
                              )}
                              {liveStatus &&
                                (isCancelable ||
                                  liveStatus.state === "canceled" ||
                                  liveStatus.state === "error") && (
                                  <FlexItem>
                                    <Dropdown
                                      isOpen={openKebabId === p.name}
                                      onOpenChange={(isOpen) =>
                                        !isOpen && setOpenKebabId(null)
                                      }
                                      onSelect={() => setOpenKebabId(null)}
                                      popperProps={{ position: "right" }}
                                      toggle={(toggleRef) => (
                                        <MenuToggle
                                          ref={toggleRef}
                                          variant="plain"
                                          onClick={() =>
                                            setOpenKebabId(
                                              openKebabId === p.name
                                                ? null
                                                : p.name,
                                            )
                                          }
                                          isExpanded={openKebabId === p.name}
                                          aria-label="Pair actions"
                                        >
                                          <EllipsisVIcon />
                                        </MenuToggle>
                                      )}
                                    >
                                      <DropdownList>
                                        {isCancelable && (
                                          <DropdownItem
                                            key="cancel"
                                            isDisabled={
                                              cancelingPairName !== null
                                            }
                                            onClick={() => {
                                              onCancelPair?.(p.name);
                                              setOpenKebabId(null);
                                            }}
                                          >
                                            Cancel benchmark
                                          </DropdownItem>
                                        )}
                                        {liveStatus &&
                                          (liveStatus.state === "canceled" ||
                                            liveStatus.state === "error") && (
                                            <DropdownItem
                                              key="rerun"
                                              isDisabled={!allLivePairsTerminal}
                                              onClick={() => {
                                                if (allLivePairsTerminal)
                                                  onRerun?.(liveStatus);
                                                setOpenKebabId(null);
                                              }}
                                            >
                                              Re-run benchmark
                                            </DropdownItem>
                                          )}
                                      </DropdownList>
                                    </Dropdown>
                                  </FlexItem>
                                )}
                            </Flex>
                          </FlexItem>
                        </Flex>
                      </CardTitle>

                      <CardBody>
                        {/* ── Running card body ── show whenever liveStatus is
                            non-terminal, regardless of the benchmarkDone flag */}
                        {liveStatus && liveStatus.state !== "completed" ? (
                          <>
                            {liveStatus.state === "error" && (
                              <>
                                <Content
                                  component="small"
                                  style={{ display: "block" }}
                                >
                                  Benchmark runs: {liveStatus.completedRuns} /{" "}
                                  {liveStatus.totalRuns}
                                </Content>
                                <Alert
                                  variant="danger"
                                  title={
                                    liveStatus.error ??
                                    "An unexpected error occurred"
                                  }
                                  isInline
                                  style={{ marginTop: "8px" }}
                                />
                              </>
                            )}
                            {liveStatus.state === "canceled" && (
                              <Alert
                                variant="warning"
                                title="Estimate cancelled"
                                isInline
                              >
                                Cancelled run: The estimate was stopped before
                                completion. You can run again when ready.
                              </Alert>
                            )}
                            {liveStatus.state === "pending" && (
                              <Content
                                component="small"
                                style={{
                                  display: "block",
                                  fontStyle: "italic",
                                }}
                              >
                                Pending
                              </Content>
                            )}
                            {(isPreparing ||
                              liveStatus.state === "running") && (
                              <>
                                <Content
                                  component="small"
                                  style={{ display: "block" }}
                                >
                                  Benchmark runs: {liveStatus.completedRuns} /{" "}
                                  {liveStatus.totalRuns}
                                </Content>
                                <PairProgressBars
                                  prepProgress={prepProgress}
                                  benchProgress={benchProgress}
                                  isPreparing={isPreparing}
                                  sourceDatastore={p.sourceDatastore}
                                  targetDatastore={p.targetDatastore}
                                />
                              </>
                            )}
                            {(liveStatus.state === "canceled" ||
                              liveStatus.state === "error") && (
                              <Button
                                variant="primary"
                                isBlock
                                isDisabled={!allLivePairsTerminal}
                                style={{ marginTop: "8px" }}
                                title={
                                  !allLivePairsTerminal
                                    ? "Wait for all pairs to finish"
                                    : undefined
                                }
                                onClick={() =>
                                  allLivePairsTerminal && onRerun?.(liveStatus)
                                }
                              >
                                Re-run benchmark
                              </Button>
                            )}
                          </>
                        ) : stats && stats.sampleCount > 0 ? (
                          <Grid hasGutter>
                            {/* Left: Storage-offload estimate */}
                            <GridItem span={5}>
                              <Card
                                style={{
                                  background:
                                    "var(--pf-t--global--background--color--200)",
                                  height: "100%",
                                }}
                              >
                                <CardBody
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    textAlign: "center",
                                    padding: "24px 16px",
                                  }}
                                >
                                  <Content
                                    component="small"
                                    style={{
                                      display: "block",
                                      fontWeight: 600,
                                      letterSpacing: "0.04em",
                                      textTransform: "uppercase",
                                      color:
                                        "var(--pf-t--global--text--color--200)",
                                      marginBottom: "16px",
                                    }}
                                  >
                                    Storage-offload estimate
                                  </Content>
                                  <Content
                                    component="p"
                                    style={{
                                      fontSize: "2.4rem",
                                      fontWeight: 700,
                                      lineHeight: 1.1,
                                      margin: "0 0 4px",
                                    }}
                                  >
                                    {formatGoDuration(
                                      stats.estimatePer1TB?.expected ?? "-",
                                    )}
                                  </Content>
                                  <Content
                                    component="p"
                                    style={{
                                      display: "block",
                                      fontSize: "0.95rem",
                                      color:
                                        "var(--pf-t--global--text--color--100)",
                                      marginBottom: "16px",
                                    }}
                                  >
                                    Expected time estimate for 1 TB transfer
                                  </Content>
                                </CardBody>
                              </Card>
                            </GridItem>

                            {/* Right: Throughput statistics */}
                            <GridItem span={7}>
                              <Content
                                component="p"
                                style={{ marginBottom: "8px" }}
                              >
                                Throughput statistics
                              </Content>
                              <Grid hasGutter>
                                {[
                                  {
                                    label: "Samples",
                                    value: String(stats.sampleCount),
                                  },
                                  {
                                    label: "Min/max",
                                    value: `${stats.minMbps?.toFixed(1) ?? "-"} / ${stats.maxMbps?.toFixed(1) ?? "-"} MB/s`,
                                  },
                                  {
                                    label: "Mean",
                                    value: `${stats.meanMbps?.toFixed(1) ?? "-"} MB/s`,
                                  },
                                  {
                                    label: "Std Dev",
                                    value: `${stats.stddevMbps?.toFixed(1) ?? "-"} MB/s`,
                                  },
                                  {
                                    label: "Median",
                                    value: `${stats.medianMbps?.toFixed(1) ?? "-"} MB/s`,
                                  },
                                  {
                                    label: "95% CI",
                                    value: `[${stats.ci95LowerMbps?.toFixed(1) ?? "-"}, ${stats.ci95UpperMbps?.toFixed(1) ?? "-"}] MB/s`,
                                  },
                                ].map(({ label, value }) => (
                                  <GridItem span={6} key={label}>
                                    <Card isCompact>
                                      <CardBody>
                                        <Content
                                          component="small"
                                          style={{
                                            display: "block",
                                            color:
                                              "var(--pf-t--global--text--color--200)",
                                          }}
                                        >
                                          {label}
                                        </Content>
                                        <Content
                                          component="p"
                                          style={{ margin: 0 }}
                                        >
                                          {value}
                                        </Content>
                                      </CardBody>
                                    </Card>
                                  </GridItem>
                                ))}
                              </Grid>
                            </GridItem>
                          </Grid>
                        ) : (
                          <Alert
                            variant="info"
                            title="No results yet"
                            isInline
                            actionLinks={
                              <>
                                <Button
                                  variant="link"
                                  isInline
                                  onClick={onRefresh}
                                >
                                  Refresh results
                                </Button>
                                {onRerun &&
                                  benchmarkDone &&
                                  forecastStatus?.state !== "running" && (
                                    <Button
                                      variant="link"
                                      isInline
                                      onClick={() =>
                                        onRerun({
                                          pairName: p.name,
                                          sourceDatastore: p.sourceDatastore,
                                          targetDatastore: p.targetDatastore,
                                          state: "error",
                                          completedRuns: 0,
                                          totalRuns: 0,
                                        })
                                      }
                                    >
                                      Re-run benchmark
                                    </Button>
                                  )}
                              </>
                            }
                          >
                            No estimation runs found for this pair.
                          </Alert>
                        )}
                      </CardBody>

                      {/* Individual runs table — only shown when the pair has results */}
                      {!isRunning && pairRuns.length > 0 && (
                        <CardBody
                          style={{
                            borderTop:
                              "1px solid var(--pf-t--global--border--color--100)",
                            paddingTop: "8px",
                          }}
                        >
                          <ExpandableSection
                            toggleText={`Individual runs (${pairRuns.length})`}
                            isExpanded={isRunsExpanded}
                            onToggle={() => toggleRuns(p.name)}
                          >
                            <table
                              style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                fontSize: "0.875rem",
                              }}
                            >
                              <thead>
                                <tr
                                  style={{
                                    borderBottom:
                                      "1px solid var(--pf-t--global--border--color--100)",
                                  }}
                                >
                                  <th
                                    style={{
                                      textAlign: "left",
                                      padding: "4px 8px",
                                    }}
                                  >
                                    Run
                                  </th>
                                  <th
                                    style={{
                                      textAlign: "left",
                                      padding: "4px 8px",
                                    }}
                                  >
                                    Duration (s)
                                  </th>
                                  <th
                                    style={{
                                      textAlign: "left",
                                      padding: "4px 8px",
                                    }}
                                  >
                                    Throughput (MB/s)
                                  </th>
                                  <th
                                    style={{
                                      textAlign: "left",
                                      padding: "4px 8px",
                                    }}
                                  >
                                    Method
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {(() => {
                                  // Group by sessionId, sort sessions and iterations ascending
                                  const sessionMap = new Map<
                                    number,
                                    ForecastRun[]
                                  >();
                                  for (const r of pairRuns) {
                                    const bucket =
                                      sessionMap.get(r.sessionId) ?? [];
                                    bucket.push(r);
                                    sessionMap.set(r.sessionId, bucket);
                                  }
                                  const sortedSessions = [
                                    ...sessionMap.entries(),
                                  ].sort(([a], [b]) => a - b);
                                  const rows: React.ReactNode[] = [];
                                  sortedSessions.forEach(
                                    ([sessionId, sessionRuns], idx) => {
                                      rows.push(
                                        <tr key={`session-header-${sessionId}`}>
                                          <td
                                            colSpan={4}
                                            style={{
                                              padding: "6px 8px 2px",
                                              fontWeight: 600,
                                              fontSize: "0.8rem",
                                              color:
                                                "var(--pf-t--global--text--color--200)",
                                              background:
                                                "var(--pf-t--global--background--color--100)",
                                              borderTop:
                                                idx > 0
                                                  ? "2px solid var(--pf-t--global--border--color--100)"
                                                  : undefined,
                                            }}
                                          >
                                            Session {idx + 1}
                                          </td>
                                        </tr>,
                                      );
                                      const sorted = [...sessionRuns].sort(
                                        (a, b) => a.iteration - b.iteration,
                                      );
                                      for (const r of sorted) {
                                        rows.push(
                                          <tr
                                            key={r.id}
                                            style={{
                                              borderBottom:
                                                "1px solid var(--pf-t--global--border--color--100)",
                                            }}
                                          >
                                            <td style={{ padding: "4px 8px" }}>
                                              {r.iteration}
                                            </td>
                                            <td style={{ padding: "4px 8px" }}>
                                              {r.durationSec.toFixed(1)}
                                            </td>
                                            <td style={{ padding: "4px 8px" }}>
                                              {r.throughputMbps.toFixed(1)}
                                            </td>
                                            <td style={{ padding: "4px 8px" }}>
                                              {r.method ?? "-"}
                                            </td>
                                          </tr>,
                                        );
                                      }
                                    },
                                  );
                                  return rows;
                                })()}
                              </tbody>
                            </table>
                          </ExpandableSection>
                        </CardBody>
                      )}
                    </Card>
                  </StackItem>
                );
              })}
            </Stack>
          </div>
        </div>
      </StackItem>
    </Stack>
  );
};

// ── Storage Offload Tab ───────────────────────────────────────────────────────

type WizardStepId = "credentials" | "select-pairs" | "running" | "results";

interface StorageOffloadTabProps {
  basePath: string;
}

// ── Session-storage persistence ───────────────────────────────────────────────
// Keeps the full wizard state for the browser-tab session so that switching
// to another tab and back doesn't reset the form or re-fetch datastores.
// The password is intentionally never stored (mirrors the deep inspector pattern).

const SESSION_KEY = "forecaster-wizard-state";

interface PersistedWizardState {
  url: string;
  username: string;
  activeStep: WizardStepId;
  datastores: ForecasterDatastore[];
  pairs: SelectedPair[];
}

function loadWizardState(): Partial<PersistedWizardState> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw) as PersistedWizardState;
  } catch (_) {
    // ignore corrupt data
  }
  return {};
}

function saveWizardState(state: PersistedWizardState): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch (_) {
    // ignore if sessionStorage is unavailable
  }
}

function clearWizardState(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch (_) {
    // ignore
  }
}

export const StorageOffloadTab: React.FC<StorageOffloadTabProps> = ({
  basePath,
}) => {
  // Restore the full wizard state from sessionStorage on mount so that tab
  // switches don't reset the form or reload datastores.
  const _saved = loadWizardState();

  const [activeStep, setActiveStep] = useState<WizardStepId>(
    _saved.activeStep ?? "credentials",
  );

  // Credentials — url/username are restored from sessionStorage on mount.
  // Password is never persisted (mirrors the deep inspector pattern).
  const [credentials, setCredentials] = useState<ForecasterCredentials>({
    url: _saved.url ?? "",
    username: _saved.username ?? "",
    password: "",
  });
  const [credError, setCredError] = useState<string | null>(null);
  const [credMissingPrivileges, setCredMissingPrivileges] = useState<string[]>(
    [],
  );
  const [credLoading, setCredLoading] = useState(false);

  // Datastores & pair selection — restored from sessionStorage when available
  const [datastores, setDatastores] = useState<ForecasterDatastore[]>(
    _saved.datastores ?? [],
  );
  const [dsGroups, setDsGroups] = useState<DatastoreGroup[]>(
    _saved.datastores ? groupDatastoresByArray(_saved.datastores) : [],
  );
  const [dsLoading, setDsLoading] = useState(false);
  const [dsError, setDsError] = useState<string | null>(null);
  const [pairs, setPairs] = useState<SelectedPair[]>(
    _saved.pairs ?? [
      {
        id: "pair-0",
        name: "pair-0",
        sourceDatastore: "",
        targetDatastore: "",
      },
    ],
  );

  // Benchmark run
  const [forecastStatus, setForecastStatus] = useState<ForecasterStatus | null>(
    null,
  );
  // benchmarkDone: true once state transitions from "running" back to "ready"
  const [benchmarkDone, setBenchmarkDone] = useState(false);
  const [cancelingPairName, setCancelingPairName] = useState<string | null>(
    null,
  );

  // "I understand" checkbox state — credentials step
  const [credAcknowledged, setCredAcknowledged] = useState(false);
  // "I understand" checkbox state — select-pairs step
  const [pairsVmAcknowledged, setPairsVmAcknowledged] = useState(false);
  // "I understand" checkbox state — add-pairs modal
  const [modalVmAcknowledged, setModalVmAcknowledged] = useState(false);
  // Whether any complete pair has zero capabilities
  const [pairsHaveNoCaps, setPairsHaveNoCaps] = useState(false);
  // Whether any modal pair has zero capabilities
  const [modalPairsHaveNoCaps, setModalPairsHaveNoCaps] = useState(false);

  // "Add more datastore pairs" modal
  const [isAddPairsModalOpen, setIsAddPairsModalOpen] = useState(false);
  const [modalPairs, setModalPairs] = useState<SelectedPair[]>([
    {
      id: "modal-pair-0",
      name: "modal-pair-0",
      sourceDatastore: "",
      targetDatastore: "",
    },
  ]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Tracks whether we have seen state="running" so we can detect the "ready" transition
  const wasRunningRef = useRef(false);
  // Prevents the auto-trigger from looping if getStats returns empty on restore
  const hasAutoLoadedResultsRef = useRef(false);

  // Results
  const [resultsLoading, setResultsLoading] = useState(false);
  const [statsMap, setStatsMap] = useState<Record<string, ForecastStats>>({});
  const [allRuns, setAllRuns] = useState<ForecastRun[]>([]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // On mount (fresh browser session, new tab, etc.), probe the backend to
  // detect an already-running or recently-completed benchmark. sessionStorage
  // is tab-scoped, so a new tab/session has no saved state. Without this
  // probe the estimator would reset to the credentials step even if the
  // forecaster is actively running on the server.
  const hadSavedSession = useRef(!!_saved.activeStep);
  useEffect(() => {
    // Only act when no session was restored (i.e. truly fresh load)
    if (hadSavedSession.current) return;

    let cancelled = false;

    const probe = async () => {
      try {
        const status = await getForecasterStatus(basePath);
        if (cancelled) return;

        if (status.state === "running") {
          // Rebuild pairs from the backend status so the UI has something
          // to display. Credentials aren't available but polling/display
          // still works without them.
          const backendPairs = (status.pairs ?? []).map(
            forecastPairToSelectedPair,
          );
          if (backendPairs.length > 0) setPairs(backendPairs);

          setForecastStatus(status);
          setBenchmarkDone(false);
          wasRunningRef.current = true;
          setActiveStep("running");
          return;
        }

        // Forecaster is idle — check if historical runs exist
        const runs = await getRuns(basePath);
        if (cancelled || runs.length === 0) return;

        // Derive pair names from historical runs
        const runsByPair = new Map<string, ForecastRun>();
        for (const r of runs) {
          if (!runsByPair.has(r.pairName)) runsByPair.set(r.pairName, r);
        }
        const backendPairs: SelectedPair[] = Array.from(
          runsByPair.entries(),
        ).map(([name, run]) => ({
          id: name,
          name,
          sourceDatastore: run.sourceDatastore,
          targetDatastore: run.targetDatastore,
        }));
        setPairs(backendPairs);
        setAllRuns(runs);
        setBenchmarkDone(true);
        setActiveStep("results");
        hasAutoLoadedResultsRef.current = false;
      } catch (_) {
        // Forecaster may not be reachable — stay on default step
      }
    };

    probe();

    return () => {
      cancelled = true;
    };
  }, [basePath]);

  // Persist wizard state on every relevant change (password excluded)
  useEffect(() => {
    // Only save when we have at least a url (avoid storing empty state)
    if (!credentials.url && !activeStep) return;
    saveWizardState({
      url: credentials.url,
      username: credentials.username,
      activeStep,
      datastores,
      pairs,
    });
  }, [credentials.url, credentials.username, activeStep, datastores, pairs]);

  const reset = useCallback(() => {
    stopPolling();
    wasRunningRef.current = false;
    hasAutoLoadedResultsRef.current = false;
    clearWizardState();
    setActiveStep("credentials");
    setCredentials({ url: "", username: "", password: "" });
    setCredError(null);
    setCredMissingPrivileges([]);
    setDatastores([]);
    setDsGroups([]);
    setPairs([
      {
        id: "pair-0",
        name: "pair-0",
        sourceDatastore: "",
        targetDatastore: "",
      },
    ]);
    setForecastStatus(null);
    setBenchmarkDone(false);
    setStatsMap({});
    setAllRuns([]);
    setCredAcknowledged(false);
    setPairsVmAcknowledged(false);
    setModalVmAcknowledged(false);
    setPairsHaveNoCaps(false);
    setModalPairsHaveNoCaps(false);
  }, [stopPolling]);

  // ── Step 1 → Step 2: validate credentials & fetch datastores ──
  const handleSaveCredentials = useCallback(async () => {
    if (!credentials.url || !credentials.username || !credentials.password) {
      setCredError("All fields are required.");
      return;
    }
    setCredError(null);
    setCredMissingPrivileges([]);
    setCredLoading(true);
    try {
      // Call both endpoints: POST /collector (triggers collection) and
      // PUT /forecaster/credentials (forecaster preflight check).
      await Promise.all([
        postCredentials(basePath, credentials),
        putCredentials(basePath, credentials),
      ]);
      setDsLoading(true);
      setActiveStep("select-pairs");
      const dsList = await postDatastores(basePath);
      setDatastores(dsList);
      setDsGroups(groupDatastoresByArray(dsList));
    } catch (e) {
      if (e instanceof CredentialsForbiddenError) {
        setCredError(e.message);
        setCredMissingPrivileges(e.missingPrivileges);
      } else {
        setCredError(e instanceof Error ? e.message : String(e));
      }
      setActiveStep("credentials");
    } finally {
      setCredLoading(false);
      setDsLoading(false);
    }
  }, [basePath, credentials]);

  const loadResults = useCallback(
    async (pairNames: string[]) => {
      if (pairNames.length === 0) {
        setActiveStep("results");
        return;
      }
      setResultsLoading(true);
      try {
        // Use allSettled so a single failure doesn't discard all other results.
        const [runsResult, ...statsResults] = await Promise.allSettled([
          getRuns(basePath),
          ...pairNames.map((n) => getStats(basePath, n)),
        ]);

        if (runsResult.status === "fulfilled") {
          setAllRuns(runsResult.value);
        }

        const map: Record<string, ForecastStats> = {};
        statsResults.forEach((r, i) => {
          if (r.status === "fulfilled") {
            map[pairNames[i]] = r.value;
          }
        });
        setStatsMap(map);
      } finally {
        setResultsLoading(false);
        setActiveStep("results");
      }
    },
    [basePath],
  );

  // When the session restores activeStep === "results" the statsMap is empty
  // because it is not persisted. Re-fetch results automatically — but only once.
  // Guards:
  //   - hasAutoLoadedResultsRef prevents an infinite loop when getStats returns empty
  //   - pollRef.current !== null means a benchmark is still running; the poll
  //     will call loadResults itself when it detects completion
  useEffect(() => {
    if (
      activeStep !== "results" ||
      resultsLoading ||
      hasAutoLoadedResultsRef.current ||
      pollRef.current !== null
    ) {
      return;
    }
    hasAutoLoadedResultsRef.current = true;
    const validPairNames = pairs
      .filter((p) => p.sourceDatastore && p.targetDatastore)
      .map((p) => p.name);
    loadResults(validPairNames);
  }, [activeStep, resultsLoading, pairs, loadResults]);

  // When the results page is active, check whether the forecaster is still
  // running and resume polling so live progress cards are shown alongside
  // existing results. We intentionally do NOT guard on `benchmarkDone` here
  // because a new benchmark may have started after the previous one finished.
  // The `cancelled` flag ensures the async chain self-terminates when React's
  // cleanup runs (StrictMode double-invoke or dep change), preventing orphaned
  // setInterval calls that would keep triggering loadResults on every tick.
  useEffect(() => {
    if (activeStep !== "results" || pollRef.current !== null) {
      return;
    }

    let cancelled = false;

    const checkStatus = async () => {
      try {
        const status = await getForecasterStatus(basePath);
        if (cancelled) return;
        setForecastStatus(status);
        if (status.state !== "running") {
          setBenchmarkDone(true);
          return;
        }

        // A benchmark is (still) running — possibly a new one started after
        // the previous one completed. Ensure the UI shows progress cards.
        wasRunningRef.current = true;
        setBenchmarkDone(false);

        const knownPairNames = pairs
          .filter((p) => p.sourceDatastore && p.targetDatastore)
          .map((p) => p.name);

        const pollId = setInterval(async () => {
          if (cancelled) {
            clearInterval(pollId);
            return;
          }
          try {
            const s = await getForecasterStatus(basePath);
            if (cancelled) return;
            setForecastStatus(s);
            if (s.state === "running") wasRunningRef.current = true;
            if (wasRunningRef.current && s.state === "ready") {
              stopPolling();
              setBenchmarkDone(true);
              await loadResults(knownPairNames);
            }
          } catch (_) {
            // keep polling on transient errors
          }
        }, 2000);

        // Register in pollRef so stopPolling() can clear it
        pollRef.current = pollId;
      } catch (_) {
        // ignore — forecaster may not be reachable yet
      }
    };

    checkStatus();

    return () => {
      cancelled = true;
    };
  }, [activeStep, basePath, pairs, stopPolling, loadResults]);

  // Resume polling when the session is restored with activeStep === "running"
  // (e.g. after a page refresh). handleStartBenchmark already sets up the poll
  // when the user clicks "Run", so we only act when no poll is running yet.
  useEffect(() => {
    if (activeStep !== "running" || pollRef.current !== null || benchmarkDone) {
      return;
    }

    // Pre-arm wasRunningRef: the benchmark was running when we last persisted,
    // so a "ready" response on first poll means it has since finished.
    wasRunningRef.current = true;

    const validPairNames = pairs
      .filter((p) => p.sourceDatastore && p.targetDatastore)
      .map((p) => p.name);

    const poll = async () => {
      try {
        const status = await getForecasterStatus(basePath);
        setForecastStatus(status);
        if (status.state === "running") {
          wasRunningRef.current = true;
        }
        if (wasRunningRef.current && status.state === "ready") {
          stopPolling();
          setBenchmarkDone(true);
          await loadResults(validPairNames);
        }
      } catch (_) {
        // keep polling on transient network errors
      }
    };

    poll();
    pollRef.current = setInterval(poll, 2000);
  }, [activeStep, benchmarkDone, basePath, pairs, stopPolling, loadResults]);

  // Redirect to the running step showing an existing benchmark's live status.
  // Used when a conflict is detected (another session already started a run).
  const redirectToRunningBenchmark = useCallback(async (): Promise<boolean> => {
    try {
      const status = await getForecasterStatus(basePath);
      setForecastStatus(status);

      if (status.state === "running") {
        const backendPairs = (status.pairs ?? []).map(
          forecastPairToSelectedPair,
        );
        if (backendPairs.length > 0) setPairs(backendPairs);
        setBenchmarkDone(false);
        wasRunningRef.current = true;
        setActiveStep("running");
        return true;
      }

      return false;
    } catch (_) {
      return false;
    }
  }, [basePath]);

  // ── Step 2 → Step 3: start benchmark ──
  const handleStartBenchmark = useCallback(async () => {
    const validPairs = pairs.filter(
      (p) => p.sourceDatastore && p.targetDatastore,
    );
    if (validPairs.length === 0) {
      setDsError("Select at least one complete pair.");
      return;
    }
    setDsError(null);

    // Pre-flight: check if another session already started a benchmark.
    // Avoids the jarring flash of switching to "running" only to immediately
    // get a 409 and redirect.
    try {
      const currentStatus = await getForecasterStatus(basePath);
      if (currentStatus.state === "running") {
        setForecastStatus(currentStatus);
        const backendPairs = (currentStatus.pairs ?? []).map(
          forecastPairToSelectedPair,
        );
        if (backendPairs.length > 0) setPairs(backendPairs);
        setBenchmarkDone(false);
        wasRunningRef.current = true;
        setActiveStep("running");
        return;
      }
    } catch (_) {
      // If the status check fails, proceed with the start attempt anyway;
      // the server will reject with 409 if needed.
    }

    setForecastStatus(null);
    setBenchmarkDone(false);
    wasRunningRef.current = false;

    // Set a sentinel on pollRef BEFORE switching to "running" so the
    // "resume running" useEffect (designed for page-refresh recovery) does not
    // fire and start polling GET /forecaster before the POST has been sent.
    // We replace it with the real interval once startForecast resolves.
    pollRef.current = -1 as unknown as ReturnType<typeof setInterval>;
    setActiveStep("running");

    try {
      await startForecast(basePath, {
        credentials,
        pairs: validPairs.map((p) => ({
          name: p.name,
          sourceDatastore: p.sourceDatastore,
          targetDatastore: p.targetDatastore,
        })),
      });
      // Pre-arm so the first poll treats "ready" as "just finished"
      // (benchmark may complete before the poll interval fires)
      wasRunningRef.current = true;
    } catch (err) {
      pollRef.current = null; // clear sentinel on failure

      if (err instanceof ForecastConflictError) {
        const redirected = await redirectToRunningBenchmark();
        if (!redirected) {
          setForecastStatus({
            state: "ready",
            pairs: [
              {
                pairName: "conflict-error",
                sourceDatastore: "",
                targetDatastore: "",
                state: "error",
                error:
                  "A benchmark was started by another session but is no longer running. Please try again.",
                completedRuns: 0,
                totalRuns: 0,
              },
            ],
          });
          setBenchmarkDone(true);
        }
        return;
      }

      setForecastStatus({
        state: "ready",
        pairs: [
          {
            pairName: "start-error",
            sourceDatastore: "",
            targetDatastore: "",
            state: "error",
            error: err instanceof Error ? err.message : String(err),
            completedRuns: 0,
            totalRuns: 0,
          },
        ],
      });
      setBenchmarkDone(true);
      return;
    }

    // Poll GET /forecaster until state returns to "ready"
    // (the API no longer has "completed" / "canceled" / "error" at the top level)
    const poll = async () => {
      try {
        const status = await getForecasterStatus(basePath);
        setForecastStatus(status);

        if (status.state === "running") {
          wasRunningRef.current = true;
        }

        // Completion: state returned to "ready" after having been "running"
        if (wasRunningRef.current && status.state === "ready") {
          stopPolling();
          setBenchmarkDone(true);
          // Always try to load results — show whatever is available
          await loadResults(validPairs.map((p) => p.name));
        }
      } catch (_) {
        // keep polling on transient errors
      }
    };

    // Replace the sentinel with the real interval
    pollRef.current = null;
    poll();
    pollRef.current = setInterval(poll, 2000);
  }, [
    basePath,
    credentials,
    pairs,
    stopPolling,
    loadResults,
    redirectToRunningBenchmark,
  ]);

  const closeAddPairsModal = useCallback(() => {
    setIsAddPairsModalOpen(false);
    setModalPairs([
      {
        id: "modal-pair-0",
        name: "modal-pair-0",
        sourceDatastore: "",
        targetDatastore: "",
      },
    ]);
    setModalVmAcknowledged(false);
    setModalPairsHaveNoCaps(false);
  }, []);

  // ── Run benchmark from "Add more datastore pairs" modal ──
  // Stays on the results page — the running progress is shown inline above
  // the existing results so the user keeps their previous data visible.
  const handleRunFromModal = useCallback(async () => {
    const validPairs = modalPairs.filter(
      (p) => p.sourceDatastore && p.targetDatastore,
    );
    if (validPairs.length === 0) return;

    closeAddPairsModal();

    // Reset running state but keep activeStep === "results"
    setForecastStatus(null);
    setBenchmarkDone(false);
    wasRunningRef.current = false;

    try {
      await startForecast(basePath, {
        credentials,
        pairs: validPairs.map((p) => ({
          name: p.name,
          sourceDatastore: p.sourceDatastore,
          targetDatastore: p.targetDatastore,
        })),
      });
      wasRunningRef.current = true;
    } catch (err) {
      if (err instanceof ForecastConflictError) {
        const redirected = await redirectToRunningBenchmark();
        if (!redirected) {
          setForecastStatus({
            state: "ready",
            pairs: [
              {
                pairName: "conflict-error",
                sourceDatastore: "",
                targetDatastore: "",
                state: "error",
                error:
                  "A benchmark was started by another session but is no longer running. Please try again.",
                completedRuns: 0,
                totalRuns: 0,
              },
            ],
          });
          setBenchmarkDone(true);
        }
        return;
      }

      setForecastStatus({
        state: "ready",
        pairs: [
          {
            pairName: "start-error",
            sourceDatastore: "",
            targetDatastore: "",
            state: "error",
            error: err instanceof Error ? err.message : String(err),
            completedRuns: 0,
            totalRuns: 0,
          },
        ],
      });
      setBenchmarkDone(true);
      return;
    }

    // Merge new pairs into main pairs state so results page includes them
    setPairs((prev) => {
      const existingNames = new Set(prev.map((p) => p.name));
      const toAdd = validPairs.filter((p) => !existingNames.has(p.name));
      return [...prev, ...toAdd];
    });

    // Collect unique pair names (existing + new) for the results reload
    const allPairNames = [
      ...pairs
        .filter((p) => p.sourceDatastore && p.targetDatastore)
        .map((p) => p.name),
      ...validPairs.map((p) => p.name),
    ].filter((v, i, a) => a.indexOf(v) === i);

    const poll = async () => {
      try {
        const status = await getForecasterStatus(basePath);
        setForecastStatus(status);
        if (status.state === "running") {
          wasRunningRef.current = true;
        }
        if (wasRunningRef.current && status.state === "ready") {
          stopPolling();
          setBenchmarkDone(true);
          await loadResults(allPairNames);
        }
      } catch (_) {
        // keep polling on transient errors
      }
    };

    poll();
    pollRef.current = setInterval(poll, 2000);
  }, [
    basePath,
    credentials,
    pairs,
    modalPairs,
    closeAddPairsModal,
    stopPolling,
    loadResults,
    redirectToRunningBenchmark,
  ]);

  // ── Cancel benchmark ──
  const handleCancelPair = useCallback(
    async (pairName: string) => {
      setCancelingPairName(pairName);
      try {
        await cancelForecastPair(basePath, pairName);
        setForecastStatus((prev) =>
          prev
            ? {
                ...prev,
                pairs: (prev.pairs ?? []).map((p) =>
                  p.pairName === pairName
                    ? { ...p, state: "canceled" as const }
                    : p,
                ),
              }
            : prev,
        );
      } catch (_) {
        // poll will reconcile the real state
      } finally {
        setCancelingPairName(null);
      }
    },
    [basePath],
  );

  // ── Re-run a single canceled / errored pair ──
  const handleRerun = useCallback(
    async (pair: ForecastPairStatus) => {
      stopPolling();
      setBenchmarkDone(false);
      wasRunningRef.current = false;

      // Always use the datastores from the ForecastPairStatus (the actual
      // pair that ran), never from the mutable UI `pairs` selection state
      // which may have been edited since the benchmark started.
      const rerunPair = {
        name: pair.pairName,
        sourceDatastore: pair.sourceDatastore,
        targetDatastore: pair.targetDatastore,
      };

      // Optimistically mark this pair as pending in the displayed status
      const pendingPair: ForecastPairStatus = {
        pairName: pair.pairName,
        sourceDatastore: pair.sourceDatastore,
        targetDatastore: pair.targetDatastore,
        state: "pending" as const,
        completedRuns: 0,
        totalRuns: 0,
      };
      setForecastStatus((prev) => {
        const base = prev ?? { state: "ready" as const, pairs: [] };
        const existingPairs = base.pairs ?? [];
        return {
          ...base,
          state: "running",
          pairs: existingPairs.some((p) => p.pairName === pair.pairName)
            ? existingPairs.map((p) =>
                p.pairName === pair.pairName
                  ? { ...p, ...pendingPair, error: undefined }
                  : p,
              )
            : [...existingPairs, pendingPair],
        };
      });

      try {
        await startForecast(basePath, {
          credentials,
          pairs: [
            {
              name: rerunPair.name,
              sourceDatastore: rerunPair.sourceDatastore,
              targetDatastore: rerunPair.targetDatastore,
            },
          ],
        });
        wasRunningRef.current = true;
      } catch (err) {
        if (err instanceof ForecastConflictError) {
          const redirected = await redirectToRunningBenchmark();
          if (!redirected) {
            setBenchmarkDone(true);
            setForecastStatus((prev) => {
              const base = prev ?? { state: "ready" as const, pairs: [] };
              return {
                ...base,
                state: "ready",
                pairs: (base.pairs ?? []).map((p) =>
                  p.pairName === pair.pairName
                    ? {
                        ...p,
                        state: "error" as const,
                        error:
                          "A benchmark was started by another session but is no longer running. Please try again.",
                      }
                    : p,
                ),
              };
            });
          }
          return;
        }

        setBenchmarkDone(true);
        setForecastStatus((prev) => {
          const base = prev ?? { state: "ready" as const, pairs: [] };
          return {
            ...base,
            state: "ready",
            pairs: (base.pairs ?? []).map((p) =>
              p.pairName === pair.pairName
                ? {
                    ...p,
                    state: "error" as const,
                    error: err instanceof Error ? err.message : String(err),
                  }
                : p,
            ),
          };
        });
        return;
      }

      const poll = async () => {
        try {
          const status = await getForecasterStatus(basePath);
          setForecastStatus(status);
          if (status.state === "running") {
            wasRunningRef.current = true;
          }
          if (wasRunningRef.current && status.state === "ready") {
            stopPolling();
            setBenchmarkDone(true);
            const pairNames = (status.pairs ?? []).map((p) => p.pairName);
            await loadResults(pairNames);
          }
        } catch (_) {
          // keep polling on transient errors
        }
      };

      poll();
      pollRef.current = setInterval(poll, 2000);
    },
    [
      basePath,
      credentials,
      stopPolling,
      loadResults,
      redirectToRunningBenchmark,
    ],
  );

  const canGoToStep2 =
    !!credentials.url &&
    !!credentials.username &&
    !!credentials.password &&
    credAcknowledged;

  const canStartBenchmark =
    pairs.some((p) => p.sourceDatastore && p.targetDatastore) &&
    !pairsHaveNoCaps &&
    pairsVmAcknowledged;

  // ── Step indicator ──
  const steps: { id: WizardStepId; name: string }[] = [
    { id: "credentials", name: "Set credentials" },
    { id: "select-pairs", name: "Select pairs" },
    { id: "running", name: "Run benchmark" },
    { id: "results", name: "Results" },
  ];
  const stepIndex = steps.findIndex((s) => s.id === activeStep);

  const renderActions = () => {
    switch (activeStep) {
      case "credentials":
        return (
          <Flex style={{ marginTop: "24px" }} gap={{ default: "gapSm" }}>
            <FlexItem>
              <Button
                variant="primary"
                onClick={handleSaveCredentials}
                isLoading={credLoading}
                isDisabled={!canGoToStep2 || credLoading}
              >
                Next
              </Button>
            </FlexItem>
            <FlexItem>
              <Button
                variant="link"
                onClick={() => {
                  setCredentials({ url: "", username: "", password: "" });
                  setCredError(null);
                  setCredMissingPrivileges([]);
                  setCredAcknowledged(false);
                }}
                isDisabled={credLoading}
              >
                Clear credentials
              </Button>
            </FlexItem>
          </Flex>
        );
      case "select-pairs":
        return (
          <Flex style={{ marginTop: "24px" }} gap={{ default: "gapSm" }}>
            <FlexItem>
              <Button
                variant="primary"
                onClick={handleStartBenchmark}
                isDisabled={!canStartBenchmark}
              >
                Run estimation
              </Button>
            </FlexItem>
            <FlexItem>
              <Button
                variant="secondary"
                onClick={() => setActiveStep("credentials")}
              >
                Back
              </Button>
            </FlexItem>
            <FlexItem>
              <Button variant="link" onClick={reset}>
                Cancel
              </Button>
            </FlexItem>
          </Flex>
        );
      case "running":
        return (
          <Flex style={{ marginTop: "24px" }}>
            <FlexItem>
              <Button variant="link" onClick={reset}>
                Start over
              </Button>
            </FlexItem>
          </Flex>
        );
      case "results": {
        const isBenchmarkRunning = forecastStatus?.state === "running";
        return (
          <Flex style={{ marginTop: "24px" }} gap={{ default: "gapSm" }}>
            <FlexItem>
              <Button
                variant="secondary"
                onClick={() => setIsAddPairsModalOpen(true)}
                isDisabled={isBenchmarkRunning}
                title={
                  isBenchmarkRunning
                    ? "Wait for the current benchmark to finish before adding more pairs"
                    : undefined
                }
              >
                Add more datastore pairs
              </Button>
            </FlexItem>
            <FlexItem>
              <Button variant="link" onClick={reset}>
                Start over
              </Button>
            </FlexItem>
          </Flex>
        );
      }
    }
  };

  return (
    <Stack hasGutter style={{ maxWidth: "75%", padding: "24px 0" }}>
      {/* Page header */}
      <StackItem>
        <Flex
          alignItems={{ default: "alignItemsCenter" }}
          gap={{ default: "gapSm" }}
        >
          <FlexItem>
            <Content component="h2" style={{ margin: 0 }}>
              Storage offload estimator
            </Content>
          </FlexItem>
          <FlexItem>
            <TechnologyPreviewBadge />
          </FlexItem>
        </Flex>
        <div
          style={{
            color: "var(--pf-t--global--text--color--200)",
            marginTop: "8px",
          }}
        >
          Estimate migration time between vSphere datastore pairs.
        </div>
      </StackItem>

      {/* Step indicator — hidden on results page */}
      {activeStep !== "results" && (
        <StackItem>
          <div
            style={{
              background: "var(--pf-t--global--background--color--200)",
              borderRadius: "8px",
              padding: "20px 24px",
            }}
          >
            <ProgressStepper isCenterAligned>
              {steps.map((s, i) => {
                const isCurrent = s.id === activeStep;
                const isDone = i < stepIndex;
                const variant = isCurrent
                  ? "info"
                  : isDone
                    ? "success"
                    : "pending";
                return (
                  <ProgressStep
                    key={s.id}
                    id={s.id}
                    titleId={`${s.id}-title`}
                    aria-label={s.name}
                    variant={variant}
                    isCurrent={isCurrent}
                  >
                    {s.name}
                  </ProgressStep>
                );
              })}
            </ProgressStepper>
          </div>
        </StackItem>
      )}

      {/* Step content */}
      <StackItem>
        {activeStep === "credentials" && (
          <CredentialsStep
            credentials={credentials}
            onChange={setCredentials}
            error={credError}
            missingPrivileges={credMissingPrivileges}
            isLoading={credLoading}
            acknowledged={credAcknowledged}
            onAcknowledgedChange={setCredAcknowledged}
          />
        )}
        {activeStep === "select-pairs" && (
          <SelectPairsStep
            datastores={datastores}
            groups={dsGroups}
            pairs={pairs}
            onPairsChange={setPairs}
            isLoading={dsLoading}
            error={dsError}
            basePath={basePath}
            onHasNoCaps={setPairsHaveNoCaps}
            showVmWarning
            vmAcknowledged={pairsVmAcknowledged}
            onVmAcknowledgedChange={setPairsVmAcknowledged}
          />
        )}
        {activeStep === "running" && (
          <RunningStep
            status={forecastStatus}
            benchmarkDone={benchmarkDone}
            onCancelPair={handleCancelPair}
            cancelingPairName={cancelingPairName}
            onRerun={handleRerun}
          />
        )}
        {activeStep === "results" && (
          <ResultsStep
            pairs={pairs.filter((p) => p.sourceDatastore && p.targetDatastore)}
            statsMap={statsMap}
            runs={allRuns}
            isLoading={resultsLoading}
            onRefresh={() => {
              hasAutoLoadedResultsRef.current = false;
              loadResults(
                pairs
                  .filter((p) => p.sourceDatastore && p.targetDatastore)
                  .map((p) => p.name),
              );
            }}
            forecastStatus={forecastStatus}
            benchmarkDone={benchmarkDone}
            onCancelPair={handleCancelPair}
            cancelingPairName={cancelingPairName}
            onRerun={handleRerun}
          />
        )}
      </StackItem>

      {/* Action buttons */}
      <StackItem>{renderActions()}</StackItem>

      {/* "Add more datastore pairs" modal */}
      <Modal
        isOpen={isAddPairsModalOpen}
        onClose={closeAddPairsModal}
        aria-labelledby="add-pairs-modal-title"
        aria-describedby="add-pairs-modal-body"
        variant="large"
      >
        <ModalHeader
          title="Add datastore pairs"
          labelId="add-pairs-modal-title"
        />
        <ModalBody id="add-pairs-modal-body">
          <Content component="p" style={{ marginBottom: "16px" }}>
            Select additional source and target datastore pairs to benchmark
            alongside your existing results. Storage array hosting and estimated
            capabilities update when both endpoints are chosen.
          </Content>
          <SelectPairsStep
            datastores={datastores}
            groups={dsGroups}
            pairs={modalPairs}
            onPairsChange={setModalPairs}
            isLoading={dsLoading}
            error={null}
            basePath={basePath}
            onHasNoCaps={setModalPairsHaveNoCaps}
            showVmWarning
            vmAcknowledged={modalVmAcknowledged}
            onVmAcknowledgedChange={setModalVmAcknowledged}
          />
        </ModalBody>
        <ModalFooter>
          <Button
            variant="primary"
            onClick={handleRunFromModal}
            isDisabled={
              !modalPairs.some((p) => p.sourceDatastore && p.targetDatastore) ||
              modalPairsHaveNoCaps ||
              !modalVmAcknowledged
            }
          >
            Add pairs & benchmark
          </Button>
          <Button variant="link" onClick={closeAddPairsModal}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </Stack>
  );
};

StorageOffloadTab.displayName = "StorageOffloadTab";
