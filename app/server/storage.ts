// S3-compatible storage helpers for source materials and generated artifacts.
// Uploads go directly through the S3 API; downloads return /manus-storage/{key}
// paths served by the existing 307 redirect proxy.

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type StorageConfig = {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
};

function cleanEnvValue(value: string | undefined) {
  return value?.trim() ?? "";
}

function getStorageConfig(): StorageConfig {
  const config = {
    bucket: cleanEnvValue(process.env.S3_BUCKET),
    region: cleanEnvValue(process.env.S3_REGION),
    accessKeyId: cleanEnvValue(process.env.S3_ACCESS_KEY_ID),
    secretAccessKey: cleanEnvValue(process.env.S3_SECRET_ACCESS_KEY),
    endpoint: cleanEnvValue(process.env.S3_ENDPOINT) || undefined,
  };
  const missing = [
    ["S3_BUCKET", config.bucket],
    ["S3_REGION", config.region],
    ["S3_ACCESS_KEY_ID", config.accessKeyId],
    ["S3_SECRET_ACCESS_KEY", config.secretAccessKey],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`Storage config missing: set ${missing.join(", ")}`);
  }

  return config;
}

function createS3Client(config: StorageConfig) {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: Boolean(config.endpoint),
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

function toStorageBody(data: Buffer | Uint8Array | string): NonNullable<PutObjectCommandInput["Body"]> {
  return data;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const config = getStorageConfig();
  const client = createS3Client(config);
  const key = appendHashSuffix(normalizeKey(relKey));

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: toStorageBody(data),
      ContentType: contentType,
    }),
  );

  return { key, url: `/manus-storage/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const config = getStorageConfig();
  const client = createS3Client(config);
  const key = normalizeKey(relKey);

  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }),
    { expiresIn: 300 },
  );
}

export async function storageDelete(relKey: string): Promise<void> {
  const config = getStorageConfig();
  const client = createS3Client(config);
  const key = normalizeKey(relKey);

  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }),
  );
}
