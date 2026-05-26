import type { BehaviorEvent } from "@/app/lib/schema";

type EventData = Record<string, unknown>;

export type BehaviorEventSummary = {
  eventCount: number;
  pasteCount: number;
  pasteSources: { ai: number; source_material: number; external: number };
  promptsSent: number;
  materialSeconds: number;
  citationCount: number;
  citationSources: { ai: number; source_material: number };
  responseEditCount: number;
  postAiEditCount: number;
  averageEditLag: number | null;
};

function asEventData(value: unknown): EventData {
  return value != null && typeof value === "object" && !Array.isArray(value) ? value as EventData : {};
}

function stringField(data: EventData, key: string) {
  const value = data[key];
  return typeof value === "string" ? value : undefined;
}

function numberField(data: EventData, key: string) {
  const value = data[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function formatBehaviorSeconds(totalSeconds: number) {
  if (totalSeconds < 60) return `${Math.round(totalSeconds)}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

export function deriveBehaviorEventSummary(events: Pick<BehaviorEvent, "eventType" | "eventData">[]): BehaviorEventSummary {
  const pasteSources = { ai: 0, source_material: 0, external: 0 };
  const citationSources = { ai: 0, source_material: 0 };
  let promptsSent = 0;
  let materialSeconds = 0;
  let postAiEditCount = 0;
  let responseEditCount = 0;
  let totalSecsSinceAiResponse = 0;

  for (const event of events) {
    const data = asEventData(event.eventData);
    if (event.eventType === "paste") {
      const source = stringField(data, "source");
      if (source === "ai" || source === "source_material" || source === "external") {
        pasteSources[source] += 1;
      } else {
        pasteSources.external += 1;
      }
    }
    if (event.eventType === "ai_prompt_sent") {
      promptsSent += 1;
    }
    if (event.eventType === "material_view") {
      materialSeconds += numberField(data, "durationSeconds") ?? 0;
    }
    if (event.eventType === "citation_added") {
      const source = stringField(data, "source");
      if (source === "ai" || source === "source_material") {
        citationSources[source] += 1;
      }
    }
    if (event.eventType === "response_edit") {
      const seconds = numberField(data, "secsSinceAIResponse");
      responseEditCount += 1;
      if (seconds != null) {
        postAiEditCount += 1;
        totalSecsSinceAiResponse += seconds;
      }
    }
  }

  const pasteCount = pasteSources.ai + pasteSources.source_material + pasteSources.external;
  const citationCount = citationSources.ai + citationSources.source_material;

  return {
    eventCount: events.length,
    pasteCount,
    pasteSources,
    promptsSent,
    materialSeconds,
    citationCount,
    citationSources,
    responseEditCount,
    postAiEditCount,
    averageEditLag: postAiEditCount > 0 ? totalSecsSinceAiResponse / postAiEditCount : null,
  };
}
