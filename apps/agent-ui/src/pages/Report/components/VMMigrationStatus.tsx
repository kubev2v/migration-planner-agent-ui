import { Card, CardBody, CardTitle } from "@patternfly/react-core";
import { VirtualMachineIcon } from "@patternfly/react-icons";
import type React from "react";
import { useNavigate } from "react-router-dom";
import { dashboardStyles } from "./dashboardStyles";
import MigrationDonutChart from "./MigrationDonutChart";
import { createVMFilterURL } from "./vmNavigation";

interface VmMigrationStatusProps {
  data: {
    migratable: number;
    nonMigratable: number;
  };
  isExportMode?: boolean;
}

export const VMMigrationStatus: React.FC<VmMigrationStatusProps> = ({
  data,
  isExportMode = false,
}) => {
  const navigate = useNavigate();
  const donutData = [
    {
      name: "Migratable",
      count: data.migratable,
      countDisplay: `${data.migratable} VMs`,
      legendCategory: "Migratable",
    },
    {
      name: "Non-Migratable",
      count: data.nonMigratable,
      countDisplay: `${data.nonMigratable} VMs`,
      legendCategory: "Non-Migratable",
    },
  ];

  const legend = {
    Migratable: "#28a745",
    "Non-Migratable": "#dc3545",
  };

  const handleItemClick = (item: { name: string }) => {
    if (isExportMode) return;

    const migrationReadiness =
      item.name === "Migratable" ? ["ready"] : ["not-ready"];
    const url = createVMFilterURL({ migrationReadiness });
    navigate(url);
  };

  return (
    <Card
      className={
        isExportMode ? dashboardStyles.cardPrint : dashboardStyles.card
      }
      id="vm-migration-status"
    >
      <CardTitle>
        <VirtualMachineIcon /> VM Migration Status
      </CardTitle>
      <CardBody>
        <MigrationDonutChart
          data={donutData}
          legend={legend}
          height={300}
          width={420}
          donutThickness={9}
          padAngle={1}
          title={`${data.migratable + data.nonMigratable}`}
          subTitle="VMs"
          subTitleColor="#9a9da0"
          titleFontSize={34}
          labelFontSize={16}
          itemsPerRow={2}
          onItemClick={handleItemClick}
        />
      </CardBody>
    </Card>
  );
};
