import type {
  VirtualMachine,
  VirtualMachineDetail,
  VirtualMachineListResponse,
} from "@openshift-migration-advisor/agent-sdk";
import { VirtualMachineFromJSON } from "@openshift-migration-advisor/agent-sdk";
import type { DefaultApiInterface } from "../../api/agentApi";

export type VmVSphereMetadata = Readonly<Record<string, ReadonlyArray<string>>>;

export type VirtualMachineWithExclusion = VirtualMachine & {
  migrationExcluded?: boolean;
  /** Present on list rows when API returns vSphere metadata (SDK list model may omit it). */
  metadata?: VmVSphereMetadata;
  /** vSphere annotation when the list payload includes it. */
  annotation?: string;
};

/** Agent ≥0.32 fields not yet in the pinned SDK list/detail models. */
export type VirtualMachineDetailWithVSphere = VirtualMachineDetail & {
  annotation?: string;
  metadata?: VmVSphereMetadata;
};

type VirtualMachineJson = VirtualMachineWithExclusion & {
  migration_excluded?: boolean;
  tags?: string[];
  metadata?: VmVSphereMetadata;
};

export function getMigrationExcluded(
  vm: VirtualMachine | undefined,
): boolean | undefined {
  return (vm as VirtualMachineWithExclusion | undefined)?.migrationExcluded;
}

export function formatVSphereTag(category: string, value: string): string {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return category;
  }
  return `${category}:${trimmedValue}`;
}

/** Coerce API metadata (string or string[] values) into category → values map. */
export function normalizeVmMetadata(
  raw: unknown,
): VmVSphereMetadata | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return undefined;
  }
  const out: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!key) {
      continue;
    }
    if (Array.isArray(value)) {
      const strings = value.filter(
        (v): v is string => typeof v === "string" && v.trim().length > 0,
      );
      if (strings.length > 0) {
        out[key] = strings;
      }
    } else if (typeof value === "string" && value.trim().length > 0) {
      out[key] = [value];
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Parses `Category:Value` tokens used for vSphere tag filters and display. */
export function parseVSphereTagFilterToken(
  token: string,
): { key: string; value: string } | undefined {
  const separator = token.indexOf(":");
  if (separator <= 0 || separator >= token.length - 1) {
    return undefined;
  }
  return {
    key: token.slice(0, separator),
    value: token.slice(separator + 1),
  };
}

/** Sorted `Category:Value` options from filter-options metadata. */
export function listVmMetadataFilterOptions(
  metadata: VmVSphereMetadata | Record<string, string[]> | undefined,
): string[] {
  if (!metadata || Object.keys(metadata).length === 0) {
    return [];
  }
  return Object.entries(metadata)
    .flatMap(([key, values]) =>
      values.map((value) => formatVSphereTag(key, value)),
    )
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

/** vCenter/RVTools metadata (tag categories, custom attributes, etc.). */
export function getVmVSphereMetadata(
  vm: VirtualMachine | VirtualMachineDetailWithVSphere,
): VmVSphereMetadata | undefined {
  const metadata = normalizeVmMetadata((vm as VirtualMachineJson).metadata);
  if (!metadata) {
    return undefined;
  }
  return metadata;
}

/** Flattened vSphere tags for table and detail display (`Category:Value`). */
export function getVmVSphereTags(
  vm: VirtualMachine | VirtualMachineDetailWithVSphere,
): string[] {
  const metadata = getVmVSphereMetadata(vm);
  if (!metadata) {
    return [];
  }

  return Object.entries(metadata)
    .flatMap(([category, values]) =>
      values.map((value) => formatVSphereTag(category, value)),
    )
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

export function getVmVSphereAnnotation(
  vm: VirtualMachine | VirtualMachineDetailWithVSphere,
): string | undefined {
  const annotation = (vm as VirtualMachineWithExclusion).annotation?.trim();
  return annotation || undefined;
}

/** VM labels for display/filtering (`labels` on v2 list model). */
export function getVmTags(vm: VirtualMachine): string[] {
  if (vm.labels?.length) {
    return vm.labels;
  }
  // Legacy/local mocks may still use `tags`
  return (vm as VirtualMachineJson).tags ?? [];
}

/** Normalize VM JSON (handles snake_case migration_excluded). */
export function normalizeVirtualMachine(vm: VirtualMachine): VirtualMachine {
  const raw = vm as VirtualMachineJson;
  const migrationExcluded =
    raw.migrationExcluded ?? raw.migration_excluded ?? undefined;
  const labels = raw.labels ?? raw.tags;

  if (migrationExcluded === undefined && labels === undefined) {
    return vm;
  }

  return {
    ...vm,
    ...(migrationExcluded !== undefined ? { migrationExcluded } : {}),
    ...(labels !== undefined ? { labels } : {}),
  };
}

export function normalizeVirtualMachines(
  vms: VirtualMachine[] | undefined,
): VirtualMachine[] {
  return (vms ?? []).map(normalizeVirtualMachine);
}

/** List items may include `metadata` before the SDK list model adds the field. */
export function virtualMachineFromListJson(
  json: unknown,
): VirtualMachineWithExclusion {
  if (!json || typeof json !== "object") {
    return VirtualMachineFromJSON(json) as VirtualMachineWithExclusion;
  }
  const record = json as Record<string, unknown>;
  const metadata = normalizeVmMetadata(record.metadata);
  const annotation =
    typeof record.annotation === "string" ? record.annotation.trim() : "";
  const vm = normalizeVirtualMachine(
    VirtualMachineFromJSON(record) as VirtualMachineWithExclusion,
  );
  const extras: VirtualMachineWithExclusion = { ...vm };
  if (metadata) {
    extras.metadata = metadata;
  }
  if (annotation) {
    extras.annotation = annotation;
  }
  if (metadata || annotation) {
    return extras;
  }
  return vm;
}

export function parseVirtualMachineListResponse(
  json: unknown,
): VirtualMachineListResponse {
  if (!json || typeof json !== "object") {
    throw new Error("Invalid virtual machine list response");
  }
  const record = json as Record<string, unknown>;
  const virtualMachines = Array.isArray(record.virtualMachines)
    ? record.virtualMachines.map(virtualMachineFromListJson)
    : [];
  return {
    virtualMachines,
    total: Number(record.total ?? 0),
    page: Number(record.page ?? 1),
    pageCount: Number(record.pageCount ?? 1),
  };
}

async function enrichVirtualMachinesWithMetadataFromDetail(
  sdk: DefaultApiInterface,
  vms: VirtualMachineWithExclusion[],
): Promise<VirtualMachineWithExclusion[]> {
  const missing = vms.filter((vm) => !getVmVSphereMetadata(vm));
  if (missing.length === 0) {
    return vms;
  }

  const metadataById = new Map<string, VmVSphereMetadata>();
  await Promise.all(
    missing.map(async (vm) => {
      try {
        const detail = await sdk.getLatestVirtualMachine({ vmId: vm.id });
        const metadata = normalizeVmMetadata(
          (detail as VirtualMachineDetailWithVSphere).metadata,
        );
        if (metadata) {
          metadataById.set(vm.id, metadata);
        }
      } catch {
        // Best-effort: table still renders when a detail lookup fails.
      }
    }),
  );

  if (metadataById.size === 0) {
    return vms;
  }

  return vms.map((vm) => {
    const metadata = metadataById.get(vm.id);
    return metadata ? { ...vm, metadata } : vm;
  });
}

/** Preserves vSphere `metadata` stripped by generated `VirtualMachineFromJSON`. */
export async function listLatestVirtualMachinesWithMetadata(
  sdk: DefaultApiInterface,
  params: Parameters<DefaultApiInterface["listLatestVirtualMachines"]>[0],
): Promise<VirtualMachineListResponse> {
  const response = await sdk.listLatestVirtualMachinesRaw(params);
  const json = await response.raw.json();
  const parsed = parseVirtualMachineListResponse(json);
  const virtualMachines = await enrichVirtualMachinesWithMetadataFromDetail(
    sdk,
    parsed.virtualMachines as VirtualMachineWithExclusion[],
  );
  return { ...parsed, virtualMachines };
}
