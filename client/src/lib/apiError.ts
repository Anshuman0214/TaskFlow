import { AxiosError } from "axios";
import type { FieldValues, UseFormSetError } from "react-hook-form";
import type { ApiErrorBody } from "../api/types";

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
    const body = error.response?.data as ApiErrorBody | undefined;
    if (body?.message) return body.message;
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
};

export const getFieldErrors = (error: unknown): { field: string; message: string }[] => {
  if (error instanceof AxiosError) {
    const body = error.response?.data as ApiErrorBody | undefined;
    return body?.error?.details ?? [];
  }
  return [];
};

// Maps a 422's per-field details back onto the form that submitted it, so a
// backend validation failure surfaces the same way a client-side one would.
export const applyServerFieldErrors = <T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): void => {
  for (const { field, message } of getFieldErrors(error)) {
    setError(field as never, { type: "server", message });
  }
};
