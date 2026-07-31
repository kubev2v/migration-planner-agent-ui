import {
  AgentApi,
  type AgentApiInterface,
  ApplicationsApi,
  type ApplicationsApiInterface,
  CollectionsApi,
  type CollectionsApiInterface,
  CollectorApi,
  type CollectorApiInterface,
  type Configuration,
  CredentialsApi,
  type CredentialsApiInterface,
  GroupsApi,
  type GroupsApiInterface,
  InspectorApi,
  type InspectorApiInterface,
  InventoriesApi,
  type InventoriesApiInterface,
  RightsizingApi,
  type RightsizingApiInterface,
  VersionApi,
  type VersionApiInterface,
  VirtualMachinesApi,
  type VirtualMachinesApiInterface,
} from "@openshift-migration-advisor/agent-sdk";

/**
 * Published v2 agent-sdk splits operations by OpenAPI tag (no DefaultApi).
 * This intersection matches the previous single-client surface used by agent-ui.
 */
export type DefaultApiInterface = AgentApiInterface &
  ApplicationsApiInterface &
  CollectionsApiInterface &
  CollectorApiInterface &
  CredentialsApiInterface &
  GroupsApiInterface &
  InspectorApiInterface &
  InventoriesApiInterface &
  RightsizingApiInterface &
  VersionApiInterface &
  VirtualMachinesApiInterface;

export type AgentApiClient = DefaultApiInterface & {
  configuration: Configuration;
};

function bindApiMethods<T extends object>(api: T): Partial<T> {
  const bound: Partial<T> = {};
  let proto: object | null = Object.getPrototypeOf(api);

  while (proto && proto !== Object.prototype) {
    for (const key of Object.getOwnPropertyNames(proto)) {
      if (key === "constructor" || key in bound) {
        continue;
      }
      const value = (api as Record<string, unknown>)[key];
      if (typeof value === "function") {
        (bound as Record<string, unknown>)[key] = value.bind(api);
      }
    }
    proto = Object.getPrototypeOf(proto);
  }

  return bound;
}

/** Compose all tagged v2 API clients into one object (DefaultApi-compatible). */
export function createAgentApi(configuration: Configuration): AgentApiClient {
  return Object.assign(
    { configuration },
    bindApiMethods(new AgentApi(configuration)),
    bindApiMethods(new ApplicationsApi(configuration)),
    bindApiMethods(new CollectionsApi(configuration)),
    bindApiMethods(new CollectorApi(configuration)),
    bindApiMethods(new CredentialsApi(configuration)),
    bindApiMethods(new GroupsApi(configuration)),
    bindApiMethods(new InspectorApi(configuration)),
    bindApiMethods(new InventoriesApi(configuration)),
    bindApiMethods(new RightsizingApi(configuration)),
    bindApiMethods(new VersionApi(configuration)),
    bindApiMethods(new VirtualMachinesApi(configuration)),
  ) as AgentApiClient;
}
