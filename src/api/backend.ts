'use client';

import 'client-only';
import axios, {
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

interface TokenResponse {
  accessToken: string;
}

type RetryConfig = InternalAxiosRequestConfig & {
  _retried?: boolean;
  _sessionVersion?: number;
  _sentToken?: string | null;
};

let accessToken: string | null = null;
let sessionVersion = 0;
let refreshPromise: Promise<string> | null = null;

const baseURL = process.env.NEXT_PUBLIC_API_URL;

const http = axios.create({
  baseURL,
  timeout: 15_000,
});

const authHttp = axios.create({
  baseURL: `${baseURL}/auth`,
  timeout: 15_000,
  withCredentials: true,
});

function requireBrowser() {
  if (typeof window === 'undefined') {
    throw new Error('Module này chỉ dùng trong Client Component.');
  }
}

function readToken(data: TokenResponse): string {
  if (typeof data?.accessToken !== 'string' || !data.accessToken) {
    throw new Error('API phải trả về accessToken.');
  }

  return data.accessToken;
}

function clearSession() {
  accessToken = null;
  sessionVersion += 1;
  refreshPromise = null;
}

function refreshAccessToken(): Promise<string> {
  requireBrowser();

  // Nhiều request cùng gặp 401 chỉ gọi refresh một lần.
  if (refreshPromise) return refreshPromise;

  const version = sessionVersion;

  const promise = authHttp
    .post<TokenResponse>('/refresh')
    .then(({ data }) => {
      if (version !== sessionVersion) {
        throw new Error('Phiên đăng nhập đã thay đổi.');
      }

      accessToken = readToken(data);
      return accessToken;
    })
    .catch((error: unknown) => {
      if (
        version === sessionVersion &&
        axios.isAxiosError(error) &&
        [401, 403].includes(error.response?.status ?? 0)
      ) {
        clearSession();
        window.dispatchEvent(new Event('auth:expired'));
      }

      throw error;
    })
    .finally(() => {
      if (refreshPromise === promise) {
        refreshPromise = null;
      }
    });

  refreshPromise = promise;
  return promise;
}

// Gắn Bearer token trước mỗi request.
http.interceptors.request.use((config: RetryConfig) => {
  requireBrowser();

  if (!baseURL) {
    throw new Error('Chưa cấu hình NEXT_PUBLIC_API_URL.');
  }

  // Chỉ nhận đường dẫn tương đối để tránh gửi token sang host khác.
  if (
    !config.url?.startsWith('/') ||
    config.url.startsWith('//') ||
    /[\\?#]/.test(config.url) ||
    config.baseURL !== baseURL
  ) {
    throw new Error(
      'Dùng đường dẫn như /products; truyền query bằng config.params.',
    );
  }

  if (
    config._retried &&
    config._sessionVersion !== sessionVersion
  ) {
    throw new Error('Phiên đăng nhập đã thay đổi.');
  }

  config._sessionVersion = sessionVersion;
  config._sentToken = accessToken;

  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  } else {
    config.headers.delete('Authorization');
  }

  return config;
});

// Access token hết hạn: refresh rồi thử lại tối đa một lần.
http.interceptors.response.use(
  (response) => response,

  async (error: unknown) => {
    if (!axios.isAxiosError(error)) throw error;

    const config = error.config as RetryConfig | undefined;

    if (
      error.response?.status !== 401 ||
      !config ||
      config._retried ||
      config._sessionVersion !== sessionVersion
    ) {
      throw error;
    }

    config._retried = true;

    // Nếu request khác đã refresh xong, dùng luôn token mới.
    if (!accessToken || config._sentToken === accessToken) {
      await refreshAccessToken();
    }

    if (config._sessionVersion !== sessionVersion) {
      throw error;
    }

    return http.request(config);
  },
);

// Trả trực tiếp response.data.
export const api = {
  async get<T>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return (await http.get<T>(url, config)).data;
  },

  async post<T, B = unknown>(
    url: string,
    body?: B,
    config?: AxiosRequestConfig<B>,
  ): Promise<T> {
    return (await http.post<T>(url, body, config)).data;
  },

  async patch<T, B = unknown>(
    url: string,
    body?: B,
    config?: AxiosRequestConfig<B>,
  ): Promise<T> {
    return (await http.patch<T>(url, body, config)).data;
  },

  async delete<T = void>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return (await http.delete<T>(url, config)).data;
  },
};

export const auth = {
  async login(credentials: {
    username: string;
    password: string;
  }): Promise<void> {
    requireBrowser();

    const { data } = await authHttp.post<TokenResponse>(
      '/login',
      credentials,
    );

    clearSession();
    accessToken = readToken(data);
  },

  // Gọi khi tải lại trang để lấy access token từ refresh cookie.
  async restoreSession(): Promise<void> {
    await refreshAccessToken();
  },

  async logout(): Promise<void> {
    requireBrowser();
    clearSession();

    await authHttp.post('/logout');
  },
};