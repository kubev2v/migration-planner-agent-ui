import { createBrowserRouter, Navigate } from "react-router-dom";

export const router = createBrowserRouter(
  [
    {
      path: "/",
      index: true,
      element: <Navigate to="/report" replace />,
    },
    {
      path: "/login",
      lazy: async () => {
        const { default: VCenterLoginPage } = await import(
          "../pages/VCenterLoginPage.tsx"
        );

        return {
          Component: VCenterLoginPage,
        };
      },
    },
    {
      path: "/report",
      lazy: async () => {
        const { ProtectedRoute } = await import("../pages/ProtectedRoute.tsx");

        return {
          Component: ProtectedRoute,
        };
      },
      children: [
        {
          index: true,
          element: <Navigate to="/report/vms-overview" replace />,
        },
        {
          path: "vms-overview",
          lazy: async () => {
            const { ReportContainer } = await import(
              "../pages/VirtualMachinesOverview/VirtualMachinesOverviewPage.tsx"
            );
            return { Component: ReportContainer };
          },
        },
        {
          path: "groups",
          lazy: async () => {
            const { GroupsPage } = await import(
              "../pages/Groups/GroupsPage.tsx"
            );
            return { Component: GroupsPage };
          },
        },
        {
          path: "groups/:groupId",
          lazy: async () => {
            const { GroupDetailPage } = await import(
              "../pages/Groups/GroupDetailPage.tsx"
            );
            return { Component: GroupDetailPage };
          },
        },
        {
          path: "storage-offload-estimator",
          lazy: async () => {
            const { StorageOffloadPage } = await import(
              "../pages/StorageOffloadEstimator/StorageOffloadPage.tsx"
            );
            return { Component: StorageOffloadPage };
          },
        },
        {
          path: "report-comparison",
          lazy: async () => {
            const { ReportComparisonPage } = await import(
              "../pages/ReportComparison/ReportComparisonPage.tsx"
            );
            return { Component: ReportComparisonPage };
          },
        },
      ],
    },
    {
      path: "/error/:code",
      lazy: async () => {
        const { default: ErrorPage } = await import("../pages/ErrorPage.tsx");

        return {
          Component: ErrorPage,
        };
      },
    },
    {
      path: "*",
      lazy: async () => {
        const { default: ErrorPage } = await import("../pages/ErrorPage.tsx");

        return {
          element: (
            <ErrorPage
              code="404"
              message="We lost that page"
              actions={[
                {
                  children: "Go back",
                  component: "a",
                  onClick: (_event): void => {
                    history.back();
                  },
                },
              ]}
            />
          ),
        };
      },
    },
  ],
  {},
);
