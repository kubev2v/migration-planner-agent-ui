import type { DefaultApiInterface } from "@migration-planner-ui/agent-client/apis";
import type { VirtualMachineDetail } from "@migration-planner-ui/agent-client/models";
import { useInjection } from "@migration-planner-ui/ioc";
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
  Flex,
  FlexItem,
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
}

export const VMDetailsPage: React.FC<VMDetailsPageProps> = ({
  vmId,
  onBack,
}) => {
  const agentApi = useInjection<DefaultApiInterface>(Symbols.AgentApi);
  const [vm, setVm] = useState<VirtualMachineDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
            {vm.issues && vm.issues.length > 0 ? (
              <Stack hasGutter>
                {vm.issues.map((issue, index) => (
                  <StackItem key={`issue-${index}-${issue}`}>
                    <Alert variant="warning" isInline isPlain title={issue} />
                  </StackItem>
                ))}
              </Stack>
            ) : (
              <span
                style={{
                  color: "var(--pf-t--global--text--color--subtle)",
                }}
              >
                No issues found
              </span>
            )}
          </CardBody>
        </Card>
      </StackItem>
    </Stack>
  );
};

VMDetailsPage.displayName = "VMDetailsPage";
