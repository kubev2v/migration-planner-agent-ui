import type { Group } from "@openshift-migration-advisor/agent-sdk";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { formatGroupLastUpdated } from "../../../common/report/reportTimestamps";
import { GroupsTable } from "./GroupsTable";

const group: Group = {
  id: "g1",
  name: "testing",
  filter: "name = 'a'",
  createdAt: new Date("2026-09-01T15:00:00.000Z"),
  updatedAt: new Date("2026-09-16T15:55:00.000Z"),
};

function renderTable(groups: Group[]) {
  render(
    <MemoryRouter>
      <GroupsTable
        groups={groups}
        loading={false}
        total={groups.length}
        page={1}
        pageSize={20}
        nameFilter=""
        onNameFilterChange={vi.fn()}
        onPageChange={vi.fn()}
        onCreateGroup={vi.fn()}
        onEditGroupName={vi.fn()}
        onDeleteGroup={vi.fn()}
      />
    </MemoryRouter>,
  );
}

describe("GroupsTable", () => {
  it("shows the last updated time for a group", () => {
    renderTable([group]);

    expect(
      screen.getByRole("columnheader", { name: /Last updated/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(formatGroupLastUpdated(group.updatedAt as Date)),
    ).toBeInTheDocument();
  });

  it("shows a dash when a group has no last updated time", () => {
    renderTable([{ ...group, updatedAt: undefined }]);

    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
