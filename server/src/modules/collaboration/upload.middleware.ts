import { Request, Response, NextFunction } from "express";
import multer, { MulterError } from "multer";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/AppError.js";

// Supported MIME types only, per Docs/ApiSpecifications.md's Upload Attachment
// business rules. Deliberately a fixed allowlist, not a config value — it has
// never needed to vary per deployment.
const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

// memoryStorage: the buffer goes straight to utils/storage.ts (Cloudinary or
// local disk) — multer never writes a temp file of its own.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(new AppError(`Unsupported file type: ${file.mimetype}`, 422, "VALIDATION_ERROR"));
      return;
    }
    callback(null, true);
  },
});

// Multer reports its own failures as MulterError, which the central error
// middleware would otherwise flatten to a 500.
export const uploadSingleFile = (req: Request, res: Response, next: NextFunction): void => {
  upload.single("file")(req, res, (error: unknown) => {
    if (error instanceof MulterError) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? `File exceeds the ${env.MAX_UPLOAD_BYTES} byte limit`
          : error.message;
      next(new AppError(message, 422, "VALIDATION_ERROR"));
      return;
    }

    next(error);
  });
};
