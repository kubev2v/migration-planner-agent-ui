export type ApplicationCertificationStatus = "certified" | "non-certified";

export const CERTIFICATION_STATUS_LABELS: Record<
  ApplicationCertificationStatus,
  string
> = {
  certified: "Certified",
  "non-certified": "Non-certified",
};

export const CERTIFICATION_STATUS_TOOLTIP =
  "Certified applications are validated by Red Hat or the vendor to run on Red Hat OpenShift or Red Hat Enterprise Linux. Non-certified applications have not been validated and may require additional testing before migration.";

export const CERTIFICATION_STATUS_FILTER_OPTIONS = [
  {
    value: "certified" satisfies ApplicationCertificationStatus,
    label: CERTIFICATION_STATUS_LABELS.certified,
  },
  {
    value: "non-certified" satisfies ApplicationCertificationStatus,
    label: CERTIFICATION_STATUS_LABELS["non-certified"],
  },
] as const;

/** Static catalog until certification is exposed by the agent API. */
const CERTIFIED_APPLICATION_NAMES = new Set<string>([
  "Apache HTTP Server",
  "Docker",
  "IBM DB2 Database Server",
  "IBM WebSphere Application Server",
  "JBoss Application Server",
  "Kubernetes Kubelet",
  "Memcached",
  "Microsoft SQL Server",
  "MySQL",
  "Nginx",
  "Oracle Database",
  "Oracle WebLogic Server",
  "PostgreSQL",
  "RabbitMQ",
  "Redis",
  "SAP Application Server ABAP",
  "SAP HANA Database",
  "SAP NetWeaver Application Server Java",
]);

export function getApplicationCertificationStatus(
  applicationName: string,
): ApplicationCertificationStatus {
  return CERTIFIED_APPLICATION_NAMES.has(applicationName)
    ? "certified"
    : "non-certified";
}

export function getCertificationStatusLabel(
  status: ApplicationCertificationStatus,
): string {
  return CERTIFICATION_STATUS_LABELS[status];
}
