import { PDFParse } from "pdf-parse";
import type { SourceMaterial } from "@/app/lib/schema";
import { storageGetSignedUrl } from "./storage";

const MAX_CHARS_PER_MATERIAL = 30_000;
const MAX_TOTAL_CHARS = 90_000;

export type ExtractedSourceMaterialPage = {
  pageNumber: number;
  text: string;
};

export type ExtractedSourceMaterial = SourceMaterial & {
  pages: ExtractedSourceMaterialPage[];
  extractionError?: string;
  truncated?: boolean;
};

function isPlainTextMaterial(mimeType: string) {
  return (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/csv"
  );
}

function normalizeExtractedText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function truncateText(text: string, limit: number) {
  if (text.length <= limit) return { text, truncated: false };
  const suffix = "\n\n[Material truncated for prompt length.]";
  if (limit <= suffix.length) {
    return { text: text.slice(0, Math.max(0, limit)).trim(), truncated: true };
  }
  return {
    text: `${text.slice(0, limit - suffix.length).trim()}${suffix}`,
    truncated: true,
  };
}

async function fetchMaterialBuffer(material: SourceMaterial) {
  const url = await storageGetSignedUrl(material.fileKey);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Fetch failed (${response.status})`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function extractPdfPages(buffer: Buffer): Promise<ExtractedSourceMaterialPage[]> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return result.pages.map(page => ({
      pageNumber: page.num,
      text: normalizeExtractedText(page.text),
    }));
  } finally {
    await parser.destroy();
  }
}

async function extractPlainText(buffer: Buffer): Promise<ExtractedSourceMaterialPage[]> {
  return [
    {
      pageNumber: 1,
      text: normalizeExtractedText(buffer.toString("utf8")),
    },
  ];
}

export async function extractSourceMaterial(
  material: SourceMaterial,
): Promise<ExtractedSourceMaterial> {
  try {
    const buffer = await fetchMaterialBuffer(material);
    const pages =
      material.mimeType === "application/pdf"
        ? await extractPdfPages(buffer)
        : isPlainTextMaterial(material.mimeType)
          ? await extractPlainText(buffer)
          : [];

    if (pages.length === 0) {
      return {
        ...material,
        pages: [],
        extractionError: `Text extraction is not available for ${material.mimeType}.`,
      };
    }

    let remaining = MAX_CHARS_PER_MATERIAL;
    let truncated = false;
    const cappedPages: ExtractedSourceMaterialPage[] = [];

    for (const page of pages) {
      if (remaining <= 0) {
        truncated = true;
        break;
      }
      const capped = truncateText(page.text, remaining);
      cappedPages.push({ ...page, text: capped.text });
      remaining -= capped.text.length;
      truncated = truncated || capped.truncated;
    }

    return { ...material, pages: cappedPages, truncated };
  } catch (error) {
    return {
      ...material,
      pages: [],
      extractionError: error instanceof Error ? error.message : "Unknown extraction error",
    };
  }
}

export async function extractSourceMaterials(
  materials: SourceMaterial[] | null | undefined,
): Promise<ExtractedSourceMaterial[]> {
  if (!materials || materials.length === 0) return [];
  return Promise.all(materials.map(material => extractSourceMaterial(material)));
}

export function formatSourceMaterialsForPrompt(materials: ExtractedSourceMaterial[]) {
  if (materials.length === 0) {
    return "";
  }

  let remaining = MAX_TOTAL_CHARS;
  const sections: string[] = ["=== SOURCE MATERIALS ==="];

  for (const material of materials) {
    if (remaining <= 0) {
      sections.push("[Additional source materials omitted for prompt length.]");
      break;
    }

    const header = `--- ${material.label} (${material.mimeType}, ${Math.round(material.sizeBytes / 1024)} KB) ---`;
    const body =
      material.pages.length > 0
        ? material.pages
            .map(page =>
              material.mimeType === "application/pdf"
                ? `[Page ${page.pageNumber}]\n${page.text}`
                : page.text,
            )
            .join("\n\n")
        : `[Unavailable: ${material.extractionError ?? "No extractable text found."}]`;

    const section = `${header}\n${body}`;
    const capped = truncateText(section, remaining);
    sections.push(capped.text);
    remaining -= capped.text.length;
  }

  return sections.join("\n\n");
}
