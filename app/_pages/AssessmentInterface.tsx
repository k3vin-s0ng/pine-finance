"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useLocation } from "@/app/lib/wouter";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/app/lib/trpc";
import { useLocalStorageDraft } from "@/app/hooks/useLocalStorageDraft";
import { useTaskProgress } from "@/app/hooks/useTaskProgress";
import { useCompositionTracker } from "@/app/hooks/useCompositionTracker";
import { DataValue } from "@/app/components/DataValue";
import {
  MemoComposer, VarianceComposer, ThesisComposer,
  ExtractionComposer, ReconciliationComposer, FlagsComposer,
  type MemoValue, type VarianceValue, type ThesisValue,
  type ExtractionValue, type ReconciliationValue, type FlagsValue,
  type ComposerValue,
} from "@/app/components/ResponseComposers";
import { eventTimestamp, mountTimestamp } from "@/app/lib/eventTime";
import {
  Clock, Send, ChevronRight, ChevronLeft, FileText, Table2,
  BarChart3, AlertTriangle, CheckCircle, Loader2, BookOpen, Zap, ShieldAlert,
  Timer as TimerIcon, Clipboard, Sparkles, Quote,
  Activity
} from "lucide-react";
import { Streamdown } from "streamdown";
import { PdfMaterialViewer } from "@/app/components/PdfMaterialViewer";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/app/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";

// ─── Source Materials ─────────────────────────────────────────────────────────
const SOURCE_MATERIALS = {
  "10K": {
    label: "10-K Filing",
    icon: FileText,
    content: `# Acme Financial Corp — Annual Report (Form 10-K)
**Fiscal Year Ended December 31, 2024**

---

## ITEM 1. BUSINESS

Acme Financial Corp ("Acme" or the "Company") is a diversified financial services company providing investment banking, asset management, and capital markets services to institutional and corporate clients globally.

**Revenue by Segment (FY2024)**

| Segment | Revenue ($M) | YoY Change |
|---------|-------------|------------|
| Investment Banking | $1,842 | +12.3% |
| Asset Management | $934 | +7.1% |
| Capital Markets | $2,107 | +18.6% |
| Corporate & Other | $(124) | — |
| **Total** | **$4,759** | **+13.2%** |

---

## ITEM 7. MANAGEMENT'S DISCUSSION AND ANALYSIS

### Results of Operations

**Net Revenue** increased 13.2% year-over-year to $4,759 million, driven primarily by strong Capital Markets performance and recovery in M&A advisory fees.

**Operating Expenses** totaled $3,421 million, representing a 71.9% efficiency ratio, compared to 74.2% in the prior year.

**Net Income** attributable to common shareholders was $892 million, or $6.14 per diluted share, compared to $743 million, or $5.08 per diluted share in FY2023.

### Liquidity and Capital Resources

The Company maintained a Tier 1 Capital Ratio of 14.8% as of December 31, 2024, well above the regulatory minimum of 6.0%.

Cash and cash equivalents totaled $8.2 billion. The Company has access to $15 billion in committed credit facilities.

---

## ITEM 8. FINANCIAL STATEMENTS

### Consolidated Balance Sheet (Selected Items)

| | Dec 31, 2024 | Dec 31, 2023 |
|--|--|--|
| Total Assets | $287.4B | $261.8B |
| Total Liabilities | $261.2B | $238.4B |
| Total Equity | $26.2B | $23.4B |
| Book Value per Share | $180.41 | $160.82 |

### Key Ratios

- **Return on Equity (ROE):** 18.4%
- **Return on Assets (ROA):** 0.31%
- **Debt-to-Equity:** 9.97x
- **Price-to-Book:** 1.42x (as of Dec 31, 2024)
`,
  },
  "Earnings": {
    label: "Earnings Release",
    icon: BarChart3,
    content: `# Acme Financial Corp — Q4 2024 Earnings Release

**FOR IMMEDIATE RELEASE**
January 15, 2025

---

## Q4 2024 HIGHLIGHTS

- **Net Revenue:** $1,312M (+16.8% YoY)
- **EPS (Diluted):** $1.74 (+22.5% YoY)
- **ROE:** 19.2% (Q4 annualized)
- **Efficiency Ratio:** 70.1% (improved from 73.4% in Q4 2023)

---

## SEGMENT RESULTS

### Investment Banking
Q4 advisory fees of $312M reflected a strong M&A environment with 23 completed transactions totaling $48B in deal value. Equity underwriting revenue of $187M benefited from robust IPO activity.

### Capital Markets
Fixed income trading revenue of $489M increased 24% YoY driven by elevated rates volatility. Equities revenue of $298M was up 11% YoY.

### Asset Management
AUM reached $412B at quarter end, up from $387B at September 30, 2024. Management fees of $241M increased 6% YoY.

---

## OUTLOOK

Management expects continued momentum in advisory and underwriting activity in H1 2025, supported by a constructive M&A environment and anticipated rate cuts. The Company is targeting an efficiency ratio below 70% for FY2025.

**Conference Call:** January 16, 2025 at 8:00 AM ET
`,
  },
  "Model": {
    label: "Financial Model",
    icon: Table2,
    content: `# Acme Financial Corp — DCF Model (Working Draft)

## Assumptions

| Parameter | Value |
|-----------|-------|
| Risk-Free Rate | 4.25% |
| Equity Risk Premium | 5.50% |
| Beta | 1.15 |
| Cost of Equity (CAPM) | 10.58% |
| Terminal Growth Rate | 2.5% |
| Discount Rate (WACC) | 9.8% |

---

## Revenue Projections

| Year | Revenue ($M) | Growth |
|------|-------------|--------|
| 2024A | 4,759 | +13.2% |
| 2025E | 5,187 | +9.0% |
| 2026E | 5,654 | +9.0% |
| 2027E | 6,043 | +6.9% |
| 2028E | 6,345 | +5.0% |
| Terminal | — | 2.5% |

---

## DCF Valuation

| | Value ($M) |
|--|--|
| PV of FCF (2025–2028) | $3,842 |
| Terminal Value (PV) | $28,614 |
| Enterprise Value | $32,456 |
| Less: Net Debt | $(4,210) |
| Equity Value | $28,246 |
| Shares Outstanding (M) | 145.3 |
| **Implied Share Price** | **$194.40** |
| Current Price | $256.50 |
| **Premium/(Discount)** | **(24.2%)** |

---

## Sensitivity Analysis — Share Price

| Terminal Growth \\ WACC | 8.8% | 9.3% | 9.8% | 10.3% | 10.8% |
|--|--|--|--|--|--|
| 1.5% | $218 | $201 | $186 | $173 | $161 |
| 2.0% | $231 | $213 | $196 | $182 | $169 |
| **2.5%** | **$247** | **$226** | **$208** | **$192** | **$178** |
| 3.0% | $265 | $242 | $222 | $204 | $188 |
| 3.5% | $287 | $261 | $238 | $218 | $200 |

*Note: Model uses mid-year convention. FCF = EBITDA × (1 - tax rate) - ΔWC - Capex*
`,
  },
  "OCC_EXAM": {
    label: "OCC Examination Summary (2024)",
    icon: ShieldAlert,
    content: `# Office of the Comptroller of the Currency — Examination Summary
**Cornerstone Community Bank, N.A. — Atlanta, GA · Charter #24817**
**Examination as of December 31, 2024 (Confidential Supervisory Information — fictional, for assessment use)**

---

## COMPOSITE RATING

**CAMELS Composite: 3** (downgraded from 2 at the prior examination)

| Component | 2023 | 2024 | Examiner Commentary |
|---|---|---|---|
| **C**apital | 2 | 2 | Adequate but declining; Tier 1 ratio fell from 12.4% to 11.1% over two years. |
| **A**sset Quality | 2 | **3** | NPLs more than tripled to 3.8% (peer avg 1.9%); CRE concentration of 312% of total capital exceeds the 300% supervisory guideline; allowance coverage of nonperforming loans is thin. |
| **M**anagement | 2 | **3** | Compliance oversight has not kept pace with growth; three BSA/AML Matters Requiring Attention (MRAs) remain open; board reporting on emerging credit and compliance risk is insufficient. |
| **E**arnings | 2 | **3** | Net income declined from $41M (2022) to $29M (2024); efficiency ratio deteriorated from 68.2% to 74.8%; rising provisions pressure pre-provision earnings. |
| **L**iquidity | 2 | 2 | Core deposit funding adequate; contingency funding plan satisfactory. |
| **S**ensitivity to Market Risk | 2 | 2 | Interest-rate risk within board limits. |

---

## MATTERS REQUIRING ATTENTION (MRAs)

The bank has **3 open BSA/AML MRAs** (0 in 2022, 1 in 2023, 3 in 2024):

1. **BSA/AML staffing and oversight.** The BSA Officer's span of control is too broad for the bank's transaction volume and customer-risk profile. Staffing has not scaled with asset growth from $5.4B to $6.2B.
2. **SAR filing timeliness.** A backlog of Suspicious Activity Reports was filed beyond the regulatory deadline, and several alerts were not dispositioned within policy timeframes.
3. **Customer Due Diligence / Enhanced Due Diligence.** CDD/EDD on higher-risk relationships (money services businesses, cash-intensive merchants) is incomplete; beneficial-ownership documentation gaps were noted.

---

## CREDIT QUALITY ASSESSMENT

Asset quality is the primary driver of the composite downgrade. Nonperforming loans rose to 3.8% of total loans, concentrated in commercial real estate and construction. The allowance for credit losses (1.3% of loans) covers only ~34% of nonperforming loans, which examiners consider potentially understated given the migration trend. CRE concentration at 312% of total risk-based capital exceeds the interagency guideline of 300% and warrants heightened risk-management practices the bank has not fully implemented.

## MANAGEMENT EVALUATION

Management has delivered consistent balance-sheet growth but under-invested in risk and compliance infrastructure. The board has not received adequate reporting on escalating BSA/AML and credit concentrations. The Community Reinvestment Act rating was downgraded to **Needs Improvement** at the most recent CRA examination (see Compliance Program Overview).
`,
  },
  "FINANCIALS": {
    label: "Selected Financials (FY2022–FY2024)",
    icon: BarChart3,
    content: `# Cornerstone Community Bank — Selected Financial Statements
**FY2022–FY2024 ($ in millions unless noted) · fictional, for assessment use**

## Summary Regulatory & Financial Metrics

| Metric | FY2022 | FY2023 | FY2024 | Note |
|---|---|---|---|---|
| Total Assets | $5,400 | $5,800 | $6,200 | Steady growth |
| Net Revenue | $187 | $198 | $203 | Slowing momentum |
| Net Income | $41 | $38 | $29 | Declining |
| NPL Ratio | 1.2% | 2.1% | 3.8% | Peer avg 1.9% |
| Allowance / Loans | 1.1% | 1.2% | 1.3% | Covers only ~34% of NPLs |
| CRE Concentration (% capital) | 248% | 271% | 312% | Exceeds 300% guideline |
| Efficiency Ratio | 68.2% | 71.4% | 74.8% | Deteriorating |
| Tier 1 Capital Ratio | 12.4% | 11.8% | 11.1% | Declining |
| CAMELS Composite | 2 | 2 | 3 | Downgraded 2024 |
| BSA/AML MRAs Outstanding | 0 | 1 | 3 | Escalating |
| CRA Rating | Satisfactory | Satisfactory | Needs Improvement | Downgraded |

## Income Statement (condensed)

| | FY2022 | FY2023 | FY2024 |
|---|---|---|---|
| Net interest income | $151 | $160 | $165 |
| Noninterest income | $36 | $38 | $38 |
| **Net revenue** | **$187** | **$198** | **$203** |
| Noninterest expense | $(127.5) | $(141.4) | $(151.8) |
| **Pre-provision net revenue** | **$59.5** | **$56.6** | **$51.2** |
| Provision for credit losses | $(5.0) | $(7.0) | $(14.5) |
| Pre-tax income | $54.5 | $49.6 | $36.7 |
| Income tax | $(13.5) | $(11.6) | $(7.7) |
| **Net income** | **$41.0** | **$38.0** | **$29.0** |

## Balance Sheet (selected, FY2024)

| | FY2024 |
|---|---|
| Total assets | $6,200 |
| Gross loans | $4,600 |
| Allowance for credit losses | $(60) |
| Total deposits | $5,120 |
| Total equity (book) | $620 |
| Tier 1 capital ratio | 11.1% |

## Loan Portfolio Breakdown (FY2024, gross $ and % of loans)

| Category | Balance | % | Nonperforming |
|---|---|---|---|
| CRE — non-owner-occupied | $1,200 | 26.1% | $74 |
| Construction & land development | $380 | 8.3% | $58 |
| Multifamily | $290 | 6.3% | $9 |
| Commercial & industrial | $920 | 20.0% | $22 |
| Residential mortgage (1–4 family) | $1,140 | 24.8% | $5 |
| Consumer & other | $670 | 14.6% | $7 |
| **Total** | **$4,600** | **100%** | **$175 (3.8%)** |

Total CRE (non-owner-occupied + construction + multifamily) = **$1,870M = 312% of total risk-based capital**. Construction & land = 63% of capital. Construction shows the highest nonperforming rate (~15%).

## Allowance for Credit Losses — Roll-forward

| | FY2024 |
|---|---|
| Beginning ACL | $54 |
| Provision | $14.5 |
| Net charge-offs | $(8.5) |
| **Ending ACL** | **$60 (1.3% of loans)** |
`,
  },
  "COMPLIANCE": {
    label: "Compliance Program Overview",
    icon: FileText,
    content: `# Cornerstone Community Bank — Compliance Program Overview
**Management Self-Assessment, 2024 · fictional, for assessment use**

## BSA/AML Program
Administered by a BSA Officer supported by two analysts. Transaction-monitoring alerts have grown ~40% over two years alongside asset growth, but staffing is unchanged. The self-assessment acknowledges the three open OCC MRAs: staffing/oversight, SAR filing timeliness (a filing backlog exists), and CDD/EDD on higher-risk customers (money services businesses and cash-intensive merchants). Remediation is "in progress" but not yet validated; estimated remediation cost is not quantified.

## Community Reinvestment Act (CRA)
| Exam | Rating |
|---|---|
| 2018 | Satisfactory |
| 2021 | Satisfactory |
| 2024 | **Needs Improvement** |

The 2024 downgrade cited a lending-test deficiency: declining origination volume in low- and moderate-income (LMI) census tracts within the assessment area, and limited community-development lending relative to capacity.

## Fair Lending Self-Assessment
No formal enforcement actions. Internal review flagged statistical disparities in mortgage denial rates warranting further analysis; remediation plan pending.

## Customer Complaint Log (summary)
| Category | FY2023 | FY2024 |
|---|---|---|
| Overdraft / NSF fees | 41 | 67 |
| Loan servicing / escrow | 22 | 38 |
| Mortgage application / denial | 9 | 18 |
| Other | 15 | 21 |
| **Total** | **87** | **144** |

Complaint volume rose 66% year-over-year, sharpest in fee-related and mortgage-denial categories.
`,
  },
  "LOAN_TAPE": {
    label: "Loan Portfolio Tape (Q3 2024)",
    icon: Table2,
    content: `# Cornerstone Community Bank — Loan Portfolio Tape
**Representative sample, Q3 2024 snapshot · fictional, for assessment use**

| Loan ID | Category | Balance ($M) | Days Past Due | Collateral | Originated | Rate |
|---|---|---|---|---|---|---|
| L-1042 | Construction & land | 24.0 | 90+ | Land — stalled mixed-use | 2022-06 | 8.25% |
| L-1119 | Construction & land | 18.5 | 60 | Partially built retail | 2022-11 | 8.50% |
| L-2071 | CRE non-owner-occ | 31.0 | 90+ | Office (suburban) | 2021-03 | 5.10% |
| L-2088 | CRE non-owner-occ | 22.4 | 30 | Retail strip center | 2021-09 | 5.40% |
| L-2095 | CRE non-owner-occ | 19.8 | Current | Industrial warehouse | 2023-02 | 6.75% |
| L-3050 | C&I | 12.0 | 30 | UCC blanket lien | 2022-08 | 7.20% |
| L-3061 | C&I | 8.6 | Current | Equipment | 2023-05 | 7.60% |
| L-4007 | Multifamily | 27.5 | Current | 120-unit apartment | 2020-10 | 4.80% |
| L-5012 | Residential 1–4 | 1.2 | Current | Owner-occupied home | 2021-07 | 4.25% |
| L-6033 | Consumer | 0.4 | 30 | Auto | 2023-01 | 9.10% |

**Tape observations:** Delinquency is concentrated in construction and non-owner-occupied CRE originated in 2021–2022 at lower rates; several large construction credits are 60–90+ days past due, consistent with the rise in the bank's NPL ratio. Newer CRE originations carry higher rates but are early in their seasoning. Residential and consumer books are performing.
`,
  },
};

// ─── Task Prompts ─────────────────────────────────────────────────────────────
const TASK_PROMPTS = {
  "IB Analyst": [
    {
      id: "t1",
      responseType: "extraction" as const,
      title: "Revenue Bridge & Data Extraction",
      imperative: "Build a revenue bridge from FY2023 to FY2024, quantify each segment's dollar contribution, and flag any revenue quality concerns.",
      dataPoints: [
        { label: "Total Revenue", value: "$4,759M", delta: 1 },
        { label: "YoY", value: "+13.2%", delta: 1 },
        { label: "Cap Mkts", value: "$2,107M", delta: 1 },
        { label: "IB", value: "$1,842M", delta: 1 },
      ],
      context: "Acme Financial reported FY2024 total net revenue of $4,759M, up 13.2% year-over-year from $4,205M in FY2023. Segment contributions: Capital Markets $2,107M (+18.6% YoY), Investment Banking $1,842M (+12.3% YoY), and Asset Management $934M (+7.1% YoY).",
      deliverable: "Used in a client pitch book — be specific, cite figures, and state your conclusions clearly.",
      prompt: "Acme Financial reported FY2024 total net revenue of $4,759M, up 13.2% year-over-year from $4,205M in FY2023. Segment contributions: Capital Markets $2,107M (+18.6% YoY), Investment Banking $1,842M (+12.3% YoY), and Asset Management $934M (+7.1% YoY). Using the 10-K and Q4 2024 earnings release, build a revenue bridge from FY2023 to FY2024. Quantify each segment's dollar contribution to the $554M total increase, assess whether growth was organic or driven by market conditions, and flag any revenue quality concerns (e.g., one-time items, cyclical tailwinds). Your analysis will be used in a client pitch book — be specific, cite figures, and state your conclusions clearly.",
      aiSuggestions: [
        "Walk me through revenue bridge methodology",
        "Help me identify the largest segment contributor",
        "Check my logic on organic vs. inorganic growth",
        "What anomalies should I flag in the revenue mix?",
      ],
    },
    {
      id: "t2",
      responseType: "memo" as const,
      title: "DCF Model Critique",
      imperative: "Identify at least 3 specific DCF assumptions to challenge, propose alternatives, and quantify the sensitivity for each.",
      dataPoints: [
        { label: "Fair Value", value: "$194.40", delta: -1 },
        { label: "Market Price", value: "$256.50" },
        { label: "WACC", value: "9.8%" },
        { label: "TGR", value: "2.5%" },
      ],
      context: "The DCF model implies a per-share fair value of $194.40, based on a WACC of 9.8%, a terminal growth rate of 2.5%, and a 5-year revenue CAGR of approximately 7.4%. The current market price is $256.50, representing a 31.9% premium to intrinsic value.",
      deliverable: "Conclude with a revised valuation range — show your work on at least one sensitivity.",
      prompt: "The provided DCF model implies a per-share fair value of $194.40, based on a WACC of 9.8%, a terminal growth rate of 2.5%, and a 5-year revenue CAGR of approximately 7.4% (from $4,759M in 2024A to $6,345M in 2028E). The current market price is $256.50, representing a 31.9% premium to the model's intrinsic value. Identify at least 3 specific assumptions you would challenge as an IB analyst. For each: state the current assumption, explain why it may be flawed given the business profile, propose an alternative, and quantify the sensitivity (e.g., 'a 50bps reduction in WACC increases fair value by approximately $X/share'). Conclude with a revised valuation range.",
      aiSuggestions: [
        "Walk me through DCF WACC sensitivity analysis",
        "What terminal growth rate is appropriate for a financial firm?",
        "How do I quantify sensitivity for a 50bps WACC change?",
        "What are the biggest risks to the revenue CAGR assumption?",
      ],
    },
    {
      id: "t3",
      responseType: "flags" as const,
      title: "M&A Risk Identification",
      imperative: "Draft a 3-paragraph executive summary for a senior banker evaluating Acme Financial as a potential M&A target.",
      dataPoints: [
        { label: "Revenue", value: "$4,759M" },
        { label: "Net Income", value: "$892M" },
        { label: "ROE", value: "18.4%" },
        { label: "P/B", value: "1.42x" },
      ],
      context: "FY2024 net revenue $4,759M (+13.2% YoY), net income $892M (18.7% net margin), EPS $6.14 (+20.9% YoY), ROE 18.4%, efficiency ratio 71.9%, total assets $287.4B, book value per share $180.41, current price $256.50 (1.42x P/B). Comparable transactions have closed at 1.6x–2.0x book value.",
      deliverable: "Cover business quality, valuation context at a 20% control premium, and a balanced view of strategic rationale and key risks.",
      prompt: "Draft a 3-paragraph executive summary for a senior banker evaluating Acme Financial as a potential M&A target. Key metrics: FY2024 net revenue $4,759M (+13.2% YoY), net income $892M (18.7% net margin), EPS $6.14 (+20.9% YoY), ROE 18.4%, efficiency ratio 71.9% (improved from 74.2% in FY2023), total assets $287.4B, book value per share $180.41, and current price $256.50 (1.42x P/B). The DCF model implies intrinsic value of $194.40 (24.2% downside to market). Comparable transactions in the sector have closed at 1.6x–2.0x book value. Your summary should cover: (1) business quality and financial profile with specific figures, (2) valuation context and implied deal size at a 20% control premium, and (3) a balanced view of strategic rationale and key risks.",
      aiSuggestions: [
        "How do I structure an M&A executive summary?",
        "What control premium is typical in financial services M&A?",
        "Help me frame the valuation context paragraph",
        "What are the key risks for a financial services acquisition?",
      ],
    },
  ],
  "Management Consultant": [
    {
      id: "t1",
      responseType: "flags" as const,
      title: "Red Flag Identification",
      imperative: "Identify the three highest-priority regulatory and credit risks in the Cornerstone data, ranked by severity, each citing the specific data point and explaining why it threatens regulatory approval or post-close value.",
      dataPoints: [
        { label: "CAMELS", value: "3", delta: -1 },
        { label: "NPL", value: "3.8%", delta: -1 },
        { label: "CRE", value: "312%", delta: -1 },
        { label: "BSA MRAs", value: "3", delta: -1 },
      ],
      context: "Vantage Financial Group (NYSE: VFG), a $38B regional bank (Charlotte, NC), has signed an LOI to acquire Cornerstone Community Bank ($6.2B, Atlanta GA) for $920M in stock (1.48x P/B), targeted to close Q3 2025 pending OCC and Federal Reserve approval. IBM Promontory has been engaged for independent regulatory due diligence. 60-minute, 3-task senior-analyst simulation.",
      deliverable: "Used in regulatory due-diligence findings — cite specific figures and rank by severity.",
      prompt: "Vantage Financial Group (NYSE: VFG), a $38B regional bank (Charlotte, NC), has signed an LOI to acquire Cornerstone Community Bank ($6.2B, Atlanta GA) for $920M in stock (1.48x P/B), targeted to close Q3 2025 pending OCC and Federal Reserve approval. IBM Promontory has been engaged for independent regulatory due diligence. Identify the three highest-priority regulatory and credit risks in the Cornerstone data that could materially affect the deal, ranked by severity. For each risk, cite the specific data point and explain why it is a deal risk specifically: either because it threatens regulatory approval or because it impairs post-close value.",
      aiSuggestions: [
        "Explain OCC CAMELS methodology",
        "What does a CAMELS downgrade to 3 mean for an acquisition target?",
        "What is the 300% CRE concentration guideline?",
        "How do open BSA/AML MRAs affect merger approval?",
      ],
    },
    {
      id: "t2",
      responseType: "memo" as const,
      title: "Due Diligence Memo — Risk Section",
      imperative: "Draft the Risk Findings section of Promontory's due-diligence memo to Vantage's board: lead with a clear proceed, renegotiate, or walk-away recommendation in no more than 250 words.",
      dataPoints: [
        { label: "Deal Value", value: "$920M" },
        { label: "P/B", value: "1.48x" },
        { label: "Close", value: "Q3 2025" },
        { label: "CAMELS", value: "3", delta: -1 },
      ],
      context: "Vantage Financial Group (NYSE: VFG), a $38B regional bank (Charlotte, NC), has signed an LOI to acquire Cornerstone Community Bank ($6.2B, Atlanta GA) for $920M in stock (1.48x P/B), targeted to close Q3 2025 pending OCC and Federal Reserve approval. IBM Promontory has been engaged for independent regulatory due diligence. 60-minute, 3-task senior-analyst simulation. Think like a former OCC examiner — what would make a regulator hold up or deny approval of this deal?",
      deliverable: "Boardroom-ready, ≤250 words, lead with the recommendation.",
      prompt: "Draft the Risk Findings section of Promontory's due-diligence memo to Vantage's board. The memo should be boardroom-ready, no more than 250 words, prioritized, written for a non-technical audience, and lead with a clear recommendation: proceed, renegotiate, or walk away. Think like a former OCC examiner — what would make a regulator hold up or deny approval of this deal?",
      aiSuggestions: [
        "How should I structure a board-level risk memo?",
        "What would make the OCC or Fed delay approval?",
        "Help me frame a proceed/renegotiate/walk recommendation",
        "How do I write this for a non-technical board?",
      ],
    },
    {
      id: "t3",
      responseType: "memo" as const,
      title: "Deal Structure Recommendation",
      imperative: "Recommend two specific deal-structure adjustments that reduce Vantage's regulatory and financial exposure, then identify the single most important question to answer before finalizing.",
      dataPoints: [
        { label: "Price", value: "$920M" },
        { label: "NPL", value: "3.8%", delta: -1 },
        { label: "CRA", value: "Needs Improvement", delta: -1 },
        { label: "BSA MRAs", value: "3", delta: -1 },
      ],
      context: "Vantage Financial Group (NYSE: VFG), a $38B regional bank (Charlotte, NC), has signed an LOI to acquire Cornerstone Community Bank ($6.2B, Atlanta GA) for $920M in stock (1.48x P/B), targeted to close Q3 2025 pending OCC and Federal Reserve approval. IBM Promontory has been engaged for independent regulatory due diligence. 60-minute, 3-task senior-analyst simulation.",
      deliverable: "Two structural adjustments with mechanism + risk mitigated, plus your key outstanding question.",
      prompt: "Assuming Vantage proceeds, recommend two specific deal-structure adjustments that reduce Vantage's regulatory and financial exposure. For each adjustment, explain the mechanism and the risk it mitigates. Then identify the single most important question you would need answered before finalizing.",
      aiSuggestions: [
        "How do escrow / holdback mechanisms work in bank M&A?",
        "What regulatory approval conditions can be negotiated?",
        "How are BSA/AML remediation costs handled in deal terms?",
        "What is a material-adverse-change clause?",
      ],
    },
  ],
  "PE Associate": [
    {
      id: "t1",
      responseType: "thesis" as const,
      title: "Preliminary LBO Investment Thesis",
      imperative: "Develop a preliminary LBO investment thesis covering earnings quality, value creation levers, exit assumptions, and top 3 risks.",
      dataPoints: [
        { label: "Eq. Mkt Cap", value: "$37.3B" },
        { label: "EV", value: "$41.5B" },
        { label: "Net Income", value: "$892M" },
        { label: "ROE", value: "18.4%" },
      ],
      context: "Acme trades at $256.50/share with 145.3M diluted shares outstanding, implying an equity market cap of ~$37.3B. Net debt of $4,210M gives an enterprise value of ~$41.5B. FY2024 net revenue $4,759M, net income $892M (18.7% margin), ROE 18.4%, book value per share $180.41 (current P/B 1.42x).",
      deliverable: "Identify the top 3 risks and how you would mitigate them in a 5-year hold.",
      prompt: "Your fund is evaluating a leveraged buyout of Acme Financial. The company trades at $256.50/share with 145.3M diluted shares outstanding, implying an equity market cap of approximately $37.3B. The DCF model shows net debt of $4,210M, giving an enterprise value of approximately $41.5B. FY2024 net revenue was $4,759M and net income was $892M (18.7% margin). ROE is 18.4% and book value per share is $180.41 (current P/B of 1.42x). Develop a preliminary investment thesis covering: (1) quality of earnings and return sustainability, (2) value creation levers — organic growth (13.2% revenue CAGR implied), margin expansion (efficiency ratio improving from 74.2% to 71.9%), and potential add-on acquisitions, and (3) exit assumptions at a target 5-year hold. Identify the top 3 risks and how you would mitigate them.",
      aiSuggestions: [
        "What makes a strong LBO investment thesis for a financial firm?",
        "How do I assess earnings quality for an LBO target?",
        "Walk me through value creation levers in financial services",
        "What exit multiples are typical for financial services LBOs?",
      ],
    },
    {
      id: "t2",
      responseType: "flags" as const,
      title: "Deal Risk & Structuring Flags",
      imperative: "Critically assess whether this deal is financeable at current pricing and calculate the entry price required for a 20%+ IRR.",
      dataPoints: [
        { label: "Offer Range", value: "$307–$333", delta: -1 },
        { label: "Interest Exp.", value: "$1.8–2.0B", delta: -1 },
        { label: "Net Income", value: "$892M" },
        { label: "Target IRR", value: ">20%" },
      ],
      context: "DCF implies intrinsic value of $194.40. Current market price $256.50 (31.9% premium to intrinsic). A 20–30% control premium implies a potential offer price of $307–$333/share and total equity value of $44.6B–$48.4B. At 50% debt financing, annual interest expense would be $1.8B–$2.0B versus FY2024 net income of $892M.",
      deliverable: "Show your calculations and state your key assumptions for the required entry price.",
      prompt: "The provided DCF implies a per-share intrinsic value of $194.40 (WACC 9.8%, TGR 2.5%, 5-year revenue CAGR ~7.4%). The current market price of $256.50 represents a 31.9% premium to intrinsic value. A typical PE acquisition would require a further 20–30% control premium, implying a potential offer price of $307–$333/share and a total equity value of $44.6B–$48.4B. With $4,210M of existing net debt, the enterprise value would be $48.8B–$52.6B. Critically assess whether this deal is financeable at current pricing. At 50% debt financing ($24.4B–$26.3B at an assumed 7.5% interest rate), annual interest expense would be $1.8B–$2.0B versus FY2024 net income of $892M. What entry price and deal structure would be required to achieve a 20%+ IRR over a 5-year hold? Show your calculations and state your key assumptions.",
      aiSuggestions: [
        "How do I calculate IRR for an LBO?",
        "What debt-to-equity ratio is typical for financial services LBOs?",
        "Help me structure the deal financing analysis",
        "What entry price implies a 20% IRR at a 10x exit multiple?",
      ],
    },
    {
      id: "t3",
      responseType: "memo" as const,
      title: "First-Round Due Diligence Memo",
      imperative: "Generate a prioritized list of 10 due diligence questions for management, each with the specific question, why it matters, and green vs. red flag answers.",
      dataPoints: [
        { label: "Revenue", value: "$4,759M" },
        { label: "Cap Mkts", value: "44.3% of rev." },
        { label: "Net Debt", value: "$4,210M" },
        { label: "BV/Share", value: "$180.41" },
      ],
      context: "FY2024 net revenue $4,759M (+13.2% YoY), net income $892M (18.7% margin), EPS $6.14, ROE 18.4%, efficiency ratio 71.9%, total assets $287.4B, net debt $4,210M, book value per share $180.41. Capital Markets is the largest segment ($2,107M, 44.3% of revenue) and grew the fastest (+18.6% YoY), but is also the most market-sensitive.",
      deliverable: "Focus on earnings quality, revenue sustainability, management incentives, and hidden liabilities.",
      prompt: "You are preparing for a first-round management meeting for a potential acquisition of Acme Financial. Key financial metrics: FY2024 net revenue $4,759M (+13.2% YoY), net income $892M (18.7% margin), EPS $6.14, ROE 18.4%, efficiency ratio 71.9%, total assets $287.4B, net debt $4,210M, book value per share $180.41. Capital Markets is the largest segment ($2,107M, 44.3% of revenue) and grew the fastest (+18.6% YoY), but is also the most market-sensitive. Investment Banking ($1,842M) grew 12.3%. Generate a prioritized list of 10 due diligence questions for management. For each question, state: (a) the specific question with reference to a relevant figure, (b) why it matters to the investment thesis or valuation, and (c) what answer would be a green flag vs. a red flag. Focus on earnings quality, revenue sustainability, management incentives, and hidden liabilities.",
      aiSuggestions: [
        "What are the most important DD questions for a financial services acquisition?",
        "How do I assess revenue sustainability in capital markets?",
        "What management incentive structures are red flags in PE deals?",
        "Help me frame the hidden liabilities section",
      ],
    },
  ],
  "Hedge Fund Research Analyst": [
    {
      id: "t1",
      responseType: "thesis" as const,
      title: "Long/Short Investment Thesis",
      imperative: "Develop a long or short thesis with 3 specific catalysts, a 12-month price target, and the single biggest risk.",
      dataPoints: [
        { label: "Price", value: "$256.50" },
        { label: "DCF", value: "$194.40", delta: -1 },
        { label: "P/E", value: "41.8x" },
        { label: "ROE", value: "18.4%" },
      ],
      context: "Acme trades at $256.50/share. P/B 1.42x (book value $180.41/share), P/E 41.8x trailing (EPS $6.14), ROE 18.4%. DCF implies $194.40 (24.2% downside). FY2024 net revenue grew 13.2% to $4,759M, net income grew 20.1% to $892M. Q4 2024: revenue +16.8% YoY, EPS $1.74 (+22.5% YoY), ROE 19.2% annualized.",
      deliverable: "Be direct and take a view — state your position, catalysts with timing, price target, and biggest risk.",
      prompt: "Acme Financial trades at $256.50/share. Key valuation metrics: P/B 1.42x (book value $180.41/share), P/E 41.8x trailing (EPS $6.14), ROE 18.4%. The DCF model implies intrinsic value of $194.40 (WACC 9.8%, TGR 2.5%), suggesting 24.2% downside to the current price. FY2024 net revenue grew 13.2% to $4,759M, net income grew 20.1% to $892M, and the efficiency ratio improved 230bps to 71.9%. Q4 2024 showed further acceleration: revenue +16.8% YoY, EPS $1.74 (+22.5% YoY), ROE 19.2% annualized. Develop a long or short thesis. State your position clearly, support it with 3 specific catalysts (with expected timing and magnitude), quantify your 12-month price target and implied return from $256.50, and identify the single biggest risk to your thesis. Be direct and take a view.",
      aiSuggestions: [
        "How do I structure a long/short investment thesis?",
        "What catalysts are most relevant for financial services stocks?",
        "Help me quantify the 12-month price target",
        "What is the biggest risk to a long thesis at 41.8x P/E?",
      ],
    },
    {
      id: "t2",
      responseType: "extraction" as const,
      title: "Earnings Quality Data Extraction",
      imperative: "Assess the quality and sustainability of FY2024 earnings, identify structural vs. cyclical components, and quantify 'normalized' EPS.",
      dataPoints: [
        { label: "Net Income", value: "$892M" },
        { label: "EPS", value: "$6.14", delta: 1 },
        { label: "Cap Mkts Rev.", value: "$2,107M" },
        { label: "Tier 1 Ratio", value: "14.8%" },
      ],
      context: "FY2024 net income $892M, EPS $6.14 (+20.9% YoY). Capital Markets revenue $2,107M (+18.6% YoY) is highly sensitive to market volatility. Efficiency ratio improvement from 74.2% to 71.9% contributed ~$0.55 to EPS. Tier 1 Capital Ratio 14.8% (880bps above regulatory minimum). Total assets grew 9.8% to $287.4B while equity grew 12.0% to $26.2B.",
      deliverable: "Flag any balance sheet items that warrant further investigation.",
      prompt: "Acme Financial reported FY2024 net income of $892M and EPS of $6.14 (+20.9% YoY). However, consider the following: (1) Capital Markets revenue of $2,107M (+18.6% YoY) is highly sensitive to market volatility and rates — Q4 fixed income trading alone was $489M (+24% YoY); (2) the efficiency ratio improvement from 74.2% to 71.9% reduced operating expenses by $107M relative to the prior-year ratio, contributing approximately $0.55 to EPS; (3) the Tier 1 Capital Ratio of 14.8% is 880bps above the 6.0% regulatory minimum, suggesting potential for capital return but also raising questions about capital deployment; (4) total assets grew 9.8% to $287.4B while equity grew 12.0% to $26.2B. Assess the quality and sustainability of FY2024 earnings. Identify which components are structural vs. cyclical, quantify the 'normalized' EPS stripping out market-driven tailwinds, and flag any balance sheet items that warrant further investigation.",
      aiSuggestions: [
        "How do I separate structural from cyclical earnings?",
        "What is a reasonable normalized EPS adjustment for capital markets revenue?",
        "Help me analyze the balance sheet for hidden risks",
        "What does excess capital ratio imply for future earnings?",
      ],
    },
    {
      id: "t3",
      responseType: "flags" as const,
      title: "Anomaly Flagging & Price Target",
      imperative: "Calculate a 12-month price target via DCF and P/B multiple, weight the two methods, and arrive at a blended target with implied return.",
      dataPoints: [
        { label: "DCF Base", value: "$194.40", delta: -1 },
        { label: "DCF (adj.)", value: "$242", delta: -1 },
        { label: "Current", value: "$256.50" },
        { label: "ROE", value: "18.4%" },
      ],
      context: "Acme trades at $256.50/share. DCF base case implies $194.40 (24.2% downside). At WACC 9.3% and TGR 3.0%, DCF implies $242/share. Key metrics: FY2024 EPS $6.14, book value per share $180.41, ROE 18.4%, net revenue $4,759M, net income $892M.",
      deliverable: "Weight the two methods, arrive at a blended price target, and calculate the implied upside/downside and annualised total return from $256.50.",
      prompt: "Acme Financial trades at $256.50/share. The DCF base case implies $194.40 (24.2% downside) using WACC 9.8% and TGR 2.5%. Key metrics: FY2024 EPS $6.14, book value per share $180.41, ROE 18.4%, net revenue $4,759M, net income $892M. The sensitivity table shows that at WACC 9.3% and TGR 3.0%, the DCF implies $242/share — much closer to the current price. Using your own assumptions, calculate a 12-month price target via two methods: (1) a DCF with your adjusted WACC and growth rate, showing the key inputs and the resulting per-share value, and (2) a P/B multiple approach using ROE sustainability (if ROE of 18.4% is sustainable, what P/B multiple is justified using the Gordon Growth Model: P/B = (ROE − g) / (r − g)?). Weight the two methods, arrive at a blended price target, and calculate the implied upside/downside and annualised total return from $256.50.",
      aiSuggestions: [
        "Walk me through the Gordon Growth Model for P/B valuation",
        "How do I weight DCF vs. P/B in a blended price target?",
        "What WACC adjustment is justified given Q4 momentum?",
        "Help me calculate annualised total return from a price target",
      ],
    },
  ],
};

type SourceMaterialKey = keyof typeof SOURCE_MATERIALS;

const DEFAULT_SOURCE_MATERIAL_KEYS: SourceMaterialKey[] = ["10K", "Earnings", "Model"];
const ROLE_SOURCE_MATERIAL_KEYS: Partial<Record<keyof typeof TASK_PROMPTS, SourceMaterialKey[]>> = {
  "Management Consultant": ["OCC_EXAM", "FINANCIALS", "COMPLIANCE", "LOAN_TAPE"],
};

function getSourceMaterialKeysForRole(roleTemplate: keyof typeof TASK_PROMPTS): SourceMaterialKey[] {
  return ROLE_SOURCE_MATERIAL_KEYS[roleTemplate] ?? DEFAULT_SOURCE_MATERIAL_KEYS;
}

// ─── Timer ────────────────────────────────────────────────────────────────────
// Drives the remaining-time display from an absolute server-issued deadline so
// the countdown survives reloads and tab closes. `deadlineMs` is null until the
// `assessments.start` mutation has populated `startedAt` on the server; in that
// window we fall back to displaying the full duration without ticking.
function Timer({
  totalSeconds,
  deadlineMs,
  onExpire,
}: {
  totalSeconds: number;
  deadlineMs: number | null;
  onExpire: () => void;
}) {
  // `tick` is a heartbeat counter — it intentionally has no value other than
  // forcing a re-render once a second. The actual remaining-seconds value is
  // derived from the wall clock on every render so we stay accurate even if
  // the tab was throttled.
  const [, setTick] = useState(0);
  const expiredRef = useRef(false);

  useEffect(() => {
    if (deadlineMs == null) return;
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [deadlineMs]);

  const remaining = deadlineMs == null
    ? totalSeconds
    : Math.max(0, Math.ceil((deadlineMs - eventTimestamp()) / 1000));

  useEffect(() => {
    if (deadlineMs != null && remaining <= 0 && !expiredRef.current) {
      expiredRef.current = true;
      onExpire();
    }
  }, [remaining, deadlineMs, onExpire]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const pct = (remaining / totalSeconds) * 100;

  // Color shifts: first 80% → secondary, 80–95% → warning, last 5% → negative
  const timerColor =
    pct > 20
      ? "var(--text-secondary)"
      : pct > 5
      ? "var(--data-warning)"
      : "var(--data-negative)";

  const borderColor =
    pct > 20
      ? "var(--border-subtle)"
      : pct > 5
      ? "var(--data-warning)"
      : "var(--data-negative)";

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors duration-500"
      style={{ borderColor, background: "var(--surface-1)" }}
    >
      <Clock className="w-3.5 h-3.5 transition-colors duration-500" style={{ color: timerColor }} />
      <span
        className="font-bold text-sm tabular-nums transition-colors duration-500"
        style={{ fontFamily: "var(--font-mono)", color: timerColor }}
      >
        {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
      </span>
    </div>
  );
}

// ─── Behavior Strip ───────────────────────────────────────────────────────────
interface BehaviorEvent {
  type: "type" | "paste" | "ai";
  timestamp: number;
}

function BehaviorStrip({ events, typedPct, pastedPct, typingSignal }: {
  events: BehaviorEvent[];
  typedPct: number;
  pastedPct: number;
  typingSignal: number;
}) { 
  const windowMs = 120_000; // 2 min window
  const IDLE_TIMEOUT = 2000; // ms after last composition update before fading to idle
  const BAR_COUNT = 8;
  const IDLE_BAR_HEIGHTS = Array(BAR_COUNT).fill(2) as number[];

  // Animated phase for the waveform heartbeat
  const phaseRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const [waveform, setWaveform] = useState<{
    barHeights: number[];
    isActive: boolean;
    nowMs: number;
  }>(() => ({
    barHeights: IDLE_BAR_HEIGHTS,
    isActive: false,
    nowMs: 0,
  }));

  useEffect(() => {
    if (typingSignal === 0) return;

    const SPEED = 3.5;         // radians per second
    const activityStartedAt = eventTimestamp();
    let lastTime: number | null = null;

    const tick = (ts: number) => {
      if (lastTime !== null) {
        const dt = (ts - lastTime) / 1000; // seconds
        phaseRef.current += dt * SPEED;
      }
      lastTime = ts;

      const nowMs = eventTimestamp();
      const msSinceTyped = nowMs - activityStartedAt;
      const isActive = msSinceTyped < IDLE_TIMEOUT;

      // Fade-in/out multiplier: 0 → 1 over 200ms, 1 → 0 over 400ms
      const fadeIn = Math.min(1, msSinceTyped < 200 ? msSinceTyped / 200 : 1);
      const fadeOut = msSinceTyped > IDLE_TIMEOUT - 400
        ? Math.max(0, 1 - (msSinceTyped - (IDLE_TIMEOUT - 400)) / 400)
        : 1;
      const envelope = isActive ? fadeIn * fadeOut : 0;

      // Amplitude scales with how much the candidate has typed (typedPct)
      const amplitude = 3 + (typedPct / 100) * 6; // 3–9 px
      const midH = 4 + (typedPct / 100) * 4;       // 4–8 px baseline

      const heights = Array.from({ length: BAR_COUNT }, (_, i) => {
        const wave = Math.sin(phaseRef.current + i * (Math.PI / (BAR_COUNT - 1)) * 2);
        const animated = midH + wave * amplitude * envelope;
        return Math.max(2, Math.min(14, animated));
      });

      setWaveform({ barHeights: heights, isActive, nowMs });

      if (isActive || msSinceTyped < IDLE_TIMEOUT + 450) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [typingSignal, typedPct]);

  const { barHeights, isActive, nowMs } = waveform;
  const isRecent = (event: BehaviorEvent) => nowMs === 0 || nowMs - event.timestamp < windowMs;

  return (
    <div
      className="flex items-center gap-3 px-3 py-1.5 rounded-lg border"
      style={{ background: "var(--surface-1)", borderColor: "var(--border-subtle)" }}
    >
      {/* Typing pulse */}
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 cursor-default">
            <Activity className="w-3 h-3" style={{ color: isActive ? "var(--accent-gold)" : "var(--text-quaternary)" }} />
            <div className="flex gap-0.5 items-end h-4">
              {barHeights.map((barH, i) => (
                <div
                  key={i}
                  className="w-0.5 rounded-full"
                  style={{
                    height: `${barH}px`,
                    background: isActive ? "var(--accent-gold)" : "var(--border-emphasis)",
                    opacity: isActive ? 0.75 : 0.3,
                    transition: isActive ? "none" : "height 0.4s ease, opacity 0.4s ease",
                  }}
                />
              ))}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-[200px]">
          <span style={{ color: "var(--text-secondary)" }}>Typing pace</span> — live signal of active composition. {typedPct}% of response typed.
        </TooltipContent>
      </Tooltip>

      {/* Divider */}
      <div className="w-px h-3" style={{ background: "var(--border-subtle)" }} />

      {/* Paste markers */}
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 cursor-default">
            <Clipboard className="w-3 h-3" style={{ color: "var(--text-quaternary)" }} />
            <div className="flex gap-0.5">
              {events.filter(e => e.type === "paste" && isRecent(e)).slice(-5).map((e, i) => (
                <div
                  key={i}
                  className="w-1 h-1 rounded-full"
                  style={{ background: "var(--data-neutral)" }}
                />
              ))}
              {events.filter(e => e.type === "paste" && isRecent(e)).length === 0 && (
                <div className="w-1 h-1 rounded-full" style={{ background: "var(--border-emphasis)" }} />
              )}
            </div>
            <span className="text-[9px] tabular-nums" style={{ color: "var(--text-quaternary)", fontFamily: "var(--font-mono)" }}>
              {pastedPct}%
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-[200px]">
          <span style={{ color: "var(--text-secondary)" }}>Paste events</span> — each dot is a paste in the last 2 minutes. {pastedPct}% of response pasted. Logged for fairness transparency.
        </TooltipContent>
      </Tooltip>

      {/* Divider */}
      <div className="w-px h-3" style={{ background: "var(--border-subtle)" }} />

      {/* AI interaction dots */}
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 cursor-default">
            <Zap className="w-3 h-3" style={{ color: "var(--text-quaternary)" }} />
            <div className="flex gap-0.5">
              {events.filter(e => e.type === "ai" && isRecent(e)).slice(-5).map((e, i) => (
                <div
                  key={i}
                  className="w-1 h-1 rounded-full"
                  style={{ background: "var(--accent-gold)" }}
                />
              ))}
              {events.filter(e => e.type === "ai" && isRecent(e)).length === 0 && (
                <div className="w-1 h-1 rounded-full" style={{ background: "var(--border-emphasis)" }} />
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-[200px]">
          <span style={{ color: "var(--accent-gold)" }}>AI interactions</span> — each green dot is a Pine AI query in the last 2 minutes. Logged for transparency.
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

// ─── Composer value serializers ───────────────────────────────────────────────
type ResponseType = "memo" | "variance" | "thesis" | "extraction" | "reconciliation" | "flags";

function serializeComposerValue(type: ResponseType, value: ComposerValue | undefined): string {
  if (!value) return "";
  switch (type) {
    case "memo": {
      const v = value as MemoValue;
      const parts: string[] = [];
      if (v.keyFindings?.trim()) parts.push(`**Key Findings**\n${v.keyFindings.trim()}`);
      if (v.numericalAnalysis?.trim()) parts.push(`**Numerical Analysis**\n${v.numericalAnalysis.trim()}`);
      if (v.conclusion?.trim()) parts.push(`**Conclusion**\n${v.conclusion.trim()}`);
      return parts.join("\n\n");
    }
    case "variance": {
      const v = value as VarianceValue;
      const parts: string[] = [];
      if (v.driver?.trim()) parts.push(`**Driver Identification**\n${v.driver.trim()}`);
      if (v.quantification?.trim()) parts.push(`**Quantification**\n${v.quantification.trim()}`);
      if (v.recommendation?.trim()) parts.push(`**Recommendation**\n${v.recommendation.trim()}`);
      return parts.join("\n\n");
    }
    case "thesis": {
      const v = value as ThesisValue;
      const parts: string[] = [];
      if (v.thesis?.trim()) parts.push(`**Thesis Statement**\n${v.thesis.trim()}`);
      if (v.evidence?.trim()) parts.push(`**Supporting Evidence**\n${v.evidence.trim()}`);
      if (v.counterargument?.trim()) parts.push(`**Counterargument**\n${v.counterargument.trim()}`);
      if (v.recommendation?.trim()) parts.push(`**Recommendation**\n${v.recommendation.trim()}`);
      return parts.join("\n\n");
    }
    case "extraction": {
      const v = value as ExtractionValue;
      if (!v.rows?.length) return "";
      const header = "| Metric | Value | Source |\n|---|---|---|";
      const rows = v.rows
        .filter(r => r.metric.trim() || r.value.trim())
        .map(r => `| ${r.metric} | ${r.value} | ${r.source} |`);
      return rows.length ? `**Data Extraction**\n${header}\n${rows.join("\n")}` : "";
    }
    case "reconciliation": {
      const v = value as ReconciliationValue;
      const parts: string[] = [];
      const filled = v.entries?.filter(e => e.corrected.trim() || e.reason.trim()) ?? [];
      if (filled.length) {
        const header = "| Account | Stated | Corrected | Reason |\n|---|---|---|---|";
        const rows = filled.map(e => `| ${e.account} | ${e.stated} | ${e.corrected} | ${e.reason} |`);
        parts.push(`**Reconciliation Table**\n${header}\n${rows.join("\n")}`);
      }
      if (v.summary?.trim()) parts.push(`**Summary**\n${v.summary.trim()}`);
      return parts.join("\n\n");
    }
    case "flags": {
      const v = value as FlagsValue;
      if (!v.flags?.length) return "";
      return v.flags
        .filter(f => f.issue.trim())
        .map((f, i) => {
          const lines = [`**Flag ${i + 1}${f.severity ? ` (${f.severity})` : ""}**`];
          if (f.location.trim()) lines.push(`Location: ${f.location.trim()}`);
          lines.push(`Issue: ${f.issue.trim()}`);
          if (f.recommendation.trim()) lines.push(`Recommendation: ${f.recommendation.trim()}`);
          return lines.join("\n");
        })
        .join("\n\n");
    }
    default:
      return typeof value === "string" ? value : JSON.stringify(value);
  }
}

function getComposerSections(type: ResponseType): string[] {
  switch (type) {
    case "memo": return ["Key Findings", "Numerical Analysis", "Conclusion"];
    case "variance": return ["Driver Identification", "Quantification", "Recommendation"];
    case "thesis": return ["Thesis Statement", "Supporting Evidence", "Counterargument", "Recommendation"];
    case "extraction": return ["Data Rows"];
    case "reconciliation": return ["Reconciliation Table", "Summary"];
    case "flags": return ["Flag Entries"];
    default: return ["Response"];
  }
}

function countFilledSections(type: ResponseType, value: ComposerValue | undefined): number {
  if (!value) return 0;
  switch (type) {
    case "memo": {
      const v = value as MemoValue;
      return (v.keyFindings?.trim() ? 1 : 0) + (v.numericalAnalysis?.trim() ? 1 : 0) + (v.conclusion?.trim() ? 1 : 0);
    }
    case "variance": {
      const v = value as VarianceValue;
      return (v.driver?.trim() ? 1 : 0) + (v.quantification?.trim() ? 1 : 0) + (v.recommendation?.trim() ? 1 : 0);
    }
    case "thesis": {
      const v = value as ThesisValue;
      return (v.thesis?.trim() ? 1 : 0) + (v.evidence?.trim() ? 1 : 0) + (v.counterargument?.trim() ? 1 : 0) + (v.recommendation?.trim() ? 1 : 0);
    }
    case "extraction": {
      const v = value as ExtractionValue;
      const filled = v.rows?.filter(r => r.metric.trim() || r.value.trim()).length ?? 0;
      return filled > 0 ? 1 : 0;
    }
    case "reconciliation": {
      const v = value as ReconciliationValue;
      const tableFilled = v.entries?.some(e => e.corrected.trim() || e.reason.trim()) ? 1 : 0;
      const summaryFilled = v.summary?.trim() ? 1 : 0;
      return tableFilled + summaryFilled;
    }
    case "flags": {
      const v = value as FlagsValue;
      return v.flags?.some(f => f.issue.trim()) ? 1 : 0;
    }
    default: return 0;
  }
}

function isComposerComplete(type: ResponseType, value: ComposerValue | undefined): boolean {
  if (!value) return false;
  const total = getComposerSections(type).length;
  return countFilledSections(type, value) >= total;
}

// ─── Composer Switch ──────────────────────────────────────────────────────────
function ComposerSwitch({
  responseType,
  value,
  onChange,
  onPaste,
}: {
  responseType: ResponseType;
  value: ComposerValue | undefined;
  onChange: (v: ComposerValue) => void;
  onPaste?: (e: React.ClipboardEvent) => void;
}) {
  switch (responseType) {
    case "memo":
      return <MemoComposer value={value as MemoValue | undefined} onChange={onChange as (v: MemoValue) => void} onPaste={onPaste} />;
    case "variance":
      return <VarianceComposer value={value as VarianceValue | undefined} onChange={onChange as (v: VarianceValue) => void} onPaste={onPaste} />;
    case "thesis":
      return <ThesisComposer value={value as ThesisValue | undefined} onChange={onChange as (v: ThesisValue) => void} onPaste={onPaste} />;
    case "extraction":
      return <ExtractionComposer value={value as ExtractionValue | undefined} onChange={onChange as (v: ExtractionValue) => void} onPaste={onPaste} />;
    case "reconciliation":
      return <ReconciliationComposer value={value as ReconciliationValue | undefined} onChange={onChange as (v: ReconciliationValue) => void} onPaste={onPaste} />;
    case "flags":
      return <FlagsComposer value={value as FlagsValue | undefined} onChange={onChange as (v: FlagsValue) => void} onPaste={onPaste} />;
    default:
      return <MemoComposer value={value as MemoValue | undefined} onChange={onChange as (v: MemoValue) => void} onPaste={onPaste} />;
  }
}

// ─── Enhanced AI Chat Panel ───────────────────────────────────────────────────
type ResponseCategory = "Explanation" | "Calculation" | "Citation" | "Suggestion";

function categorizeMessage(content: string): ResponseCategory {
  const lower = content.toLowerCase();
  if (lower.includes("$") || lower.includes("%") || lower.match(/\d+\.\d+/) || lower.includes("calculate") || lower.includes("formula")) return "Calculation";
  if (lower.includes("according to") || lower.includes("per the") || lower.includes("as stated") || lower.includes("from the")) return "Citation";
  if (lower.includes("consider") || lower.includes("recommend") || lower.includes("suggest") || lower.includes("should")) return "Suggestion";
  return "Explanation";
}

const CATEGORY_COLORS: Record<ResponseCategory, string> = {
  Explanation: "var(--data-neutral)",
  Calculation: "var(--data-positive)",
  Citation: "var(--accent-gold)",
  Suggestion: "var(--data-warning)",
};

function AIChatPanel({
  assessmentId,
  currentTaskId,
  currentTask,
  roleTemplate,
  activeMaterialLabel,
  onInteraction,
  onCiteInResponse,
  onAssistantCopy,
  sourceMaterialLabels,
  onPushBehaviorEvent,
  taskStartTimeRef,
}: {
  assessmentId: number;
  currentTaskId: string;
  currentTask: { title: string; prompt?: string; aiSuggestions?: string[] };
  roleTemplate: string;
  activeMaterialLabel?: string;
  onInteraction: (msg: { role: string; content: string; taskKey: string; timestamp: number }) => void;
  onCiteInResponse: (text: string, source: "ai" | "source_material") => void;
  onAssistantCopy: () => void;
  sourceMaterialLabels: string[];
  onPushBehaviorEvent: (event: { eventType: string; taskId?: string; eventData?: unknown; clientTimestamp: number }) => void;
  taskStartTimeRef: React.MutableRefObject<Record<string, number>>;
}) {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pendingTaskKeyRef = useRef<string>("");

  const chat = trpc.chat.send.useMutation({
    onSuccess: (data: { content: string }) => {
      const assistantMsg = { role: "assistant", content: data.content };
      setMessages(prev => [...prev, assistantMsg]);
      onInteraction({ ...assistantMsg, taskKey: pendingTaskKeyRef.current, timestamp: eventTimestamp() });
      setLoading(false);
    },
    onError: () => {
      setLoading(false);
      toast.error("AI response failed. Please try again.");
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = (content?: string) => {
    const text = (content ?? input).trim();
    if (!text || loading) return;
    pendingTaskKeyRef.current = currentTaskId;
    const userMsg = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    onInteraction({ ...userMsg, taskKey: currentTaskId, timestamp: eventTimestamp() });
    // Telemetry: ai_prompt_sent
    const taskStart = taskStartTimeRef.current[currentTaskId] ?? eventTimestamp();
    onPushBehaviorEvent({
      eventType: "ai_prompt_sent",
      taskId: currentTaskId,
      eventData: {
        taskId: currentTaskId,
        promptLength: text.length,
        secondsSinceTaskStart: Math.round((eventTimestamp() - taskStart) / 1000),
      },
      clientTimestamp: eventTimestamp(),
    });
    setInput("");
    setLoading(true);
    chat.mutate({
      assessmentId,
      messages: [...messages, userMsg],
      roleTemplate,
      taskContext: {
        title: currentTask.title,
        prompt: currentTask.prompt,
      },
      activeMaterialLabel,
    });
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--surface-base)" }}>
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-2 flex-shrink-0 border-b"
        style={{ borderColor: "var(--border-subtle)", background: "var(--surface-1)" }}
      >
        <div
          className="w-6 h-6 rounded flex items-center justify-center"
          style={{ background: "rgba(22,138,74,0.15)" }}
        >
          <Zap className="w-3.5 h-3.5" style={{ color: "var(--accent-gold)" }} />
        </div>
        <span className="font-bold text-xs uppercase tracking-widest" style={{ color: "var(--text-primary)" }}>Pine AI</span>
        <span className="text-[10px] ml-auto" style={{ color: "var(--text-quaternary)" }}>Interactions logged</span>
      </div>

      {/* Messages / Empty State */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="p-4 space-y-4">
            {/* Task-Aware Suggestions */}
            <div
              className="rounded-xl p-4 border"
              style={{ background: "var(--surface-1)", borderColor: "var(--border-subtle)" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--accent-gold)" }} />
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>
                  Suggested for {currentTask.title}
                </span>
              </div>
              <div className="space-y-2">
                {(currentTask.aiSuggestions ?? []).map((s, i) => (
                  <button
                    key={i}
                    onClick={() => send(s)}
                    className="w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors duration-150"
                    style={{
                      background: "var(--surface-2)",
                      borderColor: "var(--border-emphasis)",
                      color: "var(--text-secondary)",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent-gold)";
                      (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-emphasis)";
                      (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Source Reference Chips */}
            {sourceMaterialLabels.length > 0 && (
              <div
                className="rounded-xl p-4 border"
                style={{ background: "var(--surface-1)", borderColor: "var(--border-subtle)" }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-3.5 h-3.5" style={{ color: "var(--text-tertiary)" }} />
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>
                    Source References
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sourceMaterialLabels.map((label, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(prev => prev + `@${label} `)}
                      className="px-2.5 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider transition-colors duration-150"
                      style={{
                        background: "var(--surface-2)",
                        borderColor: "var(--border-emphasis)",
                        color: "var(--text-tertiary)",
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent-gold)";
                        (e.currentTarget as HTMLButtonElement).style.color = "var(--accent-gold)";
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-emphasis)";
                        (e.currentTarget as HTMLButtonElement).style.color = "var(--text-tertiary)";
                      }}
                    >
                      @{label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {messages.map((msg, i) => {
              const category = msg.role === "assistant" ? categorizeMessage(msg.content) : null;
              return (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className="max-w-[90%] rounded-xl text-sm relative group"
                    onCopy={msg.role === "assistant" ? onAssistantCopy : undefined}
                    style={{
                      background: msg.role === "user"
                        ? "rgba(22,138,74,0.1)"
                        : "var(--surface-1)",
                      border: `1px solid ${msg.role === "user" ? "rgba(22,138,74,0.2)" : "var(--border-subtle)"}`,
                      color: "var(--text-primary)",
                    }}
                  >
                    {/* Category badge for assistant messages */}
                    {category && (
                      <div
                        className="absolute -top-2 left-3 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest"
                        style={{
                          background: "var(--surface-base)",
                          color: CATEGORY_COLORS[category],
                          border: `1px solid ${CATEGORY_COLORS[category]}40`,
                        }}
                      >
                        {category}
                      </div>
                    )}
                    <div className={`px-4 py-3 ${category ? "pt-4" : ""}`}>
                      {msg.role === "assistant" ? (
                        <Streamdown>{msg.content}</Streamdown>
                      ) : (
                        <p>{msg.content}</p>
                      )}
                    </div>
                    {/* Cite button for assistant messages */}
                    {msg.role === "assistant" && (
                      <div
                        className="px-4 pb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                      >
                        <button
                          onClick={() => onCiteInResponse(msg.content, "ai")}
                          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors duration-150"
                          style={{ color: "var(--text-quaternary)" }}
                          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = "var(--accent-gold)"}
                          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = "var(--text-quaternary)"}
                        >
                          <Quote className="w-3 h-3" />
                          Cite in response
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {loading && (
              <div className="flex justify-start">
                <div
                  className="rounded-xl px-4 py-3 border"
                  style={{ background: "var(--surface-1)", borderColor: "var(--border-subtle)" }}
                >
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--accent-gold)" }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div
        className="p-3 border-t flex-shrink-0"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask Pine AI anything about the materials..."
            className="resize-none text-sm min-h-[60px]"
            style={{
              background: "var(--surface-1)",
              border: `1px solid var(--border-subtle)`,
              color: "var(--text-primary)",
            }}
            rows={2}
          />
          <Button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="self-end px-3 py-3"
            style={{ background: "var(--accent-gold)", color: "#fff" }}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Source Material Content ─────────────────────────────────────────────────
function SourceMaterialContent({
  content,
  onSendToAI,
  onCiteInResponse,
}: {
  content: string;
  onSendToAI: (text: string) => void;
  onCiteInResponse: (text: string, source: "ai" | "source_material") => void;
}) {
  const [selection, setSelection] = useState<{ text: string; x: number; y: number } | null>(null);

  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      setSelection(null);
      return;
    }
    const text = sel.toString().trim();
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setSelection({ text, x: rect.left + rect.width / 2, y: rect.top - 8 });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Content */}
      <div
        className="flex-1 overflow-y-auto px-6 py-5 relative"
        onMouseUp={handleMouseUp}
        style={{ background: "var(--surface-base)" }}
      >
        <div
          className="mx-auto"
          style={{ maxWidth: "640px" }}
        >
          <div
            className="prose prose-invert prose-sm max-w-none"
            style={{
              fontSize: "13px",
              lineHeight: "1.7",
              color: "var(--text-secondary)",
              // Heading styles
              "--tw-prose-headings": "var(--text-primary)",
              "--tw-prose-body": "var(--text-secondary)",
              "--tw-prose-bold": "var(--text-primary)",
              "--tw-prose-code": "var(--accent-gold)",
            } as React.CSSProperties}
          >
            <style>{`
              .source-material-prose h1 { font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5em; }
              .source-material-prose h2 { font-size: 0.875rem; font-weight: 700; color: var(--text-primary); margin-top: 2.5em; margin-bottom: 0.5em; padding-top: 1.25em; border-top: 1px solid var(--border-subtle); }
              .source-material-prose h3 { font-size: 0.8125rem; font-weight: 600; color: var(--text-primary); margin-top: 1.5em; margin-bottom: 0.25em; }
              .source-material-prose p { margin-bottom: 1.25em; }
              .source-material-prose strong { color: var(--text-primary); font-weight: 600; }
              .source-material-prose em { color: var(--text-secondary); }
              .source-material-prose code { color: var(--accent-gold); font-family: var(--font-mono); font-size: 0.85em; }
              .source-material-prose blockquote {
                border-left: 3px solid var(--accent-gold);
                padding-left: 1em;
                color: var(--text-secondary);
                font-style: italic;
                margin: 1.5em 0;
              }
              .source-material-prose table { width: 100%; border-collapse: collapse; font-size: 12px; }
              .source-material-prose thead tr { background: var(--surface-2); }
              .source-material-prose thead th {
                color: var(--text-secondary);
                font-weight: 500;
                letter-spacing: 0.08em;
                text-transform: uppercase;
                font-size: 10px;
                padding: 6px 10px;
                text-align: left;
                border-bottom: 1px solid var(--border-emphasis);
              }
              .source-material-prose tbody tr:nth-child(even) { background: var(--surface-2); }
              .source-material-prose tbody tr:nth-child(odd) { background: var(--surface-1); }
              .source-material-prose tbody td {
                padding: 5px 10px;
                color: var(--text-secondary);
                border-bottom: 1px solid var(--border-subtle);
                font-variant-numeric: tabular-nums;
                font-family: var(--font-mono);
                font-size: 12px;
              }
              .source-material-prose tbody td:first-child {
                font-family: var(--font-ui);
                color: var(--text-primary);
              }
              .source-material-prose tbody td:not(:first-child) { text-align: right; }
              .source-material-prose thead th:not(:first-child) { text-align: right; }
              /* YoY auto-color */
              .source-material-prose td[data-positive] { color: var(--data-positive) !important; }
              .source-material-prose td[data-negative] { color: var(--data-negative) !important; }
              .source-material-prose li { margin-bottom: 0.4em; }
              .source-material-prose ul { padding-left: 1.25em; }
              .source-material-prose hr { border-color: var(--border-subtle); margin: 2em 0; }
            `}</style>
            <div className="source-material-prose">
              <Streamdown>{content}</Streamdown>
            </div>
          </div>
        </div>

        {/* Text selection popover */}
        {selection && (
          <div
            className="fixed z-50 flex gap-1 rounded-lg border shadow-xl p-1"
            style={{
              left: `${selection.x}px`,
              top: `${selection.y}px`,
              transform: "translate(-50%, -100%)",
              background: "var(--surface-2)",
              borderColor: "var(--border-emphasis)",
            }}
          >
            <button
              onMouseDown={e => { e.preventDefault(); onSendToAI(selection.text); setSelection(null); window.getSelection()?.removeAllRanges(); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-bold uppercase tracking-widest transition-colors duration-150"
              style={{ color: "var(--accent-gold)" }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(22,138,74,0.1)"}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "transparent"}
            >
              <Zap className="w-3 h-3" />
              Send to Pine AI
            </button>
            <div className="w-px" style={{ background: "var(--border-subtle)" }} />
            <button
              onMouseDown={e => { e.preventDefault(); onCiteInResponse(selection.text, "source_material"); setSelection(null); window.getSelection()?.removeAllRanges(); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-bold uppercase tracking-widest transition-colors duration-150"
              style={{ color: "var(--text-secondary)" }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-1)"}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "transparent"}
            >
              <Quote className="w-3 h-3" />
              Cite in response
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Assessment Interface ────────────────────────────────────────────────
export default function AssessmentInterface() {
  const { id } = useParams<{ id: string }>();
  const assessmentId = parseInt(id ?? "0");
  const [, navigate] = useLocation();

  const [activeTabSelection, setActiveTab] = useState<string | null>(null);
  const [currentTask, setCurrentTask] = useState(0);
  const {
    responses,
    setResponses,
    composerValues: composerValuesRaw,
    setComposerValues: setComposerValuesRaw,
    clearDraft,
    lastSaved,
    hadRestoredDraft,
  } = useLocalStorageDraft(String(assessmentId));
  // The persisted draft stores composer state as `Record<string, unknown>` to
  // avoid pinning the hook to one consumer's union; cast at the boundary.
  const composerValues = composerValuesRaw as Record<string, ComposerValue>;
  const setComposerValues = setComposerValuesRaw as (
    updater: (prev: Record<string, ComposerValue>) => Record<string, ComposerValue>
  ) => void;
  const [aiInteractions, setAiInteractions] = useState<Array<{ role: string; content: string; taskKey?: string; timestamp?: number }>>([]);
  const [behaviorEvents, setBehaviorEvents] = useState<BehaviorEvent[]>([]);
  const [startTime] = useState(mountTimestamp);
  const [submitted, setSubmitted] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [tokenClaimed, setTokenClaimed] = useState(false);
  const [pendingAIMessage, setPendingAIMessage] = useState<string | null>(null);

  // ── Telemetry refs ────────────────────────────────────────────────────────
  type TelemetryEvent = { eventType: string; taskId?: string; eventData?: unknown; clientTimestamp: number };
  const behaviorBufferRef = useRef<TelemetryEvent[]>([]);
  const lastCopiedFromRef = useRef<"source_material" | "ai" | "external">("external");
  const taskStartTimeRef = useRef<Record<string, number>>({});
  const materialViewStartRef = useRef(0);
  const prevResponseLengthRef = useRef<Record<string, number>>({});
  const editDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAIResponseAtRef = useRef<number | null>(null);

  const logBehavior = trpc.assessments.logBehavior.useMutation();

  const pushEvent = useCallback((event: TelemetryEvent) => {
    behaviorBufferRef.current.push(event);
  }, []);

  // Flush buffer to server
  const flushBehaviorBuffer = useCallback(async () => {
    const events = behaviorBufferRef.current.splice(0);
    if (!events.length || !assessmentId) return;
    try {
      await logBehavior.mutateAsync({ assessmentId, events });
    } catch (error) {
      behaviorBufferRef.current.unshift(...events);
      throw error;
    }
  }, [assessmentId, logBehavior]);

  // Periodic flush every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => { void flushBehaviorBuffer(); }, 10_000);
    return () => clearInterval(interval);
  }, [flushBehaviorBuffer]);

  // Extract invite token from URL query params
  const urlToken = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("token")
    : null;

  const { data: assessmentData, refetch: refetchAssessment } = trpc.assessments.get.useQuery({ id: assessmentId });
  const claimByToken = trpc.assessments.claimByToken.useMutation({
    onSuccess: () => { setTokenClaimed(true); refetchAssessment(); },
    onError: () => { setTokenClaimed(true); refetchAssessment(); },
  });
  const startAssessment = trpc.assessments.start.useMutation({
    onSuccess: () => { refetchAssessment(); },
  });
  const submitAssessment = trpc.assessments.submit.useMutation({
    onSuccess: () => {
      clearDraft();
      setSubmitted(true);
      toast.success("Assessment submitted! Your results are being scored.");
      setTimeout(() => navigate("/dashboard/candidate"), 3000);
    },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    if (urlToken && assessmentId && !tokenClaimed && !claimByToken.isPending) {
      claimByToken.mutate({ token: urlToken, assessmentId });
    }
  }, [urlToken, assessmentId]);

  useEffect(() => {
    if (assessmentData?.assessment.status === "invited" && assessmentData?.campaign) {
      startAssessment.mutate({ id: assessmentId });
    }
  }, [assessmentData?.assessment.status, assessmentData?.campaign]);

  // React 19 dev-mode double-mounts effects, which previously caused the
  // "Draft restored" toast to stack. The ref guard makes it idempotent across
  // remounts; the explicit toast id is a defence-in-depth against any future
  // re-renders that change `hadRestoredDraft`'s referential equality.
  const draftToastShownRef = useRef(false);
  useEffect(() => {
    if (!hadRestoredDraft || draftToastShownRef.current) return;
    draftToastShownRef.current = true;
    toast.info("Draft restored — your previous responses have been reloaded.", {
      id: `draft-restored-${assessmentId}`,
      duration: 6000,
      dismissible: true,
      action: { label: "Dismiss", onClick: () => {} },
    });
  }, [hadRestoredDraft, assessmentId]);

  const roleTemplate = (assessmentData?.campaign?.roleTemplate ?? "IB Analyst") as keyof typeof TASK_PROMPTS;
  const hardcodedMaterialKeys = useMemo(() => getSourceMaterialKeysForRole(roleTemplate), [roleTemplate]);
  const defaultHardcodedMaterialKey = hardcodedMaterialKeys[0] ?? "10K";

  // Custom source materials uploaded by recruiter
  const customMaterials = useMemo(
    () =>
      (assessmentData?.campaign?.sourceMaterials as Array<{
        label: string;
        fileKey: string;
        url: string;
        mimeType: string;
        sizeBytes: number;
      }> | null | undefined) ?? [],
    [assessmentData]
  );
  const hasCustomMaterials = customMaterials.length > 0;

  const defaultMaterialTab = hasCustomMaterials
    ? customMaterials[0].fileKey
    : defaultHardcodedMaterialKey;
  const activeTab = activeTabSelection ?? defaultMaterialTab;

  const tasks = TASK_PROMPTS[roleTemplate] ?? TASK_PROMPTS["IB Analyst"];
  const totalMinutes = assessmentData?.assessment.timeLimitMinutes ?? 60;
  // Absolute deadline derived from the server-recorded startedAt. Null until
  // `assessments.start` lands and the cache refreshes — the Timer falls back
  // to a static display in that window.
  const startedAtMs = useMemo(() => {
    const raw = assessmentData?.assessment.startedAt;
    if (!raw) return null;
    const ms = new Date(raw).getTime();
    return Number.isFinite(ms) ? ms : null;
  }, [assessmentData?.assessment.startedAt]);
  const deadlineMs = startedAtMs !== null ? startedAtMs + totalMinutes * 60 * 1000 : null;
  const taskIds = tasks.map(t => t.id);
  const { progress: taskProgress, formatElapsed } = useTaskProgress(currentTask, taskIds, responses);
  const { textareaProps: compositionProps, getRatio } = useCompositionTracker(tasks[currentTask]?.id ?? "", taskIds);
  const [compositionPulse, setCompositionPulse] = useState(0);

  // Source material labels for AI chips
  const sourceMaterialLabels = useMemo(() => {
    if (hasCustomMaterials) return customMaterials.map(m => m.label);
    return hardcodedMaterialKeys.map(key => SOURCE_MATERIALS[key].label);
  }, [hasCustomMaterials, customMaterials, hardcodedMaterialKeys]);
  const activeMaterialLabel = useMemo(() => {
    if (hasCustomMaterials) {
      return customMaterials.find(m => m.fileKey === activeTab)?.label;
    }
    return SOURCE_MATERIALS[activeTab as SourceMaterialKey]?.label;
  }, [activeTab, hasCustomMaterials, customMaterials]);

  const currentTaskId = tasks[currentTask]?.id ?? "";
  const currentResponseType = (tasks[currentTask]?.responseType ?? "memo") as ResponseType;
  const currentComposerValue = composerValues[currentTaskId] ?? {};

  // Track task start time on first visit
  useEffect(() => {
    if (!currentTaskId) return;
    if (!taskStartTimeRef.current[currentTaskId]) {
      taskStartTimeRef.current[currentTaskId] = eventTimestamp();
    }
  }, [currentTaskId]);

  // task_switch event: emit when currentTask changes (not on first mount)
  const prevTaskRef = useRef<number | null>(null);
  useEffect(() => {
    if (prevTaskRef.current === null) { prevTaskRef.current = currentTask; return; }
    if (prevTaskRef.current === currentTask) return;
    const prevId = tasks[prevTaskRef.current]?.id;
    const dwellMs = prevId && taskStartTimeRef.current[prevId]
      ? eventTimestamp() - taskStartTimeRef.current[prevId]
      : 0;
    pushEvent({
      eventType: "task_switch",
      taskId: currentTaskId,
      eventData: { fromTaskId: prevId ?? null, toTaskId: currentTaskId, dwellSeconds: Math.round(dwellMs / 1000) },
      clientTimestamp: eventTimestamp(),
    });
    prevTaskRef.current = currentTask;
  }, [currentTask]);

  // material_view event: emit when activeTab changes
  const prevTabRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevTabRef.current === null) { prevTabRef.current = activeTab; materialViewStartRef.current = eventTimestamp(); return; }
    if (prevTabRef.current === activeTab) return;
    const durationMs = eventTimestamp() - materialViewStartRef.current;
    pushEvent({
      eventType: "material_view",
      taskId: currentTaskId,
      eventData: { materialKey: prevTabRef.current, durationSeconds: Math.round(durationMs / 1000) },
      clientTimestamp: eventTimestamp(),
    });
    prevTabRef.current = activeTab;
    materialViewStartRef.current = eventTimestamp();
  }, [activeTab]);

  // Paste handler — captures paste events on the composer area
  const handleComposerPaste = useCallback((e: React.ClipboardEvent) => {
    const clipLen = e.clipboardData?.getData("text")?.length ?? 0;
    const source = lastCopiedFromRef.current;
    pushEvent({
      eventType: "paste",
      taskId: currentTaskId,
      eventData: { source, clipboardLength: clipLen },
      clientTimestamp: eventTimestamp(),
    });
    // Reset to external after use
    lastCopiedFromRef.current = "external";
    compositionProps.onPaste?.(e);
  }, [currentTaskId, pushEvent]);

  const updateComposerValue = (value: ComposerValue) => {
    setCompositionPulse(prev => prev + 1);
    setComposerValues(prev => ({ ...prev, [currentTaskId]: value }));
    // Sync serialized string to responses for draft persistence and submission
    const serialized = serializeComposerValue(currentResponseType, value);
    setResponses(prev => ({ ...prev, [currentTaskId]: serialized }));
    // Debounced response_edit event
    if (editDebounceRef.current) clearTimeout(editDebounceRef.current);
    editDebounceRef.current = setTimeout(() => {
      const prevLen = prevResponseLengthRef.current[currentTaskId] ?? 0;
      const newLen = serialized.length;
      const delta = newLen - prevLen;
      prevResponseLengthRef.current[currentTaskId] = newLen;
      pushEvent({
        eventType: "response_edit",
        taskId: currentTaskId,
        eventData: {
          netDeltaChars: delta,
          totalLength: newLen,
          secsSinceAIResponse: lastAIResponseAtRef.current !== null
            ? Math.round((eventTimestamp() - lastAIResponseAtRef.current) / 1000)
            : null,
        },
        clientTimestamp: eventTimestamp(),
      });
    }, 1000);
  };

  const handleSubmit = async () => {
    // Flush telemetry buffer before submitting
    await flushBehaviorBuffer();
    const completionTimeSeconds = Math.round((eventTimestamp() - startTime) / 1000);
    submitAssessment.mutate({
      assessmentId,
      taskResponses: responses,
      taskResponsesStructured: composerValues,
      aiInteractions,
      completionTimeSeconds,
    });
  };

  const handleExpire = useCallback(() => {
    toast.warning("Time's up! Submitting your responses automatically.");
    handleSubmit();
  }, [responses, aiInteractions]);

  const handleAIInteraction = (msg: { role: string; content: string; taskKey: string; timestamp: number }) => {
    setAiInteractions(prev => [...prev, msg]);
    if (msg.role === "user") {
      setBehaviorEvents(prev => [...prev, { type: "ai", timestamp: msg.timestamp }]);
    }
    if (msg.role === "assistant") {
      lastAIResponseAtRef.current = eventTimestamp();
      pushEvent({
        eventType: "ai_response_complete",
        taskId: msg.taskKey,
        eventData: { responseLength: msg.content.length },
        clientTimestamp: eventTimestamp(),
      });
    }
  };

  const handleCiteInResponse = (text: string, source: "ai" | "source_material") => {
    pushEvent({
      eventType: "citation_added",
      taskId: currentTaskId,
      eventData: { source, textLength: text.length, responseType: currentResponseType },
      clientTimestamp: eventTimestamp(),
    });
    const citation = `\n\n> ${text.replace(/\n/g, "\n> ")}`;
    if (currentResponseType === "memo") {
      const v = (currentComposerValue as MemoValue) ?? {};
      const next = { ...v, conclusion: (v.conclusion ?? "") + citation };
      updateComposerValue(next);
    } else if (currentResponseType === "thesis") {
      const v = (currentComposerValue as ThesisValue) ?? {};
      const next = { ...v, recommendation: (v.recommendation ?? "") + citation };
      updateComposerValue(next);
    } else {
      // For other types, append to serialized response as a fallback
      const raw = responses[currentTaskId] ?? "";
      setResponses(prev => ({ ...prev, [currentTaskId]: raw + citation }));
    }
    toast.success("Citation added to response.");
  };

  const handleSendToAI = (text: string) => {
    setPendingAIMessage(text);
  };

  // A task is complete when all required sections are filled
  const isTaskComplete = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    const type = (task?.responseType ?? "memo") as ResponseType;
    const v = composerValues[taskId];
    if (v) return isComposerComplete(type, v);
    // Fallback for restored drafts (string-serialized)
    const raw = responses[taskId] ?? "";
    return raw.trim().length > 50;
  };

  // Count how many sections are filled for a given task
  const sectionCount = (taskId: string): number => {
    const task = tasks.find(t => t.id === taskId);
    const type = (task?.responseType ?? "memo") as ResponseType;
    const v = composerValues[taskId];
    if (v) return countFilledSections(type, v);
    // Fallback for restored drafts
    const raw = responses[taskId] ?? "";
    return raw.trim().length > 0 ? 1 : 0;
  };

  // Total sections for a given task
  const totalSections = (taskId: string): number => {
    const task = tasks.find(t => t.id === taskId);
    const type = (task?.responseType ?? "memo") as ResponseType;
    return getComposerSections(type).length;
  };

  // All tasks have non-empty responses
  const allTasksAnswered = tasks.every(t => isTaskComplete(t.id));

  const { typedPct, pastedPct } = getRatio(currentTaskId);

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--surface-base)" }}>
        <div className="text-center">
          <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: "var(--accent-gold)" }} />
          <h1 className="text-3xl font-black uppercase tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>
            Assessment Submitted
          </h1>
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            Your responses are being scored. Redirecting to your dashboard…
          </p>
        </div>
      </div>
    );
  }

  // Orphaned assessment: campaign was deleted out from under it. Without a
  // campaign we silently lose roleTemplate, sourceMaterials, and timeLimit,
  // so the candidate would see a hardcoded IB-Analyst fallback that is not
  // what the recruiter set up. Surface this explicitly instead of pretending
  // the assessment still works.
  if (assessmentData && !assessmentData.campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--surface-base)" }}>
        <div className="max-w-md text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4" style={{ color: "var(--data-warning, #c4a35a)" }} />
          <h1 className="text-2xl font-black uppercase tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>
            Assessment Unavailable
          </h1>
          <p className="text-sm leading-relaxed mb-2" style={{ color: "var(--text-tertiary)" }}>
            The campaign for this assessment has been removed by the recruiter, so it can no longer be opened.
          </p>
          <p className="text-xs" style={{ color: "var(--text-quaternary)" }}>
            Please contact your recruiter to request a fresh invite.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "var(--surface-base)", fontFamily: "var(--font-ui)" }}>
      {/* ── Top bar ── */}
      <header
        className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b z-20"
        style={{ background: "var(--surface-1)", borderColor: "var(--border-subtle)" }}
      >
        <div className="flex items-center gap-3">
          <span className="font-bold text-xs uppercase tracking-widest hidden sm:block" style={{ color: "var(--text-primary)" }}>
            Pine Assessment
          </span>
          <span className="text-xs hidden md:block" style={{ color: "var(--text-quaternary)" }}>·</span>
          <span className="text-xs hidden md:block" style={{ color: "var(--accent-gold)" }}>{roleTemplate}</span>
        </div>

        <div className="flex items-center gap-3">
          <Timer totalSeconds={totalMinutes * 60} deadlineMs={deadlineMs} onExpire={handleExpire} />

          {/* Saved indicator — green pulse dot */}
          {lastSaved && (
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <div
                  key={lastSaved.getTime()}
                  className="w-2 h-2 rounded-full animate-pulse cursor-default"
                  style={{ background: "var(--data-positive)" }}
                />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Saved {lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </TooltipContent>
            </Tooltip>
          )}

          {/* Submit — muted until all tasks answered */}
          <Button
            onClick={() => setConfirmSubmit(true)}
            className="font-bold text-xs tracking-widest uppercase px-4 py-1.5 transition-all duration-300"
            style={allTasksAnswered ? {
              background: "var(--accent-gold)",
              color: "#fff",
              border: "none",
            } : {
              background: "var(--surface-2)",
              color: "var(--text-tertiary)",
              border: `1px solid var(--border-emphasis)`,
            }}
          >
            Submit Assessment
          </Button>
        </div>
      </header>

      {/* Submit confirmation dialog */}
      <AlertDialog open={confirmSubmit} onOpenChange={setConfirmSubmit}>
        <AlertDialogContent
          className="max-w-md"
          style={{ background: "var(--surface-1)", border: `1px solid rgba(22,138,74,0.3)`, color: "var(--text-primary)" }}
        >
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(22,138,74,0.1)" }}
              >
                <ShieldAlert className="w-5 h-5" style={{ color: "var(--accent-gold)" }} />
              </div>
              <AlertDialogTitle className="text-lg font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
                Submit Assessment?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-sm" style={{ color: "var(--text-tertiary)" }}>
                <p>Once submitted, your responses are final and cannot be edited. The assessment will be scored immediately.</p>
                <div
                  className="rounded-xl p-4 space-y-2 border"
                  style={{ background: "var(--surface-base)", borderColor: "var(--border-subtle)" }}
                >
                  <p className="text-[10px] uppercase tracking-widest font-bold mb-3" style={{ color: "var(--text-quaternary)" }}>
                    Task Completion
                  </p>
                  {tasks.map((task, i) => {
                    const answered = isTaskComplete(task.id);
                    const taskType = (task.responseType ?? "memo") as ResponseType;
                    const allSections = getComposerSections(taskType);
                    const v = composerValues[task.id];
                    const filledCount = v ? countFilledSections(taskType, v) : 0;
                    const missing: string[] = !answered
                      ? allSections.slice(filledCount)
                      : [];
                    return (
                      <div key={task.id} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ background: answered ? "rgba(22,138,74,0.2)" : "var(--surface-2)" }}
                            >
                              {answered
                                ? <CheckCircle className="w-2.5 h-2.5" style={{ color: "var(--accent-gold)" }} />
                                : <span className="text-[9px] font-bold" style={{ color: "var(--text-quaternary)" }}>{i + 1}</span>}
                            </div>
                            <span className="text-xs truncate" style={{ color: answered ? "var(--text-secondary)" : "var(--text-quaternary)" }}>
                              Task {i + 1}: {task.title}
                            </span>
                          </div>
                          <span
                            className="text-[10px] font-bold uppercase tracking-widest ml-2 flex-shrink-0"
                            style={{ color: answered ? "var(--accent-gold)" : "var(--data-negative)" }}
                          >
                            {answered ? "Ready" : `${sectionCount(task.id)}/3`}
                          </span>
                        </div>
                        {!answered && missing.length > 0 && (
                          <div className="flex flex-wrap gap-1 pl-6">
                            {missing.map(label => (
                              <span
                                key={label}
                                className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                                style={{
                                  background: "rgba(201,122,133,0.1)",
                                  color: "var(--data-negative)",
                                  border: "1px solid rgba(201,122,133,0.2)",
                                }}
                              >
                                {label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div className="pt-2 border-t mt-2" style={{ borderColor: "var(--border-subtle)" }}>
                    <span className="text-[10px]" style={{ color: "var(--text-quaternary)" }}>
                      {tasks.filter(t => isTaskComplete(t.id)).length} of {tasks.length} tasks answered
                    </span>
                  </div>
                </div>
                {tasks.some(t => !isTaskComplete(t.id)) && (
                  <div
                    className="flex items-start gap-2 p-3 rounded-lg border"
                    style={{ background: "rgba(201,122,133,0.05)", borderColor: "rgba(201,122,133,0.2)" }}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "var(--data-negative)" }} />
                    <p className="text-xs" style={{ color: "var(--data-negative)" }}>
                      You have unanswered tasks. Submitting now will leave them blank.
                    </p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-2">
            <AlertDialogCancel
              className="text-xs uppercase tracking-widest"
              style={{ background: "transparent", border: `1px solid var(--border-emphasis)`, color: "var(--text-tertiary)" }}
            >
              Go Back
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmit}
              disabled={submitAssessment.isPending}
              className="font-black text-xs uppercase tracking-widest px-6"
              style={{ background: "var(--accent-gold)", color: "#fff" }}
            >
              {submitAssessment.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting…
                </span>
              ) : (
                "Confirm & Submit"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Main layout ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left: Source Materials ── */}
        <div
          className="w-[36%] flex flex-col border-r overflow-hidden"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          {/* Material tabs */}
          <div
            className="flex border-b flex-shrink-0 overflow-x-auto"
            style={{ background: "var(--surface-1)", borderColor: "var(--border-subtle)" }}
          >
            {hasCustomMaterials ? (
              customMaterials.map(mat => (
                <button
                  key={mat.fileKey}
                  onClick={() => setActiveTab(mat.fileKey)}
                  className="flex items-center gap-1.5 px-4 py-3 text-xs font-bold tracking-widest uppercase border-b-2 whitespace-nowrap transition-all duration-150"
                  style={{
                    borderBottomColor: activeTab === mat.fileKey ? "var(--accent-gold)" : "transparent",
                    color: activeTab === mat.fileKey ? "var(--accent-gold)" : "var(--text-quaternary)",
                  }}
                >
                  <FileText className="w-3.5 h-3.5" />
                  {mat.label.length > 20 ? mat.label.slice(0, 18) + "…" : mat.label}
                </button>
              ))
            ) : (
              hardcodedMaterialKeys.map(key => {
                const mat = SOURCE_MATERIALS[key];
                return (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className="flex items-center gap-1.5 px-4 py-3 text-xs font-bold tracking-widest uppercase border-b-2 transition-all duration-150"
                    style={{
                      borderBottomColor: activeTab === key ? "var(--accent-gold)" : "transparent",
                      color: activeTab === key ? "var(--accent-gold)" : "var(--text-quaternary)",
                    }}
                  >
                    <mat.icon className="w-3.5 h-3.5" />
                    {mat.label}
                  </button>
                );
              })
            )}
          </div>

          {/* Material content */}
          <div
            className="flex-1 overflow-hidden"
            onCopy={() => { lastCopiedFromRef.current = "source_material"; }}
          >
            {hasCustomMaterials ? (
              (() => {
                const mat = customMaterials.find(m => m.fileKey === activeTab);
                if (!mat) return null;
                return <PdfMaterialViewer material={mat} />;
              })()
            ) : (
              <SourceMaterialContent
                content={SOURCE_MATERIALS[activeTab as SourceMaterialKey]?.content ?? ""}
                onSendToAI={text => setPendingAIMessage(text)}
                onCiteInResponse={handleCiteInResponse}
              />
            )}
          </div>
        </div>

        {/* ── Center: Task Workspace ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Task tabs */}
          <div
            className="flex border-b flex-shrink-0 overflow-x-auto"
            style={{ background: "var(--surface-1)", borderColor: "var(--border-subtle)" }}
          >
            {tasks.map((task, i) => (
              <Tooltip key={task.id} delayDuration={300}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setCurrentTask(i)}
                    className="flex items-center gap-2 px-4 py-3 text-xs font-bold tracking-widest uppercase whitespace-nowrap border-b-2 transition-all duration-150"
                    style={{
                      borderBottomColor: currentTask === i ? "var(--accent-gold)" : "transparent",
                      color: currentTask === i ? "var(--text-primary)" : "var(--text-quaternary)",
                    }}
                  >
                    <span
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black transition-all duration-200"
                      style={{
                        background: isTaskComplete(task.id) ? "var(--accent-gold)" : "var(--surface-2)",
                        color: isTaskComplete(task.id) ? "#fff" : "var(--text-quaternary)",
                      }}
                    >
                      {isTaskComplete(task.id)
                        ? <CheckCircle className="w-3 h-3" />
                        : <span>{i + 1}</span>
                      }
                    </span>
                    <span className="flex flex-col items-start leading-none gap-0.5">
                      <span>Task {i + 1}</span>
                      {(() => {
                        const count = sectionCount(task.id);
                        const complete = isTaskComplete(task.id);
                        const elapsed = taskProgress[task.id]?.elapsedSeconds > 0;
                        if (!complete && count > 0) {
                          return (
                            <span
                              className="text-[8px] font-bold tracking-wider tabular-nums"
                              style={{ color: "var(--accent-gold)", fontFamily: "var(--font-mono)", opacity: 0.85 }}
                            >
                              {count}/3
                            </span>
                          );
                        }
                        if (elapsed) {
                          return (
                            <span className="text-[8px] font-normal tracking-wider tabular-nums" style={{ color: "var(--text-quaternary)", fontFamily: "var(--font-mono)" }}>
                              {formatElapsed(taskProgress[task.id].elapsedSeconds)}
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs font-semibold tracking-wide px-3 py-1.5">
                  {task.title}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>

          {/* Task content */}
          <div className="flex-1 flex flex-col overflow-y-auto p-5 gap-4" style={{ background: "var(--surface-base)" }}>

            {/* ── Task Brief Card ── */}
            <div
              className="flex-shrink-0 rounded-xl border overflow-hidden"
              style={{ background: "var(--surface-1)", borderColor: "rgba(22,138,74,0.2)" }}
            >
              {/* Header */}
              <div
                className="flex items-center gap-2 px-4 py-2.5 border-b"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <BookOpen className="w-3.5 h-3.5" style={{ color: "var(--accent-gold)" }} />
                <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "var(--accent-gold)" }}>
                  Task {currentTask + 1} — {tasks[currentTask]?.title}
                </span>
              </div>

              <div className="px-4 py-3 space-y-3">
                {/* Imperative */}
                <p
                  className="font-semibold leading-snug"
                  style={{ fontSize: "17px", color: "var(--text-primary)", fontWeight: 600 }}
                >
                  {tasks[currentTask]?.imperative ?? tasks[currentTask]?.title}
                </p>

                {/* Data points chips */}
                    {tasks[currentTask]?.dataPoints && (
                  <div className="flex flex-wrap gap-2">
                    {tasks[currentTask].dataPoints.map((dp, i) => (
                      <DataValue
                        key={i}
                        value={dp.value}
                        delta={(dp as { label: string; value: string; delta?: number }).delta}
                        label={dp.label}
                        emphasis
                        className="text-sm"
                      />
                    ))}
                  </div>
                )}

                {/* Context */}
                <p
                  className="leading-relaxed"
                  style={{ fontSize: "13px", color: "var(--text-secondary)" }}
                >
                  {tasks[currentTask]?.context ?? tasks[currentTask]?.prompt}
                </p>

                {/* Deliverable */}
                {tasks[currentTask]?.deliverable && (
                  <p
                    className="italic"
                    style={{ fontSize: "12px", color: "var(--accent-gold)" }}
                  >
                    {tasks[currentTask].deliverable}
                  </p>
                )}
              </div>
            </div>

            {/* ── Behavior Strip ── */}
            <div className="flex-shrink-0">
              <BehaviorStrip
                events={behaviorEvents}
                typedPct={typedPct}
                pastedPct={pastedPct}
                typingSignal={compositionPulse}
              />
            </div>

            {/* ── Structured Response Composer ── */}
            <div className="flex-shrink-0 flex flex-col gap-2">
              <div className="flex items-center justify-between flex-shrink-0">
                <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "var(--text-quaternary)" }}>
                  Your Response
                </span>
                <div className="flex items-center gap-3">
                  {taskProgress[currentTaskId]?.elapsedSeconds > 0 && (
                    <span className="flex items-center gap-1 text-[10px] tabular-nums" style={{ color: "var(--text-quaternary)", fontFamily: "var(--font-mono)" }}>
                      <TimerIcon className="w-2.5 h-2.5" />
                      {formatElapsed(taskProgress[currentTaskId]?.elapsedSeconds ?? 0)}
                    </span>
                  )}
                  <span className="text-[10px] tabular-nums" style={{ color: "var(--text-quaternary)", fontFamily: "var(--font-mono)" }}>
                    {responses[currentTaskId]?.split(/\s+/).filter(Boolean).length ?? 0} words
                  </span>
                </div>
              </div>

              <ComposerSwitch
                responseType={currentResponseType}
                value={currentComposerValue}
                onChange={updateComposerValue}
                onPaste={handleComposerPaste}
              />
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between flex-shrink-0">
              <Button
                variant="ghost"
                onClick={() => setCurrentTask(Math.max(0, currentTask - 1))}
                disabled={currentTask === 0}
                className="text-xs tracking-widest uppercase"
                style={{ color: "var(--text-quaternary)" }}
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
              </Button>
              <div className="flex gap-1.5">
                {tasks.map((t, i) => (
                  <button
                    key={t.id}
                    onClick={() => setCurrentTask(i)}
                    className="rounded-full transition-all duration-200"
                    style={{
                      width: i === currentTask ? "1.5rem" : "0.5rem",
                      height: "0.5rem",
                      background: i === currentTask
                        ? "var(--accent-gold)"
                        : isTaskComplete(t.id)
                        ? "rgba(22,138,74,0.4)"
                        : "var(--surface-2)",
                    }}
                  />
                ))}
              </div>
              {currentTask < tasks.length - 1 ? (
                <Button
                  variant="ghost"
                  onClick={() => setCurrentTask(Math.min(tasks.length - 1, currentTask + 1))}
                  className="text-xs tracking-widest uppercase"
                  style={{ color: "var(--text-quaternary)" }}
                >
                  Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={() => setConfirmSubmit(true)}
                  className="font-bold text-xs tracking-widest uppercase"
                  style={{ background: "var(--accent-gold)", color: "#fff" }}
                >
                  Submit All <CheckCircle className="w-3.5 h-3.5 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: AI Chat ── */}
        <div
          className="w-[28%] border-l flex flex-col overflow-hidden"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <AIChatPanel
            assessmentId={assessmentId}
            currentTaskId={currentTaskId}
            currentTask={tasks[currentTask] ?? { title: "", aiSuggestions: [] }}
            roleTemplate={roleTemplate}
            activeMaterialLabel={activeMaterialLabel}
            onInteraction={handleAIInteraction}
            onCiteInResponse={handleCiteInResponse}
            onAssistantCopy={() => { lastCopiedFromRef.current = "ai"; }}
            sourceMaterialLabels={sourceMaterialLabels}
            onPushBehaviorEvent={pushEvent}
            taskStartTimeRef={taskStartTimeRef}
          />
          {/* Pending AI message injector */}
          {pendingAIMessage && (
            <PendingMessageInjector
              message={pendingAIMessage}
              onConsumed={() => setPendingAIMessage(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Helper: inject a pending message into the AI chat via a side-channel
// (avoids prop-drilling a ref into AIChatPanel)
function PendingMessageInjector({ message, onConsumed }: { message: string; onConsumed: () => void }) {
  useEffect(() => {
    // Signal consumed immediately — the parent AIChatPanel will pick up via
    // the input state if we use a shared context, but for now we show a toast
    // directing the user to paste the selection into the AI input.
    toast.info(`Selection copied to clipboard. Paste into Pine AI to ask about it.`);
    navigator.clipboard.writeText(message).catch(() => {});
    onConsumed();
  }, []);
  return null;
}
