import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { getAccessToken, setAccessToken } from "./authToken";

const baseURL = import.meta.env.VITE_API_URL;

export const apiClient = axios.create({ baseURL, withCredentials: true });

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }

  return config;
});

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = (): Promise<string | null> => {
  refreshPromise ??= axios
    .post<{ data: { accessToken: string } }>(`${baseURL}/auth/refresh`, null, {
      withCredentials: true,
    })
    .then((res) => {
      const token = res.data.data.accessToken;
      setAccessToken(token);
      return token;
    })
    .catch(() => {
      setAccessToken(null);
      return null;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableConfig | undefined;

    if (error.response?.status === 401 && config && !config._retried) {
      config._retried = true;
      const token = await refreshAccessToken();

      if (token) {
        config.headers.set("Authorization", `Bearer ${token}`);
        return apiClient(config);
      }
    }

    return Promise.reject(error);
  },
);
