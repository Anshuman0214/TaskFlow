export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code?: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number, code?: string, details?: unknown) {
    super(message);

    this.statusCode = statusCode;
    if (code !== undefined) this.code = code;
    if (details !== undefined) this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}
