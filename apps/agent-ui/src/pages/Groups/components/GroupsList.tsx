import { css } from "@emotion/css";
import { Label } from "@patternfly/react-core";
import { EyeIcon, EyeSlashIcon } from "@patternfly/react-icons";
import type React from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { GroupListItem } from "../utils/vmGroupMembership";

const MAX_VISIBLE_GROUPS = 5;

const groupItem = css`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

interface GroupsListProps {
  groups: GroupListItem[];
}

export const GroupsList: React.FC<GroupsListProps> = ({ groups }) => {
  const [showMore, setShowMore] = useState(false);
  const maxNumberElements = Math.min(MAX_VISIBLE_GROUPS, groups.length);
  const showMoreButton = groups.length > maxNumberElements;
  const firstGroups = groups.slice(0, maxNumberElements);
  const remainingGroups = groups.slice(maxNumberElements);

  const renderGroup = (group: GroupListItem) => (
    <div key={group.id} className={`${groupItem} pf-v6-u-mt-xs`}>
      <Link to={`/report/groups/${group.id}`}>{group.name}</Link>
    </div>
  );

  return (
    <div>
      {firstGroups.map(renderGroup)}
      {showMore ? (
        <>
          {remainingGroups.map(renderGroup)}
          <Label
            isCompact
            onClick={() => setShowMore(false)}
            className="pf-v6-u-mt-xs"
            icon={<EyeSlashIcon />}
          >
            Show less
          </Label>
        </>
      ) : (
        showMoreButton && (
          <Label
            isCompact
            onClick={() => setShowMore(true)}
            className="pf-v6-u-mt-xs"
            icon={<EyeIcon />}
          >
            Show more
          </Label>
        )
      )}
    </div>
  );
};

GroupsList.displayName = "GroupsList";
