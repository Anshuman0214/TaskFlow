import { createContext } from "react";

export interface ToastContextValue {
  showToast: (message: string, tone?: "success" | "error") => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);
