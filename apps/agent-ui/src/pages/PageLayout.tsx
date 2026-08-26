import { css } from "@emotion/css";
import {
  Alert,
  AlertActionCloseButton,
  Brand,
  Content,
  Masthead,
  MastheadBrand,
  MastheadContent,
  MastheadLogo,
  MastheadMain,
  MastheadToggle,
  Nav,
  NavGroup,
  NavItem,
  NavList,
  Page,
  PageSection,
  PageSidebar,
  PageSidebarBody,
  PageToggleButton,
  Stack,
  StackItem,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from "@patternfly/react-core";
import type React from "react";
import { useEffect, useMemo } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import RedHatOpenShiftLogo from "../assets/RedHatOpenShiftLogo.png";
import { getCollectionProgressInfo } from "../common/collectionProgress";
import { CollectionProgress } from "../common/components";
import { RunNewReportModal } from "../common/report/RunNewReportModal";
import VCenterCredentialsDropdownMenu from "../credentials/VCenterCredentialsDropdownMenu";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  closeModal,
  dismissCollectError,
  dismissReadyAlert,
  selectCollectError,
  selectCollectorStatus,
  selectIsCollecting,
  selectIsModalOpen,
  selectShowReadyAlert,
} from "../store/slices/collectionLifecycleSlice";
import { startCollection } from "../store/thunks/startCollection";

interface ReportNavItem {
  path: string;
  label: string;
}

interface ReportNavSection {
  title: string;
  items: ReportNavItem[];
}

const NAV_SECTIONS: ReportNavSection[] = [
  {
    title: "Reporting",
    items: [
      { path: "/report/vms-overview", label: "Virtual machines overview" },
      { path: "/report/groups", label: "Groups" },
    ],
  },
  {
    title: "Tools",
    items: [
      {
        path: "/report/storage-offload-estimator",
        label: "Storage offload estimator",
      },
      { path: "/report/report-comparison", label: "Report comparison" },
    ],
  },
];

const appTitleStyle = css`
  padding: var(--pf-t--global--spacer--md);
  margin-bottom: var(--pf-t--global--spacer--sm);
`;

const navGroupStyle = css`
  .pf-v6-c-nav__section-title {
    font-weight: var(--pf-t--global--font--weight--body--bold);
    color: var(--pf-t--global--text--color--regular);
    font-size: var(--pf-t--global--font--size--body--default);
    padding-inline: var(--pf-t--global--spacer--md);
  }
`;

const navItemStyle = css`
  .pf-v6-c-nav__link {
    color: var(--pf-t--global--text--color--subtle);
    border-radius: var(--pf-t--global--border--radius--medium);
    margin-inline: var(--pf-t--global--spacer--sm);
  }

  &.report-nav-item-active .pf-v6-c-nav__link {
    background-color: var(--pf-t--global--background--color--primary--default);
    color: var(--pf-t--global--text--color--regular);
    font-weight: var(--pf-t--global--font--weight--body--default);
  }
`;

const RunNewReportAlerts: React.FC = () => {
  const dispatch = useAppDispatch();
  const isCollecting = useAppSelector(selectIsCollecting);
  const collectorStatus = useAppSelector(selectCollectorStatus);
  const showReadyAlert = useAppSelector(selectShowReadyAlert);
  const collectError = useAppSelector(selectCollectError);

  const collectionProgress = getCollectionProgressInfo(
    collectorStatus,
    collectError,
  );

  const hasAlerts =
    isCollecting ||
    (showReadyAlert && !isCollecting) ||
    (collectError && !isCollecting);

  if (!hasAlerts) {
    return null;
  }

  return (
    <PageSection hasBodyWrapper={false} style={{ padding: "24px 24px 0" }}>
      <Stack hasGutter>
        {isCollecting && (
          <StackItem>
            <Alert variant="info" isInline title="Running a new vSphere report">
              <Content component="p">
                Capturing a fresh snapshot can take a few minutes.
              </Content>
              {collectionProgress.statusText ? (
                <CollectionProgress
                  percentage={collectionProgress.percentage}
                  statusText={collectionProgress.statusText}
                />
              ) : null}
            </Alert>
          </StackItem>
        )}

        {showReadyAlert && !isCollecting && (
          <StackItem>
            <Alert
              variant="success"
              isInline
              title="New report ready"
              actionClose={
                <AlertActionCloseButton
                  onClose={() => dispatch(dismissReadyAlert())}
                />
              }
            >
              Your migration report now reflects the latest infrastructure
              snapshot.
            </Alert>
          </StackItem>
        )}

        {collectError && !isCollecting && (
          <StackItem>
            <Alert
              variant="danger"
              isInline
              title="New report failed"
              actionClose={
                <AlertActionCloseButton
                  onClose={() => dispatch(dismissCollectError())}
                />
              }
            >
              {collectError}
            </Alert>
          </StackItem>
        )}
      </Stack>
    </PageSection>
  );
};

const RunNewReportModalContainer: React.FC = () => {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(selectIsModalOpen);

  return (
    <RunNewReportModal
      isOpen={isOpen}
      onConfirm={async () => {
        // `.unwrap()` rejects with { message } on start failure, which the modal
        // surfaces inline (spinner + "Retry"). The listener middleware takes over
        // once the run has started.
        await dispatch(startCollection()).unwrap();
      }}
      onCancel={() => dispatch(closeModal())}
    />
  );
};

export const PageLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const activeItem = useMemo(
    () =>
      NAV_SECTIONS.flatMap((section) => section.items).find((item) =>
        location.pathname.startsWith(item.path),
      ),
    [location.pathname],
  );

  useEffect(() => {
    document.title = activeItem
      ? `${activeItem.label} | Migration Advisor`
      : "Migration Advisor";
  }, [activeItem]);

  return (
    <Page
      isManagedSidebar
      masthead={
        <Masthead>
          <MastheadMain>
            <MastheadToggle>
              <PageToggleButton
                isHamburgerButton
                aria-label="Global navigation"
              />
            </MastheadToggle>
            <MastheadBrand>
              <MastheadLogo>
                <Brand
                  src={RedHatOpenShiftLogo}
                  alt="Red Hat OpenShift Logo"
                  heights={{ default: "36px" }}
                />
              </MastheadLogo>
            </MastheadBrand>
          </MastheadMain>
          <MastheadContent>
            <Toolbar isFullHeight>
              <ToolbarContent>
                <ToolbarGroup align={{ default: "alignEnd" }}>
                  <ToolbarItem>
                    <VCenterCredentialsDropdownMenu />
                  </ToolbarItem>
                </ToolbarGroup>
              </ToolbarContent>
            </Toolbar>
          </MastheadContent>
        </Masthead>
      }
      sidebar={
        <PageSidebar>
          <PageSidebarBody>
            <Title headingLevel="h1" size="lg" className={appTitleStyle}>
              Migration Advisor
            </Title>
            <Nav aria-label="Main navigation">
              <NavList>
                {NAV_SECTIONS.map((section) => (
                  <NavGroup
                    key={section.title}
                    title={section.title}
                    className={navGroupStyle}
                  >
                    {section.items.map((item) => {
                      const isActive = activeItem?.path === item.path;
                      return (
                        <NavItem
                          key={item.path}
                          isActive={isActive}
                          className={`${navItemStyle}${isActive ? " report-nav-item-active" : ""}`}
                          onClick={() => navigate(item.path)}
                        >
                          {item.label}
                        </NavItem>
                      );
                    })}
                  </NavGroup>
                ))}
              </NavList>
            </Nav>
          </PageSidebarBody>
        </PageSidebar>
      }
    >
      <RunNewReportAlerts />
      <Outlet />
      <RunNewReportModalContainer />
    </Page>
  );
};

PageLayout.displayName = "PageLayout";
