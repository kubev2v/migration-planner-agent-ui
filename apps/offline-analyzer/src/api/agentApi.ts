import {
  CollectionsApi,
  type CollectionsApiInterface,
  CollectorApi,
  type CollectorApiInterface,
  type Configuration,
  GroupsApi,
  type GroupsApiInterface,
  InventoriesApi,
  type InventoriesApiInterface,
  RightsizingApi,
  type RightsizingApiInterface,
  VersionApi,
  type VersionApiInterface,
  VirtualMachinesApi,
  type VirtualMachinesApiInterface,
} from "@openshift-migration-advisor/offline-analyzer-sdk";

/** The Offline Analyzer SDK splits its generated clients by OpenAPI tag. */
export type DefaultApiInterface = CollectionsApiInterface &
  CollectorApiInterface &
  GroupsApiInterface &
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

/** Compose the generated Offline Analyzer API clients into one object. */
export function createAgentApi(configuration: Configuration): AgentApiClient {
  return Object.assign(
    { configuration },
    bindApiMethods(new CollectionsApi(configuration)),
    bindApiMethods(new CollectorApi(configuration)),
    bindApiMethods(new GroupsApi(configuration)),
    bindApiMethods(new InventoriesApi(configuration)),
    bindApiMethods(new RightsizingApi(configuration)),
    bindApiMethods(new VersionApi(configuration)),
    bindApiMethods(new VirtualMachinesApi(configuration)),
  ) as AgentApiClient;
}
