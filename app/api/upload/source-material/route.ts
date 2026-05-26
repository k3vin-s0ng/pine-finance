import { NextRequest, NextResponse } from "next/server";
import { sdk } from "@/app/server/_core/sdk";
import { storagePut } from "@/app/server/storage";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
]);

const MAX_SIZE_BYTES = 16 * 1024 * 1024;

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await sdk.authenticateRequest(req);
  } catch {
    user = null;
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!["recruiter", "manager", "admin"].includes(user.role)) {
    return NextResponse.json(
      { error: "Forbidden: only recruiters may upload source materials" },
      { status: 403 },
    );
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 415 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File exceeds 16 MB limit" }, { status: 413 });
  }

  const labelValue = formData.get("label");
  const label =
    typeof labelValue === "string" && labelValue.length > 0
      ? labelValue
      : file.name.replace(/\.[^/.]+$/, "");
  const ext = file.name.split(".").pop() ?? "bin";
  const fileKey = `source-materials/${user.id}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { key, url } = await storagePut(fileKey, buffer, file.type);

  return NextResponse.json({
    fileKey: key,
    url,
    label,
    mimeType: file.type,
    sizeBytes: file.size,
  });
}
