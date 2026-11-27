import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectVersionsCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { Env } from "./env.js";

export const s3 = new S3Client({
  endpoint: Env.S3_ENDPOINT,
  region: Env.S3_REGION,
  credentials: {
    accessKeyId: Env.S3_ACCESS_KEY_ID,
    secretAccessKey: Env.S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

const Bucket = Env.S3_BUCKET;
const OBJECT_ID = /^[0-9a-f]{24}$/;

export function blobKey(
  userId: string,
  itemId: string,
  variant: string,
): string {
  return `u/${userId}/${itemId}/${variant}`;
}

function itemPrefix(userId: string, itemId: string): string {
  if (!OBJECT_ID.test(userId) || !OBJECT_ID.test(itemId)) {
    throw new Error("Refusing to build a prefix from malformed ids");
  }
  return `u/${userId}/${itemId}/`;
}

function userPrefix(userId: string): string {
  if (!OBJECT_ID.test(userId)) {
    throw new Error("Refusing to build a prefix from a malformed id");
  }
  return `u/${userId}/`;
}

/** Stores ciphertext only: callers encrypt before calling. */
export async function putBlob(key: string, body: Buffer): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket,
      Key: key,
      Body: body,
      ContentType: "application/octet-stream",
    }),
  );
}

export async function getBlob(key: string): Promise<Buffer> {
  const res = await s3.send(new GetObjectCommand({ Bucket, Key: key }));
  if (!res.Body) throw new Error("Empty object body");
  return Buffer.from(await res.Body.transformToByteArray());
}

/**
 * Permanently deletes every object version under a prefix. B2 keeps file
 * versions, so a plain DeleteObject would only hide the bytes.
 */
async function deletePrefix(prefix: string): Promise<number> {
  let deleted = 0;
  for (;;) {
    const res = await s3.send(
      new ListObjectVersionsCommand({ Bucket, Prefix: prefix, MaxKeys: 1000 }),
    );
    const targets = [...(res.Versions ?? []), ...(res.DeleteMarkers ?? [])]
      .filter((v) => v.Key?.startsWith(prefix))
      .map((v) => ({ Key: v.Key as string, VersionId: v.VersionId }));
    if (targets.length === 0) return deleted;
    const out = await s3.send(
      new DeleteObjectsCommand({
        Bucket,
        Delete: { Objects: targets, Quiet: true },
      }),
    );
    const failed = (out.Errors ?? []).filter((e) => e.Code !== "NoSuchKey");
    if (failed.length > 0) {
      throw new Error(`Failed to delete ${failed.length} object(s)`);
    }
    deleted += targets.length;
  }
}

export function deleteItemBlobs(
  userId: string,
  itemId: string,
): Promise<number> {
  return deletePrefix(itemPrefix(userId, itemId));
}

export function deleteUserBlobs(userId: string): Promise<number> {
  return deletePrefix(userPrefix(userId));
}
