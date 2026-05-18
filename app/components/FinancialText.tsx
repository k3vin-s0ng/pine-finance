"use client";

/**
 * FinancialText — financial typography utilities for the Pine Assessment.
 *
 * Provides:
 *  • formatTabularNumber  — right-aligned mono with comma separators, dim trailing zeros
 *  • FinancialInlineText  — inline renderer that detects $, %, ratios and applies
 *                           small-caps M/B suffixes and dim trailing zeros
 *  • FinancialTableCell   — <td> wrapper with tabular-nums, right-align, mono font
 */

import React from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Add comma separators to an integer string */
function addCommas(intStr: string): string {
  return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** Split a number string into significant digits and trailing zeros */
function splitTrailingZeros(numStr: string): { sig: string; trailing: string } {
  const match = numStr.match(/^(.*?)(\.?0*)$/);
  if (!match) return { sig: numStr, trailing: "" };
  // Only dim trailing zeros after a decimal point
  const dotIdx = numStr.indexOf(".");
  if (dotIdx === -1) return { sig: numStr, trailing: "" };
  const afterDot = numStr.slice(dotIdx + 1);
  const trailingMatch = afterDot.match(/(0+)$/);
  if (!trailingMatch) return { sig: numStr, trailing: "" };
  const trailingLen = trailingMatch[1].length;
  const sig = numStr.slice(0, numStr.length - trailingLen);
  const trailing = numStr.slice(numStr.length - trailingLen);
  return { sig, trailing };
}

// ─── Tabular Number Formatter ─────────────────────────────────────────────────

/**
 * Formats a raw number string for tabular display:
 * - Adds comma separators to the integer part
 * - Returns { integer, decimal, trailing } parts for styled rendering
 */
export function parseTabularNumber(raw: string): {
  prefix: string;
  integer: string;
  decimal: string;
  trailing: string;
  suffix: string;
} {
  // Strip leading/trailing whitespace
  const s = raw.trim();
  // Detect prefix ($, -, (, etc.) and suffix (%, x, M, B, K)
  const prefixMatch = s.match(/^([$()\-+]*)(\d[\d,.]*)([MBKmb%x]?)(.*)$/);
  if (!prefixMatch) return { prefix: s, integer: "", decimal: "", trailing: "", suffix: "" };
  const [, prefix, numPart, unitSuffix, rest] = prefixMatch;
  const cleanNum = numPart.replace(/,/g, "");
  const dotIdx = cleanNum.indexOf(".");
  let intPart: string;
  let decPart: string;
  if (dotIdx === -1) {
    intPart = cleanNum;
    decPart = "";
  } else {
    intPart = cleanNum.slice(0, dotIdx);
    decPart = cleanNum.slice(dotIdx); // includes the dot
  }
  const formattedInt = addCommas(intPart);
  const { sig: sigDec, trailing } = decPart
    ? splitTrailingZeros(decPart)
    : { sig: "", trailing: "" };
  return {
    prefix,
    integer: formattedInt,
    decimal: sigDec,
    trailing,
    suffix: unitSuffix + rest,
  };
}

// ─── Inline Financial Text Renderer ──────────────────────────────────────────

/**
 * Renders a string with financial typography applied inline:
 * - Dollar amounts: $1,234.56M → comma-separated, small-caps M/B, dim trailing zeros
 * - Percentages: 12.30% → dim trailing zero
 * - Ratios: 1.15x → styled x
 * - Plain numbers in tables: comma-separated
 */
export function FinancialInlineText({ text }: { text: string }) {
  // Tokenise by financial patterns
  const TOKEN_RE =
    /(\$[\d,]+(?:\.\d+)?[MBKmb]?|\-?\d[\d,]*(?:\.\d+)?[MBKmb%x]|\(\$?[\d,]+(?:\.\d+)?[MBKmb]?\))/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = TOKEN_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(<FinancialToken key={match.index} raw={match[0]} />);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts}</>;
}

function FinancialToken({ raw }: { raw: string }) {
  const s = raw.trim();

  // Percentage: e.g. 12.30%, (14.2%)
  if (s.endsWith("%")) {
    const inner = s.slice(0, -1);
    const { sig, trailing } = splitTrailingZeros(inner);
    return (
      <span className="font-mono tabular-nums">
        {sig}
        {trailing && <span className="opacity-30">{trailing}</span>}
        <span className="text-[0.7em] opacity-70">%</span>
      </span>
    );
  }

  // Ratio: e.g. 1.15x
  if (s.endsWith("x") || s.endsWith("X")) {
    const inner = s.slice(0, -1);
    const { sig, trailing } = splitTrailingZeros(inner);
    return (
      <span className="font-mono tabular-nums">
        {sig}
        {trailing && <span className="opacity-30">{trailing}</span>}
        <span className="text-[0.7em] opacity-60 font-sans">×</span>
      </span>
    );
  }

  // M / B / K suffix (millions, billions, thousands)
  const mbkMatch = s.match(/^(.*?)([MBKmb])$/);
  if (mbkMatch) {
    const [, numPart, unit] = mbkMatch;
    const { sig, trailing } = splitTrailingZeros(numPart.replace(/,/g, ""));
    const sigWithCommas = sig.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const unitLabel = unit.toUpperCase();
    return (
      <span className="font-mono tabular-nums">
        {numPart.startsWith("$") && <span className="opacity-70">$</span>}
        {numPart.startsWith("$") ? sigWithCommas.replace(/^\$/, "") : sigWithCommas}
        {trailing && <span className="opacity-30">{trailing}</span>}
        <span
          className="text-[0.65em] font-sans font-bold opacity-60 tracking-wider"
          style={{ fontVariant: "small-caps" }}
        >
          {unitLabel}
        </span>
      </span>
    );
  }

  // Dollar amount without suffix: $1,234.56
  if (s.startsWith("$") || s.startsWith("($")) {
    const isNeg = s.startsWith("(");
    const inner = s.replace(/[()$,]/g, "");
    const { sig, trailing } = splitTrailingZeros(inner);
    const [intP, decP = ""] = sig.split(".");
    const formattedInt = addCommas(intP);
    return (
      <span className="font-mono tabular-nums">
        {isNeg && <span className="opacity-70">(</span>}
        <span className="opacity-70">$</span>
        {formattedInt}
        {decP && <span>.{decP}</span>}
        {trailing && <span className="opacity-30">{trailing}</span>}
        {isNeg && <span className="opacity-70">)</span>}
      </span>
    );
  }

  // Plain number with commas
  const numMatch = s.match(/^(-?)(\d[\d,]*)(\.\d+)?$/);
  if (numMatch) {
    const [, sign, intStr, dec = ""] = numMatch;
    const formattedInt = addCommas(intStr.replace(/,/g, ""));
    const { sig, trailing } = dec ? splitTrailingZeros(dec) : { sig: "", trailing: "" };
    return (
      <span className="font-mono tabular-nums">
        {sign}{formattedInt}{sig}{trailing && <span className="opacity-30">{trailing}</span>}
      </span>
    );
  }

  return <>{raw}</>;
}

// ─── Table Cell Wrapper ───────────────────────────────────────────────────────

/**
 * A <td> wrapper that applies tabular-nums, right-align, and mono font.
 * Use inside Markdown table overrides.
 */
export function FinancialTableCell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td
      className={`font-mono tabular-nums text-right py-1 px-2 text-xs ${className}`}
    >
      {children}
    </td>
  );
}

// ─── Word-count preview formatter ────────────────────────────────────────────

/**
 * Formats a response preview string: applies FinancialInlineText to any
 * line that looks like it contains financial data (has $, %, numbers).
 */
export function FormattedResponsePreview({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="font-mono text-xs leading-relaxed">
      {lines.map((line, i) => {
        const hasFinancialData = /[\$%]|\d{4,}|\d+\.\d+[x%MBK]?/i.test(line);
        return (
          <div key={i} className={hasFinancialData ? "tabular-nums" : ""}>
            {hasFinancialData ? <FinancialInlineText text={line} /> : line}
          </div>
        );
      })}
    </div>
  );
}
