import {
  Alert,
  Button,
  Checkbox,
  Content,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  MenuToggle,
  type MenuToggleElement,
  Popover,
  Select,
  SelectList,
  SelectOption,
  Spinner,
  Stack,
  StackItem,
} from "@patternfly/react-core";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ExternalLinkAltIcon,
  PlusCircleIcon,
  QuestionCircleIcon,
  TimesCircleIcon,
  TrashIcon,
} from "@patternfly/react-icons";
import type React from "react";
import { useState } from "react";
import type {
  DatastoreGroup,
  ForecasterDatastore,
  SelectedPair,
} from "../forecasterTypes";
import { hasDuplicateArrayRoutes, isCompletePair } from "./storageOffloadUtils";

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

export interface SelectPairsFormProps {
  datastores: ForecasterDatastore[];
  groups: DatastoreGroup[];
  pairs: SelectedPair[];
  onPairsChange: (pairs: SelectedPair[]) => void;
  isLoading: boolean;
  error: string | null;
  pairCapsMap: Record<string, string[] | null>;
  capsLoading: boolean;
  showVmWarning?: boolean;
  vmAcknowledged?: boolean;
  onVmAcknowledgedChange?: (checked: boolean) => void;
}

export const SelectPairsForm: React.FC<SelectPairsFormProps> = ({
  datastores,
  groups,
  pairs,
  onPairsChange,
  isLoading,
  error,
  pairCapsMap,
  capsLoading,
  showVmWarning = false,
  vmAcknowledged = false,
  onVmAcknowledgedChange,
}) => {
  const showDuplicateWarning = hasDuplicateArrayRoutes(pairs, datastores);

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
            capsLoading={capsLoading && isCompletePair(pair)}
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
          <Alert
            variant="warning"
            isInline
            title="The forecaster creates temporary virtual machines and virtual disks in your vCenter environment"
          >
            <Content component="p" style={{ marginBottom: "12px" }}>
              While all resources are cleaned up automatically after
              benchmarking, vCenter administrators should be aware of this
              activity.
            </Content>
            <Checkbox
              id="pairs-acknowledge-temp-resources"
              label="I understand temporary resources will be created in my vCenter environment."
              isChecked={vmAcknowledged}
              onChange={(_e, checked) => onVmAcknowledgedChange?.(checked)}
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
        </StackItem>
      )}
    </Stack>
  );
};

SelectPairsForm.displayName = "SelectPairsForm";
