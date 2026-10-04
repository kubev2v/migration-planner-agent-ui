import type React from "react";
import { formatDataCollectedOn } from "./reportTimestamps";

interface ReportTimestampsProps {
  /** When the source collection for this report was created. */
  collectedAt?: Date;
  /** When the report subject was last changed. Omitted when the API has no value. */
  updatedAt?: Date;
}

export const ReportTimestamps: React.FC<ReportTimestampsProps> = ({
  collectedAt,
  updatedAt,
}) => {
  if (!collectedAt && !updatedAt) {
    return null;
  }

  return (
    <div>
      {collectedAt ? (
        <div>
          <strong>Data collected on:</strong>{" "}
          {formatDataCollectedOn(collectedAt)}
        </div>
      ) : null}
      {updatedAt ? (
        <div>
          <strong>Last updated:</strong> {formatDataCollectedOn(updatedAt)}
        </div>
      ) : null}
    </div>
  );
};

ReportTimestamps.displayName = "ReportTimestamps";
