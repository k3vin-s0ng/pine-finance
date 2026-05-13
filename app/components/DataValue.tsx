/**
 * DataValue — first-class financial number rendering component.
 *
 * Features:
 * - JetBrains Mono / tabular lining figures
 * - Auto-detects type: currency ($), percentage (%), ratio (x)
 * - Semantic color: positive → --data-positive, negative → --data-negative,
 *   neutral → --data-neutral (default)
 * - Optional delta arrow (▲ / ▼) when `delta` prop is provided
 * - Optional `emphasis` prop: small rounded background tint
 * - Optional `label` prop: small muted label before the value
 */
import React from "react";

type ValueType = "currency" | "percentage" | "ratio" | "auto";

interface DataValueProps {
  value: string | number;
  /** Explicit type override; defaults to "auto" (inferred from value string) */
  type?: ValueType;
  /**
   * Positive number = up delta, negative = down delta.
   * When provided, a directional arrow is shown and color is forced to
   * data-positive / data-negative regardless of the value itself.
   */
  delta?: number;
  /** Wrap in a small rounded background tint */
  emphasis?: boolean;
  /** Small muted label shown before the value */
  label?: string;
  className?: string;
}

function inferType(val: string): ValueType {
  const s = String(val).trim();
  if (s.includes("%")) return "percentage";
  if (s.startsWith("$") || s.startsWith("(") || /^\d[\d,]*(\.\d+)?[BbMmKk]?$/.test(s)) return "currency";
  if (s.endsWith("x") || s.endsWith("X")) return "ratio";
  return "auto";
}

function getColor(type: ValueType, delta?: number): string {
  if (delta !== undefined) {
    return delta > 0
      ? "var(--data-positive)"
      : delta < 0
      ? "var(--data-negative)"
      : "var(--data-neutral)";
  }
  if (type === "currency" || type === "percentage") return "var(--data-neutral)";
  if (type === "ratio") return "var(--data-neutral)";
  return "var(--data-neutral)";
}

export function DataValue({
  value,
  type = "auto",
  delta,
  emphasis = false,
  label,
  className = "",
}: DataValueProps) {
  const resolvedType = type === "auto" ? inferType(String(value)) : type;
  const color = getColor(resolvedType, delta);

  const arrow =
    delta !== undefined
      ? delta > 0
        ? "▲\u202F"
        : delta < 0
        ? "▼\u202F"
        : ""
      : "";

  const inner = (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontFeatureSettings: '"tnum", "lnum"',
        fontWeight: 500,
        color,
        letterSpacing: "0.01em",
      }}
    >
      {arrow}
      {value}
    </span>
  );

  return (
    <span
      className={`inline-flex items-baseline gap-1 ${className}`}
      style={{ fontFamily: "var(--font-ui)" }}
    >
      {label && (
        <span
          style={{
            fontSize: "0.7em",
            color: "var(--text-tertiary)",
            fontWeight: 500,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {label}&nbsp;
        </span>
      )}
      {emphasis ? (
        <span
          style={{
            background: `${color}18`,
            border: `1px solid ${color}30`,
            borderRadius: "4px",
            padding: "0 5px 1px",
            display: "inline-flex",
            alignItems: "baseline",
          }}
        >
          {inner}
        </span>
      ) : (
        inner
      )}
    </span>
  );
}

export default DataValue;