// src/lib/api/auth.ts
import { clearTokens, getTokens, setTokens, type AuthTokens } from './config';
import { privateApi, refreshAccessToken } from './private';
import { publicApi } from './public';

export interface LoginInput {
  username: string;
  password: string;
}

interface AuthMessage {
  message: string;
}

/** Dữ liệu principal trả về từ GET /api/auth/me sau khi NestJS xác thực session. */
export interface AuthUser {
  id: string;
  sid: string;
  username: string;
  roles: string[];
  permissions: string[];
}
export const PERMISSIONS = {
  USER_FIND_ALL: 'user.findAll',
  USER_CREATE: 'user.create',
  USER_READ: 'user.read',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
} as const;
const ROUTES: {
  pattern: RegExp;
  permissions: string[];
}[] = [
  {
    pattern: /^\/admin\/?$/,
    permissions: [],
  },
  {
    pattern: /^\/admin\/user\/?$/,
    permissions: [PERMISSIONS.USER_FIND_ALL],
  },
  // {
  //   pattern: /^\/admin\/user\/new\/?$/,
  //   permissions: [PERMISSIONS.USER_CREATE],
  // },
  // {
  //   pattern: /^\/admin\/user\/[^/]+\/edit\/?$/,
  //   permissions: [PERMISSIONS.USER_UPDATE],
  // },
  // {
  //   pattern: /^\/admin\/user\/[^/]+\/?$/,
  //   permissions: [PERMISSIONS.USER_READ],
  // },
];
export function canAccessRoute(
  user: AuthUser,
  pathname: string,
): boolean {
  const route = ROUTES.find((item) =>
    item.pattern.test(pathname),
  );

  // Không có cấu hình -> không cho vào.
  if (!route) return false;

  // Yêu cầu đầy đủ tất cả permission.
  return route.permissions.every((permission) =>
    hasPermission(user, permission),
  );
}

/** Quyền luôn do backend quyết định; helper này chỉ điều khiển UI. */
export function hasPermission(user: AuthUser, permission: string): boolean {
  return user.permissions.includes(permission);
}

/** Ví dụ với permission thực tế của Sale: user.findAll. */
export function getLandingRoute(user: AuthUser): string {
  if (hasPermission(user, 'user.findAll')) return '/admin/user';
  return '/dashboard'; // Trang chỉ yêu cầu đăng nhập, không hiển thị dữ liệu trái quyền.
}

export const authApi = {
  
  /** Luôn xác minh ở backend, không dùng JWT decode để suy ra quyền. */
  async me(): Promise<AuthUser> {
    return privateApi.get<AuthUser>('/auth/me');
  },

  /** Login và lưu tokens vào sessionStorage trong tab hiện tại. */
  async login(input: LoginInput): Promise<void> {
    const tokens = await publicApi.post<AuthTokens, LoginInput>('/auth/login', input);
    setTokens(tokens);
  },

  /** Refresh thủ công, sử dụng cùng single-flight với privateApi. */
  async refresh(): Promise<void> {
    await refreshAccessToken();
  },

  /** Logout phiên hiện tại; luôn xoá token cục bộ, kể cả khi API lỗi. */
  async logout(): Promise<void> {
    const refreshToken = getTokens()?.refreshToken;
    try {
      if (refreshToken) {
        await publicApi.post<AuthMessage, { refreshToken: string }>(
          '/auth/logout',
          { refreshToken },
        );
      }
    } finally {
      clearTokens();
    }
  },

  /** Logout tất cả thiết bị bằng access JWT hiện tại. */
  async logoutAll(): Promise<void> {
    try {
      await privateApi.post<AuthMessage>('/auth/logout-all');
    } finally {
      clearTokens();
    }
  },

  /** Chỉ kiểm tra có token; không khẳng định phiên còn hợp lệ ở backend. */
  hasSession(): boolean {
    return Boolean(getTokens()?.refreshToken);
  },
};
// dung cho check ui
// const canViewUsers = hasPermission(
//   user,
//   PERMISSIONS.USER_FIND_ALL,
// );