import type { UILanguage } from "@/lib/i18n";

export type AnalysisDirection =
  | "growth_opportunity"
  | "risk_detection"
  | "profit_optimization"
  | "customer_analysis"
  | "product_analysis";

export const ANALYSIS_DIRECTIONS: AnalysisDirection[] = [
  "growth_opportunity",
  "risk_detection",
  "profit_optimization",
  "customer_analysis",
  "product_analysis",
];

export const ANALYSIS_DIRECTION_ICONS: Record<AnalysisDirection, string> = {
  growth_opportunity: "\u2191",
  risk_detection: "\u26a0",
  profit_optimization: "\u00a5",
  customer_analysis: "\u25c9",
  product_analysis: "\u25a6",
};

/** The yen glyph only represents profit in zh; non-zh locales use a neutral target. */
export function analysisDirectionIcon(direction: AnalysisDirection, lang: UILanguage = "zh"): string {
  if (direction === "profit_optimization" && lang !== "zh") return "\u25ce";
  return ANALYSIS_DIRECTION_ICONS[direction];
}

export function isAnalysisDirection(value: unknown): value is AnalysisDirection {
  return typeof value === "string" && (ANALYSIS_DIRECTIONS as readonly string[]).includes(value);
}
