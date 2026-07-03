import type {
  ForecasterDatastore,
  SelectedPair,
} from "../utils/forecasterTypes";

export type PageView = "empty" | "results";

export const SESSION_KEY = "forecaster-wizard-state";
export const CANCELED_PAIRS_SESSION_KEY = "forecaster-canceled-pairs";

export interface PersistedWizardState {
  url: string;
  username: string;
  pageView: PageView;
  credentialsSubmitted: boolean;
  datastores: ForecasterDatastore[];
  pairs: SelectedPair[];
}

type LegacyPersistedWizardState = PersistedWizardState & {
  activeStep?: string;
};

/** Migrates legacy `activeStep` from the inline wizard to `pageView`. */
export function migrateLegacyWizardState(
  parsed: LegacyPersistedWizardState,
): Partial<PersistedWizardState> {
  if (!parsed.activeStep) {
    return parsed;
  }

  const legacyStep = parsed.activeStep;
  return {
    ...parsed,
    pageView:
      legacyStep === "results" || legacyStep === "running"
        ? "results"
        : "empty",
    credentialsSubmitted:
      !!parsed.datastores?.length ||
      legacyStep === "select-pairs" ||
      legacyStep === "running" ||
      legacyStep === "results",
  };
}

export function loadWizardState(): Partial<PersistedWizardState> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as LegacyPersistedWizardState;
    return migrateLegacyWizardState(parsed);
  } catch {
    return {};
  }
}

export function saveWizardState(state: PersistedWizardState): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch {
    // ignore if sessionStorage is unavailable
  }
}

export function clearWizardState(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(CANCELED_PAIRS_SESSION_KEY);
  } catch {
    // ignore
  }
}

export function loadCanceledPairKeys(): Set<string> {
  try {
    const raw = sessionStorage.getItem(CANCELED_PAIRS_SESSION_KEY);
    if (!raw) {
      return new Set();
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? new Set(parsed.filter((k): k is string => typeof k === "string"))
      : new Set();
  } catch {
    return new Set();
  }
}

export function saveCanceledPairKeys(keys: ReadonlySet<string>): void {
  try {
    sessionStorage.setItem(
      CANCELED_PAIRS_SESSION_KEY,
      JSON.stringify([...keys]),
    );
  } catch {
    // ignore if sessionStorage is unavailable
  }
}
