import { useMemo, useState } from "react";
import {
  matchesSearch,
  paginateItems,
} from "../ApplicationsTab/applicationFilters";

export function assignStableRowKeys<T>(
  items: T[],
  getBaseKey: (item: T) => string,
): Array<{ item: T; rowKey: string }> {
  const counts = new Map<string, number>();

  return items.map((item) => {
    const base = getBaseKey(item);
    const occurrence = counts.get(base) ?? 0;
    counts.set(base, occurrence + 1);
    return {
      item,
      rowKey: occurrence === 0 ? base : `${base}#${occurrence}`,
    };
  });
}

export function useVmDetailListCardState<T>(
  items: T[],
  getSearchValue: (item: T) => string,
  defaultPageSize = 10,
) {
  const [nameSearch, setNameSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const filteredItems = useMemo(() => {
    const query = nameSearch.trim();
    if (!query) {
      return items;
    }
    return items.filter((item) => matchesSearch(getSearchValue(item), query));
  }, [getSearchValue, items, nameSearch]);

  const paginatedItems = useMemo(
    () => paginateItems(filteredItems, page, pageSize),
    [filteredItems, page, pageSize],
  );

  const handleNameSearch = (value: string) => {
    setNameSearch(value);
    setPage(1);
  };

  const handlePerPageSelect = (newPageSize: number) => {
    setPage(1);
    setPageSize(newPageSize);
  };

  return {
    nameSearch,
    page,
    pageSize,
    filteredItems,
    paginatedItems,
    handleNameSearch,
    setPage,
    handlePerPageSelect,
  };
}
