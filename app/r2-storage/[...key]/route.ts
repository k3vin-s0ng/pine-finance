import { NextRequest, NextResponse } from "next/server";
import { storageGetSignedUrl } from "@/app/server/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key } = await params;
  const relKey = key.join("/");

  if (!relKey) {
    return new NextResponse("Missing storage key", { status: 400 });
  }

  try {
    const url = await storageGetSignedUrl(relKey);
    return NextResponse.redirect(url, { status: 307 });
  } catch (error) {
    console.error("[StorageProxy] failed:", error);
    return new NextResponse("Storage proxy error", { status: 502 });
  }
}
