import { useInjection } from "@migration-planner-ui/ioc";
import type {
  DefaultApiInterface,
  VirtualMachineDetail,
  VMIssue,
  VmInspectionStatus,
  VmUtilizationDetails,
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
  Grid,
  GridItem,
  Icon,
  Label,
  Progress,
  ProgressMeasureLocation,
  ProgressSize,
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
  ResourcesFullIcon,
  StorageDomainIcon,
} from "@patternfly/react-icons";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import type React from "react";
import { useEffect, useState } from "react";
import { Symbols } from "../../../main/Symbols";
import { formatMetric } from "./VMUtilizationMetrics";
import { isLikelyCanceledInspectionError } from "./vmInspectionUtils";

const MB_IN_GB = 1024;

const formatMemorySize = (sizeInMB: number): string => {
  const sizeInGB = sizeInMB / MB_IN_GB;
  return `${sizeInGB.toFixed(sizeInGB % 1 === 0 ? 0 : 2)} GB`;
};

interface VirtualMachineDetailWithUtilization extends VirtualMachineDetail {
  utilization?: VmUtilizationDetails;
}

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
  const [vm, setVm] = useState<VirtualMachineDetailWithUtilization | null>(
    null,
  );
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
        setError(null);
        const vmData = await agentApi.getVM({ id: vmId });
        let utilization: VmUtilizationDetails | undefined;
        try {
          utilization = await agentApi.getVMUtilization({ id: vmId });
        } catch (utilizationError) {
          console.warn("Error fetching VM utilization:", utilizationError);
        }
        setVm({ ...vmData, utilization });
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
          const hasError =
            !!inspectionStatus.error &&
            !isLikelyCanceledInspectionError(inspectionStatus.error);
          const hasContent = hasError || concerns.length > 0;

          return (
            <StackItem>
              <Card>
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
                      {concerns.map((concern) => (
                        <StackItem key={`concern-${concern.label}`}>
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
                          : inspectionStatus.state === "canceled" ||
                              isLikelyCanceledInspectionError(
                                inspectionStatus.error,
                              )
                            ? "Inspection was canceled"
                            : inspectionStatus.state === "error"
                              ? "Inspection failed"
                              : "No issues found"}
                    </span>
                  )}
                </CardBody>
              </Card>
            </StackItem>
          );
        })()}

      <StackItem>
        <Grid hasGutter>
          {/* General */}
          <GridItem span={12} lg={3}>
            <Card isFullHeight>
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
          </GridItem>

          {/* Compute */}
          <GridItem span={12} lg={2}>
            <Card isFullHeight>
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
          </GridItem>

          {/* Guest OS */}
          <GridItem span={12} lg={2}>
            <Card isFullHeight>
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
          </GridItem>

          {/* Nested block */}
          <GridItem span={12} lg={5}>
            <Grid hasGutter>
              {/* Features */}
              <GridItem span={12}>
                <Card isFullHeight>
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
                        <DescriptionListTerm>
                          Fault Tolerance
                        </DescriptionListTerm>
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
              </GridItem>

              {/* Right sizing (full width under them) */}
              <GridItem span={12}>
                <Card isFullHeight>
                  <CardTitle>
                    <ResourcesFullIcon /> Right sizing
                  </CardTitle>
                  <CardBody>
                    {vm.utilization ? (
                      <Grid hasGutter>
                        {/* First row - 3 columns */}
                        <GridItem span={4}>
                          <DescriptionList isCompact>
                            <DescriptionListGroup>
                              <DescriptionListTerm>
                                Allocated CPU
                              </DescriptionListTerm>
                              <DescriptionListDescription>
                                {`${vm.utilization.provisioned_cpus} vCPU${vm.utilization.provisioned_cpus === 1 ? "" : "s"}`}
                              </DescriptionListDescription>
                            </DescriptionListGroup>
                          </DescriptionList>
                        </GridItem>
                        <GridItem span={4}>
                          <DescriptionList isCompact>
                            <DescriptionListGroup>
                              <DescriptionListTerm>
                                Max used CPU
                              </DescriptionListTerm>
                              <DescriptionListDescription>
                                {vm.utilization.cpu_max === 0 ? (
                                  "N/A"
                                ) : (
                                  <Progress
                                    value={vm.utilization.cpu_max}
                                    label={formatMetric(vm.utilization.cpu_max)}
                                    size={ProgressSize.sm}
                                    measureLocation={
                                      ProgressMeasureLocation.outside
                                    }
                                    aria-label="Max used CPU"
                                  />
                                )}
                              </DescriptionListDescription>
                            </DescriptionListGroup>
                          </DescriptionList>
                        </GridItem>
                        <GridItem span={4}>
                          <DescriptionList isCompact>
                            <DescriptionListGroup>
                              <DescriptionListTerm>
                                Average used CPU
                              </DescriptionListTerm>
                              <DescriptionListDescription>
                                {vm.utilization.cpu_avg === 0 ? (
                                  "N/A"
                                ) : (
                                  <Progress
                                    value={vm.utilization.cpu_avg}
                                    label={formatMetric(vm.utilization.cpu_avg)}
                                    size={ProgressSize.sm}
                                    measureLocation={
                                      ProgressMeasureLocation.outside
                                    }
                                    aria-label="Average used CPU"
                                  />
                                )}
                              </DescriptionListDescription>
                            </DescriptionListGroup>
                          </DescriptionList>
                        </GridItem>

                        {/* Second row - 3 columns */}
                        <GridItem span={4}>
                          <DescriptionList isCompact>
                            <DescriptionListGroup>
                              <DescriptionListTerm>
                                Allocated RAM
                              </DescriptionListTerm>
                              <DescriptionListDescription>
                                {formatMemorySize(
                                  vm.utilization.provisioned_memory_mb,
                                )}
                              </DescriptionListDescription>
                            </DescriptionListGroup>
                          </DescriptionList>
                        </GridItem>
                        <GridItem span={4}>
                          <DescriptionList isCompact>
                            <DescriptionListGroup>
                              <DescriptionListTerm>
                                Max used RAM
                              </DescriptionListTerm>
                              <DescriptionListDescription>
                                {vm.utilization.mem_max === 0 ? (
                                  "N/A"
                                ) : (
                                  <Progress
                                    value={vm.utilization.mem_max}
                                    label={formatMetric(vm.utilization.mem_max)}
                                    size={ProgressSize.sm}
                                    measureLocation={
                                      ProgressMeasureLocation.outside
                                    }
                                    aria-label="Max used RAM"
                                  />
                                )}
                              </DescriptionListDescription>
                            </DescriptionListGroup>
                          </DescriptionList>
                        </GridItem>
                        <GridItem span={4}>
                          <DescriptionList isCompact>
                            <DescriptionListGroup>
                              <DescriptionListTerm>
                                Average used RAM
                              </DescriptionListTerm>
                              <DescriptionListDescription>
                                {vm.utilization.mem_avg === 0 ? (
                                  "N/A"
                                ) : (
                                  <Progress
                                    value={vm.utilization.mem_avg}
                                    label={formatMetric(vm.utilization.mem_avg)}
                                    size={ProgressSize.sm}
                                    measureLocation={
                                      ProgressMeasureLocation.outside
                                    }
                                    aria-label="Average used RAM"
                                  />
                                )}
                              </DescriptionListDescription>
                            </DescriptionListGroup>
                          </DescriptionList>
                        </GridItem>

                        {/* Third row - 3 columns */}
                        <GridItem span={4}>
                          <DescriptionList isCompact>
                            <DescriptionListGroup>
                              <DescriptionListTerm>
                                Allocated disk
                              </DescriptionListTerm>
                              <DescriptionListDescription>
                                {formatMemorySize(
                                  vm.utilization.provisioned_disk_kb / 1000,
                                )}
                              </DescriptionListDescription>
                            </DescriptionListGroup>
                          </DescriptionList>
                        </GridItem>
                        <GridItem span={4}>
                          <DescriptionList isCompact>
                            <DescriptionListGroup>
                              <DescriptionListTerm>
                                Disk usage
                              </DescriptionListTerm>
                              <DescriptionListDescription>
                                {vm.utilization.disk === 0 ? (
                                  "N/A"
                                ) : (
                                  <Progress
                                    value={vm.utilization.disk}
                                    label={formatMetric(vm.utilization.disk)}
                                    size={ProgressSize.sm}
                                    measureLocation={
                                      ProgressMeasureLocation.outside
                                    }
                                    aria-label="Disk usage"
                                  />
                                )}
                              </DescriptionListDescription>
                            </DescriptionListGroup>
                          </DescriptionList>
                        </GridItem>
                      </Grid>
                    ) : (
                      <span
                        style={{
                          color: "var(--pf-t--global--text--color--subtle)",
                        }}
                      >
                        No utilization data available
                      </span>
                    )}
                  </CardBody>
                </Card>
              </GridItem>
            </Grid>
          </GridItem>

          {/* Network (full width) */}
          <GridItem span={12}>
            <Card>
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
                        <Th>Network</Th>
                        <Th>MAC</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {(vm.nics ?? []).map((nic) => (
                        <Tr key={nic.mac || `nic-${nic.index}`}>
                          <Td>{nic.network || "—"}</Td>
                          <Td>{nic.mac || "—"}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                )}
              </CardBody>
            </Card>
          </GridItem>

          {/* Storage (last row full width) */}
          <GridItem span={12}>
            <Card>
              <CardTitle>
                <StorageDomainIcon /> Storage
              </CardTitle>
              <CardBody>
                {(vm.disks?.length ?? 0) === 0 ? (
                  <div>No disks attached</div>
                ) : (
                  <Table
                    aria-label="Disks table"
                    variant="compact"
                    borders={false}
                  >
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
          </GridItem>
        </Grid>
      </StackItem>

      <StackItem>
        <Card>
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
                              {categoryIssues.map((issue) => (
                                <StackItem
                                  key={`issue-${category}-${issue.label}`}
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
