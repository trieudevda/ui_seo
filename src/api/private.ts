// src/lib/api/private.ts
import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import {
  API_CONFIG,
  clearTokens,
  getTokens,
  setTokens,
  type ApiResponse,
  type AuthTokens,
} from './config';
import { publicApi } from './public';

type RetryRequest = InternalAxiosRequestConfig & { _retry?: boolean };

const client = axios.create(API_CONFIG);
let refreshPromise: Promise<AuthTokens> | null = null;

/** Single-flight refresh: nhiều request 401 trong cùng tab chỉ refresh một lần. */
export function refreshAccessToken(): Promise<AuthTokens> {
  if (refreshPromise) return refreshPromise;

  const refreshToken = getTokens()?.refreshToken;
  if (!refreshToken) {
    return Promise.reject(new Error('Không có refresh token.'));
  }

  refreshPromise = (async () => {
    try {
      const tokens = await publicApi.post<AuthTokens, { refreshToken: string }>(
        '/auth/refresh',
        { refreshToken },
      );

      // Chặn một refresh đang chạy ghi đè phiên mới hoặc khôi phục phiên đã logout.
      if (getTokens()?.refreshToken !== refreshToken) {
        throw new Error('Phiên đăng nhập đã thay đổi.');
      }

      setTokens(tokens);
      return tokens;
    } catch (error) {
      // Không xoá phiên nếu chỉ lỗi mạng/5xx; chỉ xoá nếu token bị từ chối.
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      if (
        [400, 401, 403].includes(status ?? 0) &&
        getTokens()?.refreshToken === refreshToken
      ) {
        clearTokens();
      }
      throw error;
    }
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

client.interceptors.request.use((config) => {
  const token = getTokens()?.accessToken;
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  } else {
    config.headers.delete('Authorization');
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryRequest | undefined;
    if (!original || error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    original._retry = true;

    // Request gửi bằng token cũ, nhưng tab đã refresh xong: chỉ retry.
    const currentAccess = getTokens()?.accessToken;
    const sentAuth = original.headers.get('Authorization');
    if (currentAccess && sentAuth !== `Bearer ${currentAccess}`) {
      return client(original);
    }

    try {
      await refreshAccessToken();
      return client(original);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  },
);

/** Các endpoint cần JwtAuthGuard; trả trực tiếp response.data.data. */
export const privateApi = {
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await client.get<ApiResponse<T>>(url, config);
    return response.data.data;
  },

  async post<T, B = unknown>(
    url: string,
    body?: B,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await client.post<ApiResponse<T>>(url, body, config);
    return response.data.data;
  },

  async patch<T, B = unknown>(
    url: string,
    body?: B,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await client.patch<ApiResponse<T>>(url, body, config);
    return response.data.data;
  },

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await client.delete<ApiResponse<T>>(url, config);
    return response.data.data;
  },
};
