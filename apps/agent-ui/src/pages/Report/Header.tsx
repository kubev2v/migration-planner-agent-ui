import {
  Button,
  Content,
  Dropdown,
  DropdownItem,
  DropdownList,
  Flex,
  FlexItem,
  Icon,
  MenuToggle,
  type MenuToggleElement,
  Split,
  SplitItem,
  Stack,
  StackItem,
  Title,
} from "@patternfly/react-core";
import { CheckCircleIcon, ExportIcon } from "@patternfly/react-icons";
import type React from "react";
import type { ReactNode } from "react";
import { useState } from "react";

interface HeaderProps {
  totalVMs?: number;
  totalClusters?: number;
  isConnected?: boolean;
  lastUpdated?: string;
  onExport?: () => void;
  children?: ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  totalVMs = 0,
  totalClusters = 0,
  isConnected = true,
  lastUpdated,
  onExport,
  children,
}) => {
  const [isExportOpen, setIsExportOpen] = useState(false);

  const onExportToggle = () => {
    setIsExportOpen(!isExportOpen);
  };

  return (
    <Stack hasGutter>
      <StackItem>
        <Split hasGutter>
          <SplitItem isFilled>
            <Flex direction={{ default: "column" }} gap={{ default: "gapSm" }}>
              <FlexItem>
                <Flex
                  gap={{ default: "gapMd" }}
                  alignItems={{ default: "alignItemsCenter" }}
                >
                  <FlexItem>
                    <Title headingLevel="h1" size="2xl">
                      Migration Advisor Report
                    </Title>
                  </FlexItem>
                  <FlexItem hidden>
                    <Button variant="link" isInline>
                      Contact us
                    </Button>
                  </FlexItem>
                </Flex>
              </FlexItem>

              <FlexItem>
                <Flex
                  gap={{ default: "gapSm" }}
                  alignItems={{ default: "alignItemsCenter" }}
                >
                  <FlexItem>
                    <Content component="small">
                      <strong>Discovery VM status:</strong>
                    </Content>
                  </FlexItem>
                  <FlexItem>
                    {isConnected ? (
                      <Flex
                        gap={{ default: "gapXs" }}
                        alignItems={{ default: "alignItemsCenter" }}
                      >
                        <Icon status="success">
                          <CheckCircleIcon />
                        </Icon>
                        <Content component="small">Connected</Content>
                      </Flex>
                    ) : (
                      <Content component="small">Disconnected</Content>
                    )}
                  </FlexItem>
                </Flex>
              </FlexItem>

              {lastUpdated && (
                <FlexItem>
                  <Content component="small">{lastUpdated}</Content>
                </FlexItem>
              )}

              <FlexItem>
                <Content component="p">
                  Detected <strong>{totalVMs.toLocaleString()} VMs</strong> in{" "}
                  <strong>
                    {totalClusters}{" "}
                    {totalClusters === 1
                      ? "vSphere cluster"
                      : "vSphere clusters"}
                  </strong>
                  .
                </Content>
              </FlexItem>
            </Flex>
          </SplitItem>

          <SplitItem hidden>
            <Dropdown
              isOpen={isExportOpen}
              onSelect={() => setIsExportOpen(false)}
              onOpenChange={setIsExportOpen}
              toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                <MenuToggle
                  ref={toggleRef}
                  onClick={onExportToggle}
                  isExpanded={isExportOpen}
                  variant="secondary"
                >
                  <ExportIcon /> Export report
                </MenuToggle>
              )}
            >
              <DropdownList>
                <DropdownItem key="pdf" onClick={onExport}>
                  Export as PDF
                </DropdownItem>
                <DropdownItem key="csv">Export as CSV</DropdownItem>
              </DropdownList>
            </Dropdown>
          </SplitItem>
        </Split>
      </StackItem>

      {children && <StackItem>{children}</StackItem>}
    </Stack>
  );
};

Header.displayName = "Header";
