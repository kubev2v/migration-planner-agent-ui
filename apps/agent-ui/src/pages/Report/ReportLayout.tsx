import {
  Masthead,
  MastheadBrand,
  MastheadContent,
  MastheadMain,
  MastheadToggle,
  Nav,
  NavItem,
  NavList,
  Page,
  PageSidebar,
  PageSidebarBody,
  PageToggleButton,
  Title,
} from "@patternfly/react-core";
import { BarsIcon } from "@patternfly/react-icons";
import type React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

const NAV_ITEMS = [
  { path: "/report/vms-overview", label: "Virtual machines overview" },
  { path: "/report/groups", label: "Groups" },
  {
    path: "/report/storage-offload-estimator",
    label: "Storage offload estimator",
  },
] as const;

export const ReportLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const activeItem = NAV_ITEMS.find((item) =>
    location.pathname.startsWith(item.path),
  );

  return (
    <Page
      isManagedSidebar
      masthead={
        <Masthead>
          <MastheadToggle>
            <PageToggleButton variant="plain" aria-label="Global navigation">
              <BarsIcon />
            </PageToggleButton>
          </MastheadToggle>
          <MastheadMain>
            <MastheadBrand>
              <Title headingLevel="h1" size="lg">
                Migration Advisor
              </Title>
            </MastheadBrand>
          </MastheadMain>
          <MastheadContent />
        </Masthead>
      }
      sidebar={
        <PageSidebar>
          <PageSidebarBody>
            <Nav aria-label="Main navigation">
              <NavList>
                {NAV_ITEMS.map((item) => (
                  <NavItem
                    key={item.path}
                    isActive={activeItem?.path === item.path}
                    onClick={() => navigate(item.path)}
                  >
                    {item.label}
                  </NavItem>
                ))}
              </NavList>
            </Nav>
          </PageSidebarBody>
        </PageSidebar>
      }
    >
      <Outlet />
    </Page>
  );
};

ReportLayout.displayName = "ReportLayout";
