import type { ExpectedNumericalAnswer } from "./expectedAnswers";

export type ParseResult = {
  /** Parsed number in the expected unit's natural scale, or null if unparseable */
  value: number | null;
  /** Whether a number was found at all (vs. empty/non-numeric input) */
  hasNumber: boolean;
};

/**
 * Parse a candidate's free-text numerical input into a number, accounting for:
 * - Currency symbols ($, USD)
 * - Thousand separators (commas)
 * - Unit suffixes (M, B, K, %, x, bps)
 * - Leading/trailing prose ("approximately 18.4%")
 * - Negative values (parentheses or minus sign)
 *
 * Returns the value normalized to the expected unit's natural scale. For example,
 * an expected unit of "$M" and candidate input "$4.7B" will parse as 4700.
 * Expected unit "%" and candidate input "13.2%" parses as 13.2 (not 0.132).
 */
export function parseNumericalInput(raw: string, expected: ExpectedNumericalAnswer): ParseResult {
  if (!raw || typeof raw !== "string") return { value: null, hasNumber: false };

  const cleaned = raw.trim();
  if (cleaned.length === 0) return { value: null, hasNumber: false };

  const isParenNegative = /^\(.*\)$/.test(cleaned);
  const stripped = isParenNegative ? cleaned.slice(1, -1) : cleaned;

  const match = stripped.match(/-?[\d,]+(?:\.\d+)?/);
  if (!match) return { value: null, hasNumber: false };

  const numStr = match[0].replace(/,/g, "");
  const baseValue = parseFloat(numStr);
  if (!Number.isFinite(baseValue)) return { value: null, hasNumber: false };

  const signedValue = isParenNegative ? -Math.abs(baseValue) : baseValue;

  const lower = stripped.toLowerCase();
  const hasBillionSuffix = /\b\d[\d,.]*\s*b\b/i.test(stripped) || lower.includes("billion");
  const hasMillionSuffix = /\b\d[\d,.]*\s*m\b/i.test(stripped) || lower.includes("million");
  const hasThousandSuffix = /\b\d[\d,.]*\s*k\b/i.test(stripped) || lower.includes("thousand");
  const hasBpsSuffix = lower.includes("bps") || lower.includes("basis point");

  let normalized = signedValue;

  switch (expected.unit) {
    case "$M": {
      if (hasBillionSuffix) normalized = signedValue * 1000;
      else if (hasThousandSuffix) normalized = signedValue / 1000;
      else if (!hasMillionSuffix && Math.abs(signedValue) > 100000) {
        normalized = signedValue / 1_000_000;
      }
      break;
    }
    case "$B": {
      if (hasMillionSuffix) normalized = signedValue / 1000;
      else if (hasThousandSuffix) normalized = signedValue / 1_000_000;
      else if (!hasBillionSuffix && Math.abs(signedValue) > 1000) {
        normalized = signedValue / 1000;
      }
      break;
    }
    case "$": {
      if (hasBillionSuffix) normalized = signedValue * 1_000_000_000;
      else if (hasMillionSuffix) normalized = signedValue * 1_000_000;
      else if (hasThousandSuffix) normalized = signedValue * 1_000;
      break;
    }
    case "%": {
      if (hasBpsSuffix) normalized = signedValue / 100;
      else if (Math.abs(signedValue) > 0 && Math.abs(signedValue) < 1 && Math.abs(expected.value) >= 1) {
        normalized = signedValue * 100;
      }
      break;
    }
    case "x":
      break;
    case "0/1":
      normalized = signedValue > 0 ? 1 : 0;
      break;
  }

  return { value: normalized, hasNumber: true };
}

/**
 * Check whether a parsed value matches the expected value within tolerance.
 * Returns the relative error (0 = exact match, 0.05 = 5% off), or null if unparseable.
 */
export function withinTolerance(parsed: ParseResult, expected: ExpectedNumericalAnswer): {
  matches: boolean;
  relativeError: number | null;
} {
  if (parsed.value === null) return { matches: false, relativeError: null };
  const tolerance = expected.tolerancePct ?? 0.02;

  if (expected.value === 0) {
    return { matches: Math.abs(parsed.value) < 0.0001, relativeError: Math.abs(parsed.value) };
  }

  const relativeError = Math.abs((parsed.value - expected.value) / expected.value);
  return { matches: relativeError <= tolerance, relativeError };
}
