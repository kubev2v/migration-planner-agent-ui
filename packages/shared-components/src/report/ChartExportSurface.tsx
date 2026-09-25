import type { CSSProperties, FC, ReactNode } from "react";
import { chartExportRootStyle } from "./chartExport.js";
import { useRegisterChart } from "./chartExportContext.js";

const surfaceStyle: CSSProperties = {
  ...chartExportRootStyle,
  backgroundColor: "#ffffff",
};

export const ChartExportSurface: FC<{
  id: string;
  title: string;
  filename?: string;
  children: ReactNode;
}> = ({ id, title, filename, children }) => {
  const ref = useRegisterChart({ id, title, filename });
  return (
    <div ref={ref} style={surfaceStyle}>
      {children}
    </div>
  );
};

ChartExportSurface.displayName = "ChartExportSurface";
