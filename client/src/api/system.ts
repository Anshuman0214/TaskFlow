import { apiClient } from "./client";
import type { ApiResponse } from "./types";

export interface HealthStatus {
  status: "ok" | "degraded";
  uptime: number;
  timestamp: string;
  services: {
    database: "connected" | "disconnected";
    redis: "connected" | "disconnected";
  };
}

export interface ApiInfo {
  name: string;
  version: string;
  environment: string;
}

export const getHealth = async (): Promise<HealthStatus> => {
  const res = await apiClient.get<ApiResponse<HealthStatus>>("/system/health");
  return res.data.data;
};

export const getApiInfo = async (): Promise<ApiInfo> => {
  const res = await apiClient.get<ApiResponse<ApiInfo>>("/system/info");
  return res.data.data;
};
