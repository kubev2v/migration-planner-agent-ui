import { css } from "@emotion/css";
import {
  Brand,
  Masthead,
  MastheadBrand,
  MastheadContent,
  MastheadLogo,
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
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from "@patternfly/react-core";
import type React from "react";
import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import RedHatOpenShiftLogo from "../assets/RedHatOpenShiftLogo.png";
import VCenterCredentialsDropdownMenu from "../credentials/VCenterCredentialsDropdownMenu";

const NAV_ITEMS = [
  { path: "/report/vms-overview", label: "Virtual machines overview" },
  { path: "/report/groups", label: "Groups" },
  {
    path: "/report/storage-offload-estimator",
    label: "Storage offload estimator",
  },
] as const;

const appTitleStyle = css`
  padding: var(--pf-t--global--spacer--md);
  border-bottom: 2px solid var(--pf-t--global--color--nonstatus--gray--100);
`;

export const ReportLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const activeItem = NAV_ITEMS.find((item) =>
    location.pathname.startsWith(item.path),
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
