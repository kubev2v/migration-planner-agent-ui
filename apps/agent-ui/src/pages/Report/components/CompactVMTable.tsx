import type React from "react";
import { VMTable, type VMTableProps } from "./VMTable";

export type CompactVMTableProps = Omit<
  VMTableProps,
  "variant" | "showGroupsColumn"
>;

/** VM picker table for modals: fixed columns, no bulk actions, no VM navigation. */
export const CompactVMTable: React.FC<CompactVMTableProps> = (props) => (
  <VMTable variant="compact" showGroupsColumn={false} {...props} />
);

CompactVMTable.displayName = "CompactVMTable";
