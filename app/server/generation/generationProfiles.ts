import type {
  AssessmentResponseType,
  AssessmentTask,
  ExpectedExtractionRow,
  RoleTemplate,
} from "@/app/lib/schema";

export type RoleProfile = {
  emphasizedTypes: AssessmentResponseType[];
  archetypes: string[];
  whatGoodLooksLike: string;
};

const ALLOWED_GENERATED_TYPES: AssessmentResponseType[] = ["memo", "variance", "thesis", "flags", "extraction"];

export const ROLE_PROFILES: Record<RoleTemplate, RoleProfile> = {
  "IB Analyst": {
    emphasizedTypes: ["extraction", "memo", "flags"],
    archetypes: [
      "Source-backed financial metric extraction for a pitch-book exhibit",
      "Valuation assumption critique with sensitivity framing",
      "M&A risk or strategic rationale summary for a senior banker",
    ],
    whatGoodLooksLike:
      "Precise figures, clean bridges from source data to conclusion, explicit valuation assumptions, and concise banker-ready language that flags risks without over-writing the candidate's final answer.",
  },
  "PE Associate": {
    emphasizedTypes: ["thesis", "flags", "memo", "extraction"],
    archetypes: [
      "Preliminary investment thesis with value-creation levers",
      "Deal risk and financing flag assessment",
      "First-round diligence memo with prioritized questions",
    ],
    whatGoodLooksLike:
      "Investment judgment under uncertainty, direct risk/reward framing, credible operating and capital-structure logic, and specific diligence questions tied to value creation or downside protection.",
  },
  "Hedge Fund Research Analyst": {
    emphasizedTypes: ["thesis", "extraction", "flags"],
    archetypes: [
      "Long/short thesis with catalysts, valuation, and downside risk",
      "Earnings-quality extraction that separates structural from cyclical drivers",
      "Anomaly flagging and price-target triangulation",
    ],
    whatGoodLooksLike:
      "A differentiated view, clear catalyst path, source-backed valuation math, variant perception, and explicit discussion of what would disconfirm the thesis.",
  },
  "Management Consultant": {
    emphasizedTypes: ["flags", "memo", "extraction"],
    archetypes: [
      "Regulatory and credit red-flag identification ranked by severity",
      "Board-ready risk memo with a clear recommendation",
      "Deal-structure recommendation that mitigates approval and post-close value risk",
    ],
    whatGoodLooksLike:
      "Prioritized recommendations for non-technical executives, rigorous source citations, explicit regulatory or operating mechanism, and practical mitigation steps rather than generic frameworks.",
  },
};

// Curated, shortened server-side exemplars based loosely on the client TASK_PROMPTS gold standards.
// Keep these loosely in sync with app/_pages/AssessmentInterface.tsx without importing that client module.
export const ROLE_EXEMPLAR_TASKS: Record<RoleTemplate, AssessmentTask> = {
  "IB Analyst": {
    id: "example-ib",
    responseType: "memo",
    title: "DCF Assumption Critique",
    imperative: "Challenge three DCF assumptions, propose alternatives, and quantify the directional valuation impact.",
    dataPoints: [
      { label: "Fair Value", value: "$194.40", delta: -1 },
      { label: "Market Price", value: "$256.50" },
      { label: "WACC", value: "9.8%" },
      { label: "TGR", value: "2.5%" },
    ],
    context:
      "A model implies a per-share fair value below the market price using a 9.8% WACC, 2.5% terminal growth rate, and multi-year revenue growth assumptions.",
    deliverable:
      "A banker-ready critique with revised assumption ranges and at least one quantified sensitivity.",
    prompt:
      "Identify the assumptions you would challenge, explain why each may be flawed given the source data, propose a better assumption, and conclude with a revised valuation range.",
    aiSuggestions: [
      "How do I frame a DCF assumption critique?",
      "What valuation sensitivities matter most?",
      "How should I tie model changes to source evidence?",
    ],
  },
  "PE Associate": {
    id: "example-pe",
    responseType: "thesis",
    title: "Preliminary LBO Investment Thesis",
    imperative: "Develop a preliminary investment thesis covering earnings quality, value creation, exit assumptions, and key risks.",
    dataPoints: [
      { label: "EV", value: "$41.5B" },
      { label: "ROE", value: "18.4%" },
      { label: "Net Income", value: "$892M" },
      { label: "Leverage", value: "6.5x", delta: -1 },
    ],
    context:
      "A sponsor is evaluating whether the target's earnings profile, valuation, and leverage capacity can support a five-year hold.",
    deliverable:
      "A concise investment thesis with top risks and mitigation steps.",
    prompt:
      "Assess whether the business supports an LBO case, identify value-creation levers, state exit assumptions, and rank the top three diligence risks.",
    aiSuggestions: [
      "What makes a strong LBO thesis?",
      "How do I separate value creation from financial engineering?",
      "What diligence questions should I prioritize?",
    ],
  },
  "Hedge Fund Research Analyst": {
    id: "example-hf",
    responseType: "thesis",
    title: "Long/Short Investment Thesis",
    imperative: "Take a long or short view with catalysts, valuation support, and the biggest risk to the thesis.",
    dataPoints: [
      { label: "Price", value: "$256.50" },
      { label: "DCF", value: "$194.40", delta: -1 },
      { label: "P/E", value: "41.8x" },
      { label: "ROE", value: "18.4%" },
    ],
    context:
      "The market price, DCF output, multiple context, and recent performance create tension between momentum and valuation risk.",
    deliverable:
      "A direct investment view with three catalysts, a 12-month target, implied return, and a disconfirming risk.",
    prompt:
      "Develop a long or short thesis using the source evidence, quantify the price target logic, and identify what would break the thesis.",
    aiSuggestions: [
      "How should I structure a public-markets thesis?",
      "Which catalysts are most material?",
      "How do I triangulate DCF and multiple-based valuation?",
    ],
  },
  "Management Consultant": {
    id: "example-consultant",
    responseType: "flags",
    title: "Red Flag Identification",
    imperative: "Rank the three highest-priority regulatory and credit risks, citing the specific source data behind each.",
    dataPoints: [
      { label: "CAMELS", value: "3", delta: -1 },
      { label: "NPL", value: "3.8%", delta: -1 },
      { label: "CRE", value: "312%", delta: -1 },
      { label: "BSA MRAs", value: "3", delta: -1 },
    ],
    context:
      "An acquirer needs independent diligence on whether the target's supervisory, credit, and compliance issues could affect approval or post-close value.",
    deliverable:
      "A ranked red-flag list with severity, source citation, and deal-specific consequence.",
    prompt:
      "Identify the highest-priority risks, cite the data point, and explain why each risk threatens regulatory approval, deal timing, or post-close economics.",
    aiSuggestions: [
      "How should I rank regulatory red flags?",
      "What makes a risk deal-specific?",
      "How do I explain this to a non-technical board?",
    ],
  },
};

export const GROUNDED_EXTRACTION_EXEMPLAR: {
  sourceSnippet: string;
  extractionRows: ExpectedExtractionRow[];
} = {
  sourceSnippet:
    "FY2024 revenue was $4,759 million, up 13.2% from FY2023. Net income was $892 million, and return on equity was 18.4%.",
  extractionRows: [
    {
      metricLabel: "FY2024 revenue",
      expectedValue: 4759,
      unit: "$M",
      tolerancePct: 0.005,
      sourceQuote: "FY2024 revenue was $4,759 million, up 13.2% from FY2023.",
    },
    {
      metricLabel: "Revenue growth",
      expectedValue: 13.2,
      unit: "%",
      tolerancePct: 0.02,
      sourceQuote: "FY2024 revenue was $4,759 million, up 13.2% from FY2023.",
    },
    {
      metricLabel: "Return on equity",
      expectedValue: 18.4,
      unit: "%",
      tolerancePct: 0.02,
      sourceQuote: "Net income was $892 million, and return on equity was 18.4%.",
    },
  ],
};

export function isGeneratedResponseType(responseType: AssessmentResponseType) {
  return ALLOWED_GENERATED_TYPES.includes(responseType);
}
