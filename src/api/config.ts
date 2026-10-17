// src/lib/api/config.ts
export const API_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api',
  timeout: 15_000,
};

export interface ApiResponse<T> {
  success: true;
  statusCode: number;
  code: number;
  message: string;
  data: T;
  timestamp: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
}

const STORAGE_KEY = 'sale_auth_tokens';

/** Dùng trên trình duyệt (Client Components), không dùng trong Server Components. */
export function getTokens(): AuthTokens | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const value: unknown = JSON.parse(raw);
    if (
      typeof value !== 'object' ||
      value === null ||
      !('accessToken' in value) ||
      typeof value.accessToken !== 'string' ||
      !('refreshToken' in value) ||
      typeof value.refreshToken !== 'string' ||
      !('tokenType' in value) ||
      value.tokenType !== 'Bearer'
    ) {
      return null;
    }

    return value as AuthTokens;
  } catch {
    return null;
  }
}

export function setTokens(tokens: AuthTokens): void {
  if (typeof window === 'undefined') {
    throw new Error('Token chỉ được lưu trong Client Components.');
  }
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

export function clearTokens(): void {
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(STORAGE_KEY);
  }
}
