import { css } from "@emotion/css";
import {
  Pagination,
  SearchInput,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from "@patternfly/react-core";
import type React from "react";

const styles = {
  toolbar: css`
    margin-bottom: 16px;
  `,
  searchInput: css`
    width: 100%;
    min-width: 240px;
  `,
};

interface VmDetailListCardToolbarProps {
  searchPlaceholder: string;
  nameSearch: string;
  onNameSearch: (value: string) => void;
  itemCount: number;
  page: number;
  pageSize: number;
  onSetPage: (page: number) => void;
  onPerPageSelect: (pageSize: number) => void;
}

export const VmDetailListCardToolbar: React.FC<
  VmDetailListCardToolbarProps
> = ({
  searchPlaceholder,
  nameSearch,
  onNameSearch,
  itemCount,
  page,
  pageSize,
  onSetPage,
  onPerPageSelect,
}) => (
  <Toolbar className={styles.toolbar}>
    <ToolbarContent>
      <ToolbarGroup variant="filter-group">
        <ToolbarItem>
          <SearchInput
            placeholder={searchPlaceholder}
            value={nameSearch}
            onChange={(_event, value) => onNameSearch(value)}
            onClear={() => onNameSearch("")}
            className={styles.searchInput}
          />
        </ToolbarItem>
      </ToolbarGroup>
      <ToolbarItem align={{ default: "alignEnd" }}>
        <Pagination
          itemCount={itemCount}
          perPage={pageSize}
          page={page}
          onSetPage={(_event, newPage) => onSetPage(newPage)}
          onPerPageSelect={(_event, newPerPage) => {
            onPerPageSelect(newPerPage);
          }}
          variant="top"
          isCompact
        />
      </ToolbarItem>
    </ToolbarContent>
  </Toolbar>
);

VmDetailListCardToolbar.displayName = "VmDetailListCardToolbar";
