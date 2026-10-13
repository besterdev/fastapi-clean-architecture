import axios, {
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import type { ApiError, User } from "@/lib/types";

export class RequestError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export const http = axios.create({
  baseURL: "/api/",
  timeout: 15000,
  withCredentials: true,
});
let refreshing: Promise<AxiosResponse<User>> | null = null;
type RetryConfig = InternalAxiosRequestConfig & { sessionRetried?: boolean };

function refreshSession() {
  refreshing ??= http.post<User>("users/refresh-token", {}).finally(() => {
    refreshing = null;
  });
  return refreshing;
}

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as RetryConfig | undefined;
    const protectedRequest =
      config?.url === "users/profile" || config?.url?.startsWith("data/");
    if (
      error.response?.status === 401 &&
      config &&
      protectedRequest &&
      !config.sessionRetried
    ) {
      config.sessionRetried = true;
      try {
        await refreshSession();
        return http.request(config);
      } catch (refreshError) {
        if (
          axios.isAxiosError(refreshError) &&
          refreshError.response?.status === 401
        ) {
          window.dispatchEvent(new Event("session-expired"));
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);

export async function api<T>(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  try {
    const response =
      path === "users/refresh-token"
        ? await refreshSession()
        : await http.request<T>({
            url: path,
            method: body === undefined ? "GET" : "POST",
            data: body,
            signal,
          });
    return response.data as T;
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    if (axios.isAxiosError<ApiError>(error)) {
      const result = error.response?.data;
      const details = result?.errors
        ?.map((e) => `${e.loc.slice(1).join(".")}: ${e.message}`)
        .join(" · ");
      throw new RequestError(
        details || result?.message || "Unable to connect. Please try again.",
        error.response?.status || 0,
      );
    }
    throw error;
  }
}
