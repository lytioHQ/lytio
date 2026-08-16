export type VerificationPurpose =
  | "verify_recommendation"
  | "verify_growth"
  | "verify_risk"
  | "verify_profit"
  | "general_verification";

export const VERIFICATION_PURPOSES: VerificationPurpose[] = [
  "verify_recommendation",
  "verify_growth",
  "verify_risk",
  "verify_profit",
  "general_verification",
];

export const VERIFICATION_PURPOSE_ICONS: Record<VerificationPurpose, string> = {
  verify_recommendation: "\u25c6",
  verify_growth: "\u2191",
  verify_risk: "\u26a0",
  verify_profit: "\u00a5",
  general_verification: "\u25c9",
};

export function isVerificationPurpose(value: unknown): value is VerificationPurpose {
  return typeof value === "string" && (VERIFICATION_PURPOSES as readonly string[]).includes(value);
}
