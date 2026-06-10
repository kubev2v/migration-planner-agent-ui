import { useEffect, useMemo, useState } from "react";
import { getPairCapabilities } from "../forecasterApi";
import type { SelectedPair } from "../forecasterTypes";
import { isCompletePair } from "./storageOffloadUtils";

export function usePairCapabilities(
  basePath: string,
  pairs: SelectedPair[],
): {
  pairCapsMap: Record<string, string[] | null>;
  capsLoading: boolean;
  hasNoCaps: boolean;
} {
  const completePairs = useMemo(() => pairs.filter(isCompletePair), [pairs]);

  const [pairCapsMap, setPairCapsMap] = useState<
    Record<string, string[] | null>
  >({});
  const [capsLoading, setCapsLoading] = useState(false);

  useEffect(() => {
    if (completePairs.length === 0) {
      setPairCapsMap({});
      setCapsLoading(false);
      return;
    }

    let cancelled = false;
    setCapsLoading(true);

    getPairCapabilities(basePath, {
      pairs: completePairs.map((p) => ({
        name: p.name,
        sourceDatastore: p.sourceDatastore,
        targetDatastore: p.targetDatastore,
      })),
    })
      .then((results) => {
        if (cancelled) return;
        const next: Record<string, string[]> = {};
        for (const p of completePairs) {
          const cap = results.find(
            (c) =>
              c.sourceDatastore === p.sourceDatastore &&
              c.targetDatastore === p.targetDatastore,
          );
          next[p.id] = cap?.capabilities ?? [];
        }
        setPairCapsMap(next);
      })
      .catch(() => {
        if (cancelled) return;
        const next: Record<string, null> = {};
        for (const p of completePairs) {
          next[p.id] = null;
        }
        setPairCapsMap(next);
      })
      .finally(() => {
        if (!cancelled) setCapsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [basePath, completePairs]);

  const hasNoCaps = useMemo(
    () =>
      completePairs.some((p) => {
        const caps = pairCapsMap[p.id];
        return caps !== null && caps !== undefined && caps.length === 0;
      }),
    [completePairs, pairCapsMap],
  );

  return { pairCapsMap, capsLoading, hasNoCaps };
}
