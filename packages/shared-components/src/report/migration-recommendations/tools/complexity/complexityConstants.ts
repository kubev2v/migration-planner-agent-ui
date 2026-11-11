/** Complexity tier colors keyed by score (0 = Unknown, 1 = Easiest, …, 4 = Hardest). */
export const COMPLEXITY_COLORS: Record<number, string> = {
  0: "#8A8D90",
  1: "#5BA352",
  2: "#009596",
  3: "#F0AB00",
  4: "#C9190B",
};

/** Complexity tier labels keyed by score. */
export const COMPLEXITY_LABELS: Record<number, string> = {
  0: "Unknown",
  1: "Easiest",
  2: "Easy",
  3: "Moderate",
  4: "Hardest",
};

/** Badge text color chosen for contrast on {@link COMPLEXITY_COLORS}. */
export const COMPLEXITY_BADGE_TEXT_COLORS: Record<number, string> = {
  0: "#151515",
  1: "#151515",
  2: "#151515",
  3: "#151515",
  4: "#ffffff",
};

const UNKNOWN_COMPLEXITY_LABEL = COMPLEXITY_LABELS[0];

export const getComplexityLabel = (score: number): string =>
  COMPLEXITY_LABELS[score] ?? UNKNOWN_COMPLEXITY_LABEL;

export const getComplexityBadgeStyle = (
  score: number,
): { backgroundColor: string; color: string } => ({
  backgroundColor: COMPLEXITY_COLORS[score] ?? COMPLEXITY_COLORS[0],
  color: COMPLEXITY_BADGE_TEXT_COLORS[score] ?? COMPLEXITY_BADGE_TEXT_COLORS[0],
});
