"use client";

/**
 * SourceMaterialUploader
 *
 * A reusable component that lets recruiters upload PDF / text source materials
 * (10-Ks, earnings releases, models) to a campaign.
 *
 * Usage:
 *   <SourceMaterialUploader
 *     campaignId={id}
 *     materials={campaign.sourceMaterials ?? []}
 *     onChanged={() => utils.campaigns.get.invalidate({ id })}
 *   />
 */
import { useRef, useState } from "react";
import { Upload, FileText, X, Loader2, File } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/app/lib/trpc";
import { Button } from "@/app/components/ui/button";

export interface SourceMaterial {
  label: string;
  fileKey: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
}

interface Props {
  campaignId: number;
  materials: SourceMaterial[];
  onChanged?: () => void;
  /** When true, render a compact inline list without the upload dropzone (read-only view) */
  readOnly?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SourceMaterialUploader({ campaignId, materials, onChanged, readOnly }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const addMaterial = trpc.campaigns.addSourceMaterial.useMutation({
    onSuccess: () => {
      toast.success("Source material uploaded");
      onChanged?.();
    },
    onError: (e) => toast.error(e.message),
  });

  const removeMaterial = trpc.campaigns.removeSourceMaterial.useMutation({
    onSuccess: () => {
      toast.success("Source material removed");
      onChanged?.();
    },
    onError: (e) => toast.error(e.message),
  });

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];

    // Validate
    const allowed = ["application/pdf", "text/plain", "text/markdown", "text/csv"];
    if (!allowed.includes(file.type) && !file.name.endsWith(".md") && !file.name.endsWith(".csv")) {
      toast.error("Only PDF, TXT, MD, and CSV files are supported");
      return;
    }
    if (file.size > 16 * 1024 * 1024) {
      toast.error("File must be under 16 MB");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload/source-material", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error ?? "Upload failed");
      }

      const { fileKey, url } = await res.json();
      await addMaterial.mutateAsync({
        campaignId,
        label: file.name,
        fileKey,
        url,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const isBusy = uploading || addMaterial.isPending || removeMaterial.isPending;

  return (
    <div className="space-y-3">
      {/* Existing materials list */}
      {materials.length > 0 && (
        <ul className="space-y-2">
          {materials.map((m) => (
            <li
              key={m.fileKey}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-[#111] border border-[#2a2a2a] group"
            >
              {m.mimeType === "application/pdf" ? (
                <FileText className="h-4 w-4 text-[#c9a84c] shrink-0" />
              ) : (
                <File className="h-4 w-4 text-[#888] shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <a
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-white hover:text-[#c9a84c] truncate block transition-colors"
                >
                  {m.label}
                </a>
                <span className="text-[10px] text-[#555]">{formatBytes(m.sizeBytes)}</span>
              </div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => removeMaterial.mutate({ campaignId, fileKey: m.fileKey })}
                  disabled={isBusy}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-[#555] hover:text-red-400 disabled:opacity-30"
                  title="Remove"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Upload dropzone — hidden in readOnly mode */}
      {!readOnly && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.txt,.md,.csv,text/plain,application/pdf,text/markdown,text/csv"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <button
            type="button"
            disabled={isBusy}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
            className={`w-full flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed transition-colors text-center cursor-pointer
              ${dragOver
                ? "border-[#c9a84c] bg-[#c9a84c]/5"
                : "border-[#333] hover:border-[#555] bg-transparent"
              }
              ${isBusy ? "opacity-50 cursor-not-allowed" : ""}
            `}
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 text-[#c9a84c] animate-spin" />
            ) : (
              <Upload className="h-5 w-5 text-[#555]" />
            )}
            <span className="text-xs text-[#666]">
              {uploading ? "Uploading…" : "Drop a file or click to upload"}
            </span>
            <span className="text-[10px] text-[#444]">PDF, TXT, MD, CSV · max 16 MB</span>
          </button>
        </>
      )}

      {materials.length === 0 && readOnly && (
        <p className="text-xs text-[#555] italic">No custom source materials — default Acme Financial case study will be used.</p>
      )}
    </div>
  );
}
