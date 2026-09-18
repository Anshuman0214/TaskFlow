import { apiClient } from "./client";
import { setAccessToken } from "./authToken";
import type { ApiResponse } from "./types";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export const register = async (input: RegisterInput): Promise<string> => {
  const res = await apiClient.post<ApiResponse<undefined>>("/auth/register", input);
  return res.data.message;
};

export const verifyEmail = async (token: string): Promise<string> => {
  const res = await apiClient.post<ApiResponse<undefined>>("/auth/verify-email", { token });
  return res.data.message;
};

export const login = async (input: LoginInput): Promise<AuthUser> => {
  const res = await apiClient.post<ApiResponse<{ accessToken: string; user: AuthUser }>>(
    "/auth/login",
    input,
  );
  setAccessToken(res.data.data.accessToken);
  return res.data.data.user;
};

export const logout = async (): Promise<void> => {
  await apiClient.post("/auth/logout");
  setAccessToken(null);
};

export const logoutAll = async (): Promise<void> => {
  await apiClient.post("/auth/logout-all");
  setAccessToken(null);
};

export const forgotPassword = async (email: string): Promise<string> => {
  const res = await apiClient.post<ApiResponse<undefined>>("/auth/forgot-password", { email });
  return res.data.message;
};

export const resetPassword = async (token: string, newPassword: string): Promise<string> => {
  const res = await apiClient.post<ApiResponse<undefined>>("/auth/reset-password", {
    token,
    newPassword,
  });
  return res.data.message;
};

export const getCurrentUser = async (): Promise<AuthUser> => {
  const res = await apiClient.get<ApiResponse<{ user: AuthUser }>>("/auth/me");
  return res.data.data.user;
};
