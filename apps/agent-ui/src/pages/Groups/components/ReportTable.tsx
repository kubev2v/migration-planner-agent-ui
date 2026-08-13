import { Button } from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import type React from "react";
import { commonStyles } from "../../../common/styles";

export interface ReportTableProps<DataItem> {
  columns: string[];
  data: DataItem[];
  fields: Array<keyof DataItem>;
  caption?: string;
  onRowClick?: (item: DataItem) => void;
  clickableFields?: Array<keyof DataItem>;
}

export function ReportTable<DataItem>(
  props: ReportTableProps<DataItem>,
): React.ReactNode {
  const {
    columns,
    data,
    fields,
    caption,
    onRowClick,
    clickableFields = [],
  } = props;

  const renderCell = (
    item: DataItem,
    field: keyof DataItem,
  ): React.ReactNode => {
    const value = item[field];

    if (value === "" || value == null) {
      return "-";
    }

    if (typeof value === "boolean") {
      return value ? "True" : "False";
    }

    // Make field clickable if specified
    if (clickableFields.includes(field) && onRowClick) {
      return (
        <Button
          variant="link"
          isInline
          onClick={() => onRowClick(item)}
          style={{ padding: 0, fontSize: "inherit" }}
        >
          {value as React.ReactNode}
        </Button>
      );
    }

    return value as React.ReactNode;
  };

  return (
    <Table
      variant="compact"
      borders={false}
      className={commonStyles.tableFullWidth}
    >
      {caption && <caption>{caption}</caption>}
      <Thead>
        <Tr>
          {columns.map((name) => (
            <Th key={name}>{name}</Th>
          ))}
        </Tr>
      </Thead>
      <Tbody>
        {data.map((item) => (
          <Tr key={`row-${String(item[fields[0]])}`}>
            {fields.map((f) => (
              <Td key={String(f)}>{renderCell(item, f)}</Td>
            ))}
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}

ReportTable.displayName = "ReportTable";
