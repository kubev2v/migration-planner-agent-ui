import type React from "react";
import { useTitle } from "react-use";
import { ReportContainer } from "./VirtualMachinesOverview/VirtualMachinesOverviewPage";

const ReportPage: React.FC = () => {
  useTitle("Report - Migration Discovery VM");

  return <ReportContainer />;
};

ReportPage.displayName = "ReportPage";

export default ReportPage;
