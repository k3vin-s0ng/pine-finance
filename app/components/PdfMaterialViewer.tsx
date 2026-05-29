"use client";

import { Download, ExternalLink, FileText } from "lucide-react";
import type { SourceMaterial } from "@/app/lib/schema";

function storageUrl(fileKey: string) {
  return `/r2-storage/${fileKey.split("/").map(encodeURIComponent).join("/")}`;
}

function formatSize(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${Math.round(sizeBytes / 1024)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PdfMaterialViewer({ material }: { material: SourceMaterial }) {
  const url = storageUrl(material.fileKey);
  const isPdf = material.mimeType === "application/pdf";

  if (isPdf) {
    return (
      <div className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>
              {material.label}
            </div>
            <div className="mt-0.5 text-[10px]" style={{ color: "var(--text-quaternary)" }}>
              PDF • {formatSize(material.sizeBytes)}
            </div>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 items-center gap-1 text-[10px] transition-colors duration-150"
            style={{ color: "var(--accent-gold)" }}
          >
            <ExternalLink className="h-3 w-3" />
            Open
          </a>
        </div>
        <iframe
          src={url}
          title={material.label}
          className="min-h-[400px] w-full flex-1 rounded border bg-white"
          style={{ borderColor: "var(--border-subtle)" }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-4">
      <div
        className="flex items-center justify-between gap-3 rounded-xl border p-4"
        style={{ background: "var(--surface-1)", borderColor: "var(--border-subtle)" }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ background: "rgba(22,138,74,0.1)" }}>
            <FileText className="h-4 w-4" style={{ color: "var(--accent-gold)" }} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              {material.label}
            </p>
            <p className="mt-0.5 text-xs" style={{ color: "var(--text-quaternary)" }}>
              {material.mimeType} • {formatSize(material.sizeBytes)}
            </p>
          </div>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors duration-150"
          style={{ background: "rgba(22,138,74,0.1)", borderColor: "rgba(22,138,74,0.3)", color: "var(--accent-gold)" }}
        >
          <Download className="h-3.5 w-3.5" />
          Open
        </a>
      </div>
      <p className="mt-3 text-xs" style={{ color: "var(--text-quaternary)" }}>
        Open this source material in a new tab to review it.
      </p>
    </div>
  );
}
