export type ServiceStatus = "connected" | "disconnected";

export interface HealthStatus {
  status: "ok" | "degraded";
  uptime: number;
  timestamp: string;
  services: {
    database: ServiceStatus;
    redis: ServiceStatus;
  };
}

export interface ApiInfo {
  name: string;
  version: string;
  environment: string;
}
