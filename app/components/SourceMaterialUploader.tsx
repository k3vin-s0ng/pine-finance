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
import { Upload, FileText, X, Loader2, File, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/app/lib/trpc";

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
  const materialRowClassName = readOnly
    ? "grid w-full max-w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 overflow-hidden rounded-lg border border-[#b7d2bd] bg-[#eef7ef] p-2.5 group"
    : "grid w-full max-w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 overflow-hidden rounded-lg border border-[#b7d2bd] bg-[#eef7ef] p-2.5 group";

  return (
    <div className="w-full max-w-full min-w-0 space-y-3 overflow-hidden">
      {/* Existing materials list */}
      {materials.length > 0 && (
        <ul className="w-full max-w-full min-w-0 space-y-2 overflow-hidden">
          {materials.map((m) => (
            <li
              key={m.fileKey}
              className={materialRowClassName}
            >
              {m.mimeType === "application/pdf" ? (
                <FileText className="h-4 w-4 text-[#168a4a] shrink-0" />
              ) : (
                <File className="h-4 w-4 text-[#3f5847] shrink-0" />
              )}
              <div className="min-w-0 overflow-hidden">
                <a
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={m.label}
                  className="block max-w-full truncate text-sm text-slate-950 transition-colors hover:text-[#168a4a]"
                >
                  {m.label}
                </a>
                <span className="text-[10px] text-[#6f8274]">{formatBytes(m.sizeBytes)}</span>
              </div>
              <a
                href={m.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-[#168a4a] transition-colors hover:text-[#11743d]"
                aria-label={`Open ${m.label}`}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open
              </a>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => removeMaterial.mutate({ campaignId, fileKey: m.fileKey })}
                  disabled={isBusy}
                  className="shrink-0 text-[#6f8274] opacity-0 transition-opacity hover:text-red-400 disabled:opacity-30 group-hover:opacity-100"
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
            className={`flex w-full max-w-full min-w-0 flex-col items-center gap-2 overflow-hidden rounded-lg border-2 border-dashed p-4 text-center transition-colors cursor-pointer
              ${dragOver
                ? "border-[#168a4a] bg-[#168a4a]/5"
                : "border-[#9db8a4] hover:border-[#6f8274] bg-transparent"
              }
              ${isBusy ? "opacity-50 cursor-not-allowed" : ""}
            `}
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 text-[#168a4a] animate-spin" />
            ) : (
              <Upload className="h-5 w-5 text-[#6f8274]" />
            )}
            <span className="max-w-full break-words text-xs text-[#52665a] [overflow-wrap:anywhere]">
              {uploading ? "Uploading…" : "Drop a file or click to upload"}
            </span>
            <span className="max-w-full break-words text-[10px] text-[#8fa095] [overflow-wrap:anywhere]">PDF, TXT, MD, CSV · max 16 MB</span>
          </button>
        </>
      )}

      {materials.length === 0 && readOnly && (
        <p className="text-xs text-[#6f8274] italic">No uploaded source materials for this campaign.</p>
      )}
    </div>
  );
}
