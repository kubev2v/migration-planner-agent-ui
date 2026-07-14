/** Static vendor catalog until vendor is exposed by the agent API. */
const APPLICATION_VENDOR_BY_NAME: Record<string, string> = {
  ActiveMQ: "Apache Software Foundation",
  containerd: "CNCF",
  "Docker Engine": "Docker, Inc.",
  Docker: "Docker, Inc.",
  Elasticsearch: "Elastic",
  Kafka: "Apache Software Foundation",
  Memcached: "Memcached",
  MongoDB: "MongoDB, Inc.",
  "Apache HTTP Server": "Apache Software Foundation",
  MySQL: "Oracle Corporation",
  Nginx: "F5, Inc.",
  PostgreSQL: "PostgreSQL Global Development Group",
  RabbitMQ: "Broadcom",
  Redis: "Redis Ltd.",
  systemd: "freedesktop.org",
};

export function getApplicationVendor(applicationName: string): string {
  return APPLICATION_VENDOR_BY_NAME[applicationName] ?? "—";
}
