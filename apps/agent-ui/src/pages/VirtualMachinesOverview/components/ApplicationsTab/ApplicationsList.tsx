import { css } from "@emotion/css";
import { Label } from "@patternfly/react-core";
import { EyeIcon, EyeSlashIcon } from "@patternfly/react-icons";
import type React from "react";
import { useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { buildApplicationDetailUrl } from "../../../reportTabNavigation";

const MAX_VISIBLE_APPLICATIONS = 5;

const applicationItem = css`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

interface ApplicationsListProps {
  applications: string[];
}

export const ApplicationsList: React.FC<ApplicationsListProps> = ({
  applications,
}) => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [showMore, setShowMore] = useState(false);
  const maxNumberElements = Math.min(
    MAX_VISIBLE_APPLICATIONS,
    applications.length,
  );
  const showMoreButton = applications.length > maxNumberElements;
  const firstApplications = applications.slice(0, maxNumberElements);
  const remainingApplications = applications.slice(maxNumberElements);

  const getApplicationLink = (name: string) => {
    const params = buildApplicationDetailUrl(
      new URLSearchParams(searchParams),
      name,
    );
    return `${location.pathname}?${params.toString()}`;
  };

  const renderApplication = (name: string) => (
    <div key={name} className={`${applicationItem} pf-v6-u-mt-xs`}>
      <Link to={getApplicationLink(name)}>{name}</Link>
    </div>
  );

  return (
    <div>
      {firstApplications.map(renderApplication)}
      {showMore ? (
        <>
          {remainingApplications.map(renderApplication)}
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

ApplicationsList.displayName = "ApplicationsList";
