import { useInjection } from "@migration-planner-ui/ioc";
import type {
  DefaultApiInterface,
  VirtualMachineDetail,
  VMIssue,
  VmInspectionStatus,
} from "@openshift-migration-advisor/agent-sdk";
import {
  Alert,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Card,
  CardBody,
  CardTitle,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  ExpandableSection,
  Flex,
  FlexItem,
  Icon,
  Label,
  Spinner,
  Stack,
  StackItem,
  Title,
} from "@patternfly/react-core";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  CogIcon,
  CpuIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InfoCircleIcon,
  NetworkIcon,
  OutlinedHddIcon,
  StorageDomainIcon,
} from "@patternfly/react-icons";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import type React from "react";
import { useEffect, useState } from "react";
import { Symbols } from "../../../main/Symbols";
import { dashboardStyles } from "./dashboardStyles";

const MB_IN_GB = 1024;

const formatMemorySize = (sizeInMB: number): string => {
  const sizeInGB = sizeInMB / MB_IN_GB;
  return `${sizeInGB.toFixed(sizeInGB % 1 === 0 ? 0 : 2)} GB`;
};

interface VMDetailsPageProps {
  vmId: string;
  onBack: () => void;
  inspectionStatus?: VmInspectionStatus;
}

export const VMDetailsPage: React.FC<VMDetailsPageProps> = ({
  vmId,
  onBack,
  inspectionStatus,
}) => {
  const agentApi = useInjection<DefaultApiInterface>(Symbols.AgentApi);
  const [vm, setVm] = useState<VirtualMachineDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({
    Critical: false,
    Error: false,
    Warning: false,
    Advisory: false,
    Information: false,
    Other: false,
  });

  useEffect(() => {
    const fetchVMDetails = async () => {
      try {
        setLoading(true);
        const vmData = await agentApi.getVM({ id: vmId });
        setVm(vmData);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load VM details";
        setError(errorMessage);
        console.error("Error fetching VM details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVMDetails();
  }, [vmId, agentApi]);

  if (loading) {
    return (
      <div
        style={{ display: "flex", justifyContent: "center", padding: "48px" }}
      >
        <Spinner size="xl" />
      </div>
    );
  }

  if (error) {
    return (
      <Stack hasGutter>
        <StackItem>
          <Button variant="link" onClick={onBack} icon={<ArrowLeftIcon />}>
            Back to Virtual Machines
          </Button>
        </StackItem>
        <StackItem>
          <Alert variant="danger" title="Failed to load VM details">
            {error}
          </Alert>
        </StackItem>
      </Stack>
    );
  }

  if (!vm) {
    return null;
  }

  const renderStatusLabel = () => {
    const hasIssues = vm.issues && vm.issues.length > 0;
    if (!hasIssues) {
      return (
        <Label color="green" icon={<CheckCircleIcon />}>
          Migratable
        </Label>
      );
    }
    return (
      <Label color="orange" icon={<ExclamationTriangleIcon />}>
        With warnings
      </Label>
    );
  };

  const renderPowerState = () => {
    switch (vm.powerState) {
      case "poweredOn":
        return <Label color="green">Powered On</Label>;
      case "poweredOff":
        return <Label color="grey">Powered Off</Label>;
      case "suspended":
        return <Label color="orange">Suspended</Label>;
      default:
        return <Label>{vm.powerState}</Label>;
    }
  };

  return (
    <Stack hasGutter>
      <StackItem>
        <Breadcrumb>
          <BreadcrumbItem>
            <Button variant="link" onClick={onBack} icon={<ArrowLeftIcon />}>
              Back to Virtual Machines
            </Button>
          </BreadcrumbItem>
        </Breadcrumb>
      </StackItem>

      <StackItem>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <Title headingLevel="h1" size="2xl">
              {vm.name}
            </Title>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {renderPowerState()}
            {renderStatusLabel()}
          </div>
        </div>
      </StackItem>

      {inspectionStatus &&
        (() => {
          const concerns = (vm.inspection?.concerns ?? []).filter(
            (c) =>
              !c.message?.toLowerCase().includes("no inspection concerns") &&
              !c.label?.toLowerCase().includes("no inspection concerns"),
          );
          const hasError = !!inspectionStatus.error;
          const hasContent = hasError || concerns.length > 0;

          return (
            <StackItem>
              <Card className={dashboardStyles.cardBorder}>
                <CardTitle>
                  <ExclamationTriangleIcon /> Deep inspection results
                </CardTitle>
                <CardBody>
                  {hasContent ? (
                    <Stack hasGutter>
                      {hasError && (
                        <StackItem>
                          <Alert
                            variant="danger"
                            isInline
                            isPlain
                            title="Inspection error"
                          >
                            {inspectionStatus.error}
                          </Alert>
                        </StackItem>
                      )}
                      {concerns.map((concern, idx) => (
                        <StackItem key={`concern-${concern.label}-${idx}`}>
                          <Alert
                            variant={
                              concern.category === "Critical" ||
                              concern.category === "Error"
                                ? "danger"
                                : concern.category === "Warning"
                                  ? "warning"
                                  : "info"
                            }
                            isInline
                            isPlain
                            title={concern.label}
                          >
                            {concern.message}
                          </Alert>
                        </StackItem>
                      ))}
                    </Stack>
                  ) : (
                    <span
                      style={{
                        color: "var(--pf-t--global--text--color--subtle)",
                      }}
                    >
                      {inspectionStatus.state === "pending"
                        ? "Inspection pending…"
                        : inspectionStatus.state === "running"
                          ? "Inspection in progress…"
                          : inspectionStatus.state === "canceled"
                            ? "Inspection was canceled"
                            : "No issues found"}
                    </span>
                  )}
                </CardBody>
              </Card>
            </StackItem>
          );
        })()}

      <StackItem>
        <Flex
          gap={{ default: "gapMd" }}
          alignItems={{ default: "alignItemsStretch" }}
        >
          <FlexItem flex={{ default: "flex_1" }}>
            <Card isFullHeight className={dashboardStyles.cardBorder}>
              <CardTitle>
                <InfoCircleIcon /> General
              </CardTitle>
              <CardBody>
                <DescriptionList isCompact>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Datacenter</DescriptionListTerm>
                    <DescriptionListDescription>
                      {vm.datacenter || "—"}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Cluster</DescriptionListTerm>
                    <DescriptionListDescription>
                      {vm.cluster || "—"}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Host</DescriptionListTerm>
                    <DescriptionListDescription>
                      {vm.host || "—"}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>UUID</DescriptionListTerm>
                    <DescriptionListDescription>
                      {vm.uuid || "—"}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Firmware</DescriptionListTerm>
                    <DescriptionListDescription>
                      {vm.firmware || "—"}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>VMware Tools</DescriptionListTerm>
                    <DescriptionListDescription>
                      {vm.toolsStatus || "—"}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                </DescriptionList>
              </CardBody>
            </Card>
          </FlexItem>

          <FlexItem flex={{ default: "flex_1" }}>
            <Card isFullHeight className={dashboardStyles.cardBorder}>
              <CardTitle>
                <CpuIcon /> Compute
              </CardTitle>
              <CardBody>
                <DescriptionList isCompact>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Power State</DescriptionListTerm>
                    <DescriptionListDescription>
                      {vm.powerState}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Connection State</DescriptionListTerm>
                    <DescriptionListDescription>
                      {vm.connectionState}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>vCPUs</DescriptionListTerm>
                    <DescriptionListDescription>
                      {vm.cpuCount}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Cores/Socket</DescriptionListTerm>
                    <DescriptionListDescription>
                      {vm.coresPerSocket}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Memory</DescriptionListTerm>
                    <DescriptionListDescription>
                      {formatMemorySize(vm.memoryMB)}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>CPU Affinity</DescriptionListTerm>
                    <DescriptionListDescription>
                      {vm.cpuAffinity && vm.cpuAffinity.length > 0
                        ? vm.cpuAffinity.join(", ")
                        : "None"}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                </DescriptionList>
              </CardBody>
            </Card>
          </FlexItem>

          <FlexItem flex={{ default: "flex_1" }}>
            <Card isFullHeight className={dashboardStyles.cardBorder}>
              <CardTitle>
                <OutlinedHddIcon /> Guest OS
              </CardTitle>
              <CardBody>
                <DescriptionList isCompact>
                  <DescriptionListGroup>
                    <DescriptionListTerm>OS</DescriptionListTerm>
                    <DescriptionListDescription>
                      {vm.guestName || "—"}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Guest ID</DescriptionListTerm>
                    <DescriptionListDescription>
                      {vm.guestId || "—"}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Hostname</DescriptionListTerm>
                    <DescriptionListDescription>
                      {vm.hostName || "—"}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>IP Address</DescriptionListTerm>
                    <DescriptionListDescription>
                      {vm.ipAddress || "—"}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                </DescriptionList>
              </CardBody>
            </Card>
          </FlexItem>

          <FlexItem flex={{ default: "flex_1" }}>
            <Card isFullHeight className={dashboardStyles.cardBorder}>
              <CardTitle>
                <CogIcon /> Features
              </CardTitle>
              <CardBody>
                <DescriptionList isCompact>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Template</DescriptionListTerm>
                    <DescriptionListDescription>
                      {vm.template ? "Yes" : "No"}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Fault Tolerance</DescriptionListTerm>
                    <DescriptionListDescription>
                      {vm.faultToleranceEnabled ? "Enabled" : "Disabled"}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>
                      Nested Virtualization
                    </DescriptionListTerm>
                    <DescriptionListDescription>
                      {vm.nestedHVEnabled ? "Enabled" : "Disabled"}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                </DescriptionList>
              </CardBody>
            </Card>
          </FlexItem>

          <FlexItem flex={{ default: "flex_1" }}>
            <Card isFullHeight className={dashboardStyles.cardBorder}>
              <CardTitle>
                <NetworkIcon /> Network
              </CardTitle>
              <CardBody>
                {(vm.nics?.length ?? 0) === 0 ? (
                  <span
                    style={{
                      color: "var(--pf-t--global--text--color--subtle)",
                    }}
                  >
                    No network adapters
                  </span>
                ) : (
                  <Table
                    aria-label="NICs table"
                    variant="compact"
                    borders={false}
                  >
                    <Thead>
                      <Tr>
                        <Th
                          style={{
                            paddingLeft: 0,
                            paddingTop: 0,
                            fontSize: "var(--pf-t--global--font--size--sm)",
                          }}
                        >
                          Network
                        </Th>
                        <Th
                          style={{
                            paddingTop: 0,
                            fontSize: "var(--pf-t--global--font--size--sm)",
                          }}
                        >
                          MAC
                        </Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {(vm.nics ?? []).map((nic) => (
                        <Tr key={nic.mac || `nic-${nic.index}`}>
                          <Td style={{ paddingLeft: 0 }}>
                            {nic.network || "—"}
                          </Td>
                          <Td>{nic.mac || "—"}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                )}
              </CardBody>
            </Card>
          </FlexItem>
        </Flex>
      </StackItem>

      <StackItem>
        <Card className={dashboardStyles.cardBorder}>
          <CardTitle>
            <StorageDomainIcon /> Storage
          </CardTitle>
          <CardBody>
            {(vm.disks?.length ?? 0) === 0 ? (
              <div>No disks attached</div>
            ) : (
              <Table aria-label="Disks table" variant="compact">
                <Thead>
                  <Tr>
                    <Th>File</Th>
                    <Th>Size</Th>
                    <Th>Bus</Th>
                    <Th>Mode</Th>
                    <Th>Shared</Th>
                    <Th>RDM</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {(vm.disks ?? []).map((disk) => (
                    <Tr key={disk.key || disk.file || `disk-${disk.bus}`}>
                      <Td>{disk.file || "—"}</Td>
                      <Td>{disk.capacity ? `${disk.capacity} MB` : "—"}</Td>
                      <Td>{disk.bus || "—"}</Td>
                      <Td>{disk.mode || "—"}</Td>
                      <Td>{disk.shared ? "Yes" : "No"}</Td>
                      <Td>{disk.rdm ? "Yes" : "No"}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </CardBody>
        </Card>
      </StackItem>

      <StackItem>
        <Card className={dashboardStyles.cardBorder}>
          <CardTitle>
            <ExclamationTriangleIcon /> Issues
          </CardTitle>
          <CardBody>
            {(() => {
              const getAlertVariant = (category: string) => {
                switch (category) {
                  case "Critical":
                  case "Error":
                    return "danger";
                  case "Warning":
                    return "warning";
                  case "Information":
                  case "Advisory":
                    return "info";
                  default:
                    return "custom";
                }
              };

              const getCategoryIcon = (category: string) => {
                switch (category) {
                  case "Critical":
                  case "Error":
                    return (
                      <Icon status="danger">
                        <ExclamationCircleIcon />
                      </Icon>
                    );
                  case "Warning":
                    return (
                      <Icon status="warning">
                        <ExclamationTriangleIcon />
                      </Icon>
                    );
                  case "Information":
                  case "Advisory":
                    return (
                      <Icon status="info">
                        <InfoCircleIcon />
                      </Icon>
                    );
                  default:
                    return (
                      <Icon status="info">
                        <InfoCircleIcon />
                      </Icon>
                    );
                }
              };

              // Define all categories with their order
              const allCategories = [
                "Critical",
                "Error",
                "Warning",
                "Advisory",
                "Information",
                "Other",
              ];

              // Group issues by category, normalizing unknown categories to "Other"
              const issuesByCategory = (vm.issues || []).reduce(
                (acc, issue) => {
                  const cat = allCategories.includes(issue.category)
                    ? issue.category
                    : "Other";
                  if (!acc[cat]) {
                    acc[cat] = [];
                  }
                  acc[cat].push(issue);
                  return acc;
                },
                {} as Record<string, VMIssue[]>,
              );

              const toggleCategory = (category: string) => {
                setExpandedCategories((prev) => ({
                  ...prev,
                  [category]: !prev[category],
                }));
              };

              return (
                <Stack hasGutter>
                  {allCategories.map((category) => {
                    const categoryIssues = issuesByCategory[category] || [];
                    const count = categoryIssues.length;

                    // Hide "Other" category if it has no issues
                    if (category === "Other" && count === 0) {
                      return null;
                    }

                    return (
                      <StackItem key={category}>
                        <ExpandableSection
                          toggleContent={
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              {getCategoryIcon(category)}
                              <span>
                                {category} ({count})
                              </span>
                            </div>
                          }
                          isExpanded={expandedCategories[category] || false}
                          onToggle={() => toggleCategory(category)}
                          isIndented
                        >
                          {count > 0 ? (
                            <Stack hasGutter>
                              {categoryIssues.map((issue, index) => (
                                <StackItem
                                  key={`issue-${category}-${index}-${issue.label}`}
                                >
                                  <Alert
                                    variant={getAlertVariant(category)}
                                    isInline
                                    isPlain
                                    title={issue.label}
                                  >
                                    {issue.description}
                                  </Alert>
                                </StackItem>
                              ))}
                            </Stack>
                          ) : (
                            <span
                              style={{
                                color:
                                  "var(--pf-t--global--text--color--subtle)",
                              }}
                            >
                              No {category.toLowerCase()} issues found
                            </span>
                          )}
                        </ExpandableSection>
                      </StackItem>
                    );
                  })}
                </Stack>
              );
            })()}
          </CardBody>
        </Card>
      </StackItem>
    </Stack>
  );
};

VMDetailsPage.displayName = "VMDetailsPage";
