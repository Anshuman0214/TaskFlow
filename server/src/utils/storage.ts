import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

export interface StoredFile {
  publicId: string;
  url: string;
}

const cloudName = env.CLOUDINARY_CLOUD_NAME;
const useCloudinary = cloudName !== undefined;

if (cloudName !== undefined) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: env.CLOUDINARY_API_KEY ?? "",
    api_secret: env.CLOUDINARY_API_SECRET ?? "",
  });
}

const localRoot = path.resolve(env.UPLOAD_DIR);

// Same env-gated shape as utils/mailer.ts: real Cloudinary when
// CLOUDINARY_CLOUD_NAME is set, local disk otherwise. Call sites never change.
// ponytail: local files are served straight off disk with no auth check —
// the URL is unguessable (uuid) but not access-controlled. Configure
// Cloudinary (or put a signed-URL proxy in front) before this goes public.
export const uploadFile = async (
  buffer: Buffer,
  originalFileName: string,
  mimeType: string,
  folder: string,
): Promise<StoredFile> => {
  if (useCloudinary) {
    const result = await new Promise<{ public_id: string; secure_url: string }>(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream({ folder, resource_type: "auto" }, (error, uploaded) => {
            if (error || !uploaded) {
              reject(error ?? new Error("Cloudinary upload returned no result"));
              return;
            }
            resolve(uploaded);
          })
          .end(buffer);
      },
    );

    return { publicId: result.public_id, url: result.secure_url };
  }

  const key = `${folder}/${randomUUID()}${path.extname(originalFileName)}`;
  const target = path.join(localRoot, key);

  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, buffer);

  logger.info("Stored attachment locally (Cloudinary not configured)", { key, mimeType });

  return { publicId: key, url: `/uploads/${key}` };
};

export const deleteFile = async (publicId: string): Promise<void> => {
  if (useCloudinary) {
    await cloudinary.uploader.destroy(publicId);
    return;
  }

  await unlink(path.join(localRoot, publicId)).catch((error: unknown) =>
    logger.warn("Local attachment already gone", { publicId, error }),
  );
};
