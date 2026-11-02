import { SORTADMIN } from "@/lib/constants/sort.constant";
import { STATUSADMIN } from "@/lib/constants/status.constant";

// Status và sorting
export type UserStatus =
  (typeof STATUSADMIN.USER)[number];

export type SortKey =
  (typeof SORTADMIN.USER)[keyof typeof SORTADMIN.USER][number];

// Role
export type Role = {
  id: string;
  code: string;
  name: string;
};
    
// User
export type User = {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  address?: string | null;
  status: UserStatus;
  roleAssignments?: Role[] | null;
  parentId?: string | null;
  emailVerifiedAt?: string | null;
  phoneVerifiedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string | null;  
};

// Pagination
export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

// API response
export type UsersResponse = {
  items: User[];
  pagination: Pagination;
};

// URL query
export type QueryKey =
  | "page"
  | "limit"
  | "sort"
  | "status"
  | "q"
  | "roleId";

export type Changes = Partial<
  Record<QueryKey, string | null>
>;

// Form chỉnh sửa
export type EditForm =
  Pick<User, "username" | "status"> & {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
  };
