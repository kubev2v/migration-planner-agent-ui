import { createBrowserRouter, Navigate } from "react-router-dom";

export const router = createBrowserRouter(
  [
    {
      path: "/",
      index: true,
      element: <Navigate to="/report" replace />,
    },
    {
      path: "/rvtools-upload",
      lazy: async () => {
        const { RVToolsUploadPage } = await import(
          "../pages/RVTools/RVToolsUploadPage.tsx"
        );
        return { Component: RVToolsUploadPage };
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
