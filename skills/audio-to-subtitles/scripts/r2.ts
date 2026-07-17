import { createHash, createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

export type R2UploadResult = {
  url: string;
  key: string;
  bucket: string;
};

function sha256Hex(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest();
}

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    ".aac": "audio/aac",
    ".avi": "video/x-msvideo",
    ".flac": "audio/flac",
    ".flv": "video/x-flv",
    ".m4a": "audio/mp4",
    ".m4v": "video/mp4",
    ".mkv": "video/x-matroska",
    ".mov": "video/quicktime",
    ".mp3": "audio/mpeg",
    ".mp4": "video/mp4",
    ".mpeg": "video/mpeg",
    ".mpg": "video/mpeg",
    ".ogg": "audio/ogg",
    ".opus": "audio/opus",
    ".ts": "video/mp2t",
    ".wav": "audio/wav",
    ".webm": "video/webm",
    ".wmv": "video/x-ms-wmv",
  };
  return map[ext] ?? "application/octet-stream";
}

function encodePathForS3(key: string): string {
  return key
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

export async function uploadToR2(filePath: string, objectKey: string): Promise<R2UploadResult> {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const accountId = process.env.R2_ACCOUNT_ID;
  const bucket = process.env.R2_BUCKET;
  const publicUrl = process.env.R2_PUBLIC_BASE_URL || process.env.R2_PUBLIC_URL;
  const endpointOverride = process.env.R2_ENDPOINT;

  if (!accessKeyId || !secretAccessKey || !accountId || !bucket) {
    throw new Error(
      "R2 credentials are missing. Set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID, and R2_BUCKET."
    );
  }
  if (!publicUrl) {
    throw new Error("R2 public URL is missing. Set R2_PUBLIC_BASE_URL or R2_PUBLIC_URL so MediaKit can access uploaded media.");
  }

  const fileData = await readFile(filePath);
  const contentType = getContentType(filePath);
  const endpointUrl = endpointOverride ? new URL(endpointOverride.replace(/\/$/, "")) : null;
  const host = endpointUrl?.host || `${accountId}.r2.cloudflarestorage.com`;
  const endpoint = endpointUrl ? `${endpointUrl.protocol}//${endpointUrl.host}` : `https://${host}`;
  const region = "auto";
  const service = "s3";

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "").slice(0, 15) + "Z";
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(fileData);
  const canonicalUri = `/${bucket}/${encodePathForS3(objectKey)}`;
  const canonicalHeaders =
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = [
    "PUT",
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const kDate = hmacSha256(Buffer.from(`AWS4${secretAccessKey}`), dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  const kSigning = hmacSha256(kService, "aws4_request");
  const signature = hmacSha256(kSigning, stringToSign).toString("hex");

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(`${endpoint}/${bucket}/${encodePathForS3(objectKey)}`, {
    method: "PUT",
    headers: {
      Authorization: authorization,
      "Content-Type": contentType,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
    },
    body: fileData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`R2 upload failed: ${response.status} ${response.statusText}\n${text}`);
  }

  const base = publicUrl.replace(/\/$/, "");
  return {
    url: `${base}/${encodePathForS3(objectKey)}`,
    key: objectKey,
    bucket,
  };
}
