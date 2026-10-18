"use client";

import * as React from "react";
import axios from "axios";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDown, ArrowDownUp, ArrowUp, CheckCircle2, ChevronLeft,
  ChevronRight, CircleX, MinusCircle, Pencil, RotateCw, Search,
  Trash2, LoaderCircle,
} from "lucide-react";
import { toast } from "sonner";
import { privateApi } from "@/src/api/private";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

const STATUSES = ["pending", "active", "inactive", "locked", "suspended"] as const;
type UserStatus = (typeof STATUSES)[number];
const SORT_PAIRS = {
  name: ["name_asc", "name_desc"],
  username: ["username_asc", "username_desc"],
  email: ["email_asc", "email_desc"],
  phone: ["phone_asc", "phone_desc"],
  role: ["role_asc", "role_desc"],
  emailVerified: ["email_verified_asc", "email_verified_desc"],
  phoneVerified: ["phone_verified_asc", "phone_verified_desc"],
  status: ["status_asc", "status_desc"],
  created: ["oldest", "newest"],
} as const;
type SortKey = (typeof SORT_PAIRS)[keyof typeof SORT_PAIRS][number];
const ALL_SORTS = Object.values(SORT_PAIRS).flat() as SortKey[];
// Change to true only after backend FindUsersQueryDto and findAll support
// all extended sort keys (including role_asc/role_desc) with correct pagination.
const ENABLE_EXTENDED_SORT = false;
const BACKEND_SORT_FIELDS = new Set<keyof typeof SORT_PAIRS>([
  "name", "username", "created",
]);

type Role = { id: string; code: string; name: string };
type User = {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  address?: string | null;
  status: UserStatus;
  roles: Role[];
  // undefined = backend chưa gửi dữ liệu, null = chưa xác minh
  emailVerifiedAt?: string | null;
  phoneVerifiedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};
type Pagination = { page: number; limit: number; total: number; totalPages: number };
type UsersResponse = { items: User[]; pagination: Pagination };
type QueryKey = "page" | "limit" | "sort" | "status" | "q" | "roleId";
type Changes = Partial<Record<QueryKey, string | null>>;
type EditForm = Pick<User, "username" | "status"> & {
  firstName: string; lastName: string; email: string; phone: string; address: string;
};

const textWeight = "font-normal";

function parsePage(input: string | null) {
  if (!input || !/^[1-9]\d*$/.test(input)) return 1;
  const value = Number(input);
  return Number.isSafeInteger(value) ? value : 1;
}
function parseLimit(input: string | null) {
  const value = Number(input);
  return [10, 20, 50, 100].includes(value) ? value : 20;
}
function readableError(err: unknown, fallback: string) {
  if (!axios.isAxiosError(err)) return fallback;
  const message: unknown = err.response?.data?.message;
  return typeof message === "string" && message.length < 180 ? message : fallback;
}
function isUser(value: unknown): value is User {
  return !!value && typeof value === "object" && "id" in value &&
    typeof value.id === "string" && "username" in value &&
    typeof value.username === "string" && "roles" in value &&
    Array.isArray(value.roles);
}
function fullName(user: User) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username;
}
function toForm(user: User): EditForm {
  return {
    username: user.username,
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    email: user.email ?? "",
    phone: user.phone ?? "",
    address: user.address ?? "",
    status: user.status,
  };
}

function IconTip({ label, children, disabled, onClick, destructive = false }: {
  label: string; children: React.ReactNode; disabled?: boolean;
  onClick?: () => void; destructive?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button" variant="ghost" size="icon"
            className={`size-8 rounded-lg font-normal ${destructive ? "hover:bg-red-50 hover:text-red-700" : ""}`}
            aria-label={label} disabled={disabled} onClick={onClick}
          >{children}</Button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function Verification({ value, label }: { value: string | null | undefined; label: string }) {
  const verified = typeof value === "string" && value.length > 0;
  const unknown = value === undefined;
  return (
    <Tooltip>
      <TooltipTrigger
        className="inline-flex rounded-full p-1 outline-offset-2"
        aria-label={`${label}: ${unknown ? "chưa có dữ liệu" : verified ? "đã xác minh" : "chưa xác minh"}`}
      >
        {unknown ? <MinusCircle className="size-4 text-neutral-400" /> :
          verified ? <CheckCircle2 className="size-4 text-emerald-600" /> :
            <CircleX className="size-4 text-red-600" />}
      </TooltipTrigger>
      <TooltipContent>{label}: {unknown ? "Backend chưa trả trạng thái" : verified ? "Đã xác minh" : "Chưa xác minh"}</TooltipContent>
    </Tooltip>
  );
}

function SortButton({ label, field, sort, onSort }: {
  label: string; field: keyof typeof SORT_PAIRS; sort: SortKey;
  onSort: (field: keyof typeof SORT_PAIRS) => void;
}) {
  const [asc, desc] = SORT_PAIRS[field];
  const current = sort === asc || sort === desc;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button" onClick={() => onSort(field)}
            aria-label={`Sắp xếp ${label}: ${sort === asc ? "giảm dần" : "tăng dần"}`}
            aria-pressed={current}
            className="inline-flex w-full items-center justify-between gap-2 rounded-md px-1 py-2 text-left font-normal hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-neutral-900"
          >
            <span>{label}</span>
            {sort === asc ? <ArrowUp className="size-3.5" /> : sort === desc ?
              <ArrowDown className="size-3.5" /> : <ArrowDownUp className="size-3.5 opacity-50" />}
          </button>
        }
      />
      <TooltipContent>Bấm để sắp xếp tăng / giảm trên toàn bộ kết quả</TooltipContent>
    </Tooltip>
  );
}

function UserTableSkeleton({ rows = 8 }: { rows?: number }) {
  return <>{Array.from({ length: rows }, (_, i) => (
    <TableRow key={i} className="h-14">
      {Array.from({ length: 10 }, (_, j) => (
        <TableCell key={j} className="border-r border-neutral-100 last:border-r-0">
          <Skeleton className="h-4 w-full max-w-36 rounded-md" />
        </TableCell>
      ))}
    </TableRow>
  ))}</>;
}

export function UsersAdmin() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const page = parsePage(searchParams.get("page"));
  const limit = parseLimit(searchParams.get("limit"));
  const rawSort = searchParams.get("sort");
  const rawSortAllowed = ALL_SORTS.includes(rawSort as SortKey) && (
    ENABLE_EXTENDED_SORT ||
    ["newest", "oldest", "username_asc", "username_desc", "name_asc", "name_desc"].includes(rawSort ?? "")
  );
  const sort: SortKey = rawSortAllowed ? rawSort as SortKey : "newest";
  const rawStatus = searchParams.get("status");
  const status: UserStatus = STATUSES.includes(rawStatus as UserStatus) ? rawStatus as UserStatus : "active";
  const q = (searchParams.get("q") ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
  const rawRoleId = searchParams.get("roleId") ?? "";
  const roleId = /^[1-9]\d*$/.test(rawRoleId) ? rawRoleId : "";

  const [searchInput, setSearchInput] = React.useState(q);
  const [roleInput, setRoleInput] = React.useState(roleId);
  const [data, setData] = React.useState<UsersResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [reload, setReload] = React.useState(0);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [editUser, setEditUser] = React.useState<User | null>(null);
  const [editForm, setEditForm] = React.useState<EditForm | null>(null);
  const [editLoading, setEditLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<User | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const updateQuery = React.useCallback((changes: Changes, mode: "push" | "replace" = "replace") => {
    const params = new URLSearchParams(queryString);
    Object.entries(changes).forEach(([key, value]) => {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    });
    const qs = params.toString();
    if (qs === queryString) return;
    const target = qs ? `${pathname}?${qs}` : pathname;
    if (mode === "push") router.push(target, { scroll: false });
    else router.replace(target, { scroll: false });
  }, [queryString, pathname, router]);

  // Browser Back/Forward restores search and role inputs.
  React.useEffect(() => setSearchInput(q), [q]);
  React.useEffect(() => setRoleInput(roleId), [roleId]);
  React.useEffect(() => {
    const nextQ = searchInput.trim().replace(/\s+/g, " ").slice(0, 120);
    const nextRole = roleInput.trim();
    if (nextRole && !/^[1-9]\d*$/.test(nextRole)) return;
    if (q === nextQ && roleId === nextRole) return;
    const timer = setTimeout(() => updateQuery({ q: nextQ || null, roleId: nextRole || null, page: null }), 450);
    return () => clearTimeout(timer);
  }, [q, roleId, searchInput, roleInput, updateQuery]);

  React.useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    (async () => {
      try {
        const result = await privateApi.get<UsersResponse>("/users", {
          params: { page, limit, sort, status, q: q || undefined, roleId: roleId || undefined },
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (!Array.isArray(result?.items) || !result.pagination ||
            typeof result.pagination.totalPages !== "number") {
          throw new Error("API /users không trả về dữ liệu phân trang hợp lệ");
        }
        setData(result);
        if (page > Math.max(1, result.pagination.totalPages)) {
          updateQuery({ page: result.pagination.totalPages > 1
            ? String(result.pagination.totalPages) : null });
        }
      } catch (err) {
        if (controller.signal.aborted || axios.isCancel(err)) return;
        setData(null);
        const message = readableError(err, "Không tải được danh sách người dùng.");
        setError(message);
        toast.error(message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [page, limit, sort, status, q, roleId, reload, updateQuery]);

  React.useEffect(() => {
    if (!editId) return;
    const controller = new AbortController();
    setEditLoading(true);
    setEditUser(null);
    setEditForm(null);
    (async () => {
      try {
        const user = await privateApi.get<User>(`/users/${encodeURIComponent(editId)}`, { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (!isUser(user) || user.id !== editId) throw new Error("GET /users/:id chưa trả về User chi tiết hợp lệ");
        setEditUser(user);
        setEditForm(toForm(user));
      } catch (err) {
        if (controller.signal.aborted || axios.isCancel(err)) return;
        toast.error(readableError(err, "Không lấy được thông tin người dùng. Kiểm tra GET /users/:id."));
      } finally {
        if (!controller.signal.aborted) setEditLoading(false);
      }
    })();
    return () => controller.abort();
  }, [editId]);

  function changeSort(field: keyof typeof SORT_PAIRS) {
    const [asc, desc] = SORT_PAIRS[field];
    if (!ENABLE_EXTENDED_SORT && !BACKEND_SORT_FIELDS.has(field)) {
      toast.error("Backend chưa hỗ trợ sắp xếp cột này trên toàn bộ dữ liệu.");
      return;
    }
    updateQuery({ sort: sort === asc ? desc : asc, page: null });
  }
  function changePage(next: number) {
    const pages = data?.pagination.totalPages ?? 0;
    if (next < 1 || next > pages) return;
    updateQuery({ page: next === 1 ? null : String(next) }, "push");
  }
  function patchForm(key: keyof EditForm, value: string) {
    setEditForm(prev => prev ? { ...prev, [key]: value } : prev);
  }
  async function saveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editForm || !editUser || saving) return;
    const username = editForm.username.trim();
    if (!username || username.length > 100) return toast.error("Username phải có 1–100 ký tự.");
    if (editForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) return toast.error("Email không hợp lệ.");
    if (editForm.phone && !/^\+?[0-9]{9,20}$/.test(editForm.phone)) return toast.error("Số điện thoại không hợp lệ.");
    setSaving(true);
    try {
      // Không gửi password, roles, verification: chỉ backend được quản lý chúng.
      const payload = {
        username,
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        // DTO hiện tại không hỗ trợ xóa email/phone bằng chuỗi rỗng.
        ...(editForm.email.trim() ? { email: editForm.email.trim() } : {}),
        ...(editForm.phone.trim() ? { phone: editForm.phone.trim() } : {}),
        address: editForm.address.trim(),
        status: editForm.status,
      };
      const updated = await privateApi.patch<User>(`/users/${encodeURIComponent(editUser.id)}`, payload);
      if (!isUser(updated) || updated.id !== editUser.id) {
        throw new Error("PATCH /users/:id chưa trả về User đã cập nhật; không xác nhận thành công.");
      }
      toast.success("Đã cập nhật người dùng.");
      setEditId(null);
      setReload(x => x + 1);
    } catch (err) {
      toast.error(readableError(err, "Cập nhật thất bại hoặc backend chưa triển khai PATCH."));
    } finally { setSaving(false); }
  }
  async function disableUser() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      // Hợp đồng backend: DELETE thực hiện soft-disable và trả {id, status:'inactive'}.
      const result = await privateApi.delete<{ id: string; status: UserStatus }>(
        `/users/${encodeURIComponent(deleteTarget.id)}`,
      );
      if (result?.id !== deleteTarget.id || result.status !== "inactive") {
        throw new Error("DELETE /users/:id chưa trả về xác nhận vô hiệu hóa hợp lệ.");
      }
      toast.success("Đã vô hiệu hóa người dùng.");
      setDeleteTarget(null);
      setReload(x => x + 1);
    } catch (err) {
      toast.error(readableError(err, "Thao tác thất bại hoặc backend chưa hỗ trợ DELETE."));
    } finally { setDeleting(false); }
  }

  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages ?? 0;
  const columns: { label: string; field?: keyof typeof SORT_PAIRS; width: string }[] = [
    { label: "Name", field: "name", width: "min-w-44" },
    { label: "Username", field: "username", width: "min-w-36" },
    { label: "Email", field: "email", width: "min-w-56" },
    { label: "Phone", field: "phone", width: "min-w-36" },
    { label: "Email verified", field: "emailVerified", width: "min-w-32" },
    { label: "Phone verified", field: "phoneVerified", width: "min-w-32" },
    { label: "Role", field: "role", width: "min-w-36" },
    { label: "Status", field: "status", width: "min-w-28" },
    { label: "Created", field: "created", width: "min-w-32" },
    { label: "Action", width: "w-24" },
  ];

  return (
    <TooltipProvider>
      <section className={`flex h-[calc(100dvh-7rem)] min-h-0 min-w-0 flex-col gap-3 p-3 text-neutral-950 sm:p-4 ${textWeight}`}>
        <header className="flex shrink-0 items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Users</h1>
            <p className="mt-0.5 text-sm font-light text-neutral-500">Manage accounts, verification and access permissions.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-normal sm:block">
              {loading && !data ? "Đang tải..." : `${pagination?.total ?? 0} users`}
            </span>
            <IconTip label="Làm mới danh sách" onClick={() => setReload(x => x + 1)} disabled={loading}>
              <RotateCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            </IconTip>
          </div>
        </header>

        <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-white p-2.5 shadow-sm">
          <div className="relative min-w-44 flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
            <Input value={searchInput} onChange={e => setSearchInput(e.target.value)}
              placeholder="Search name, username, email..." aria-label="Tìm kiếm người dùng"
              className="h-9 rounded-lg pl-9 font-normal" />
          </div>
          <select aria-label="Status" value={status} className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-normal"
            onChange={e => updateQuery({ status: e.target.value === "active" ? null : e.target.value, page: null })}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <Input value={roleInput} onChange={e => setRoleInput(e.target.value)} placeholder="Role ID"
            inputMode="numeric" aria-label="Role ID" className="h-9 w-25 rounded-lg font-normal" />
          <span className="hidden text-xs font-light text-neutral-500 lg:block">Click column headers to sort</span>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          {/* Table container owns both vertical and horizontal scrolling. */}
          <div className="min-h-0 min-w-0 flex-1 overflow-auto [scrollbar-gutter:stable] [&_[data-slot=table-container]]:overflow-visible">
            <Table className="min-w-[1340px] border-separate border-spacing-0 text-sm font-normal">
              <TableHeader className="sticky top-0 z-10 bg-neutral-50 shadow-[0_1px_0_#e5e5e5]">
                <TableRow className="hover:bg-neutral-50">
                  {columns.map(c => <TableHead key={c.label} scope="col" className={`${c.width} h-11 border-r border-neutral-200 px-3 font-normal text-neutral-700 last:border-r-0`}>
                    {c.field ? <SortButton field={c.field} label={c.label} sort={sort} onSort={changeSort} /> : <span className="px-1">{c.label}</span>}
                  </TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? <UserTableSkeleton /> : error ? <TableRow><TableCell colSpan={10} className="h-36 text-center font-light text-neutral-600">{error}</TableCell></TableRow> :
                  data?.items.length === 0 ? <TableRow><TableCell colSpan={10} className="h-36 text-center font-light text-neutral-500">Không tìm thấy người dùng.</TableCell></TableRow> :
                  data?.items.map(user => (
                    <TableRow key={user.id} className="h-14 border-b border-neutral-100 hover:bg-neutral-50/70">
                      <TableCell className="max-w-55 truncate border-r border-neutral-100 font-normal" title={fullName(user)}>{fullName(user)}</TableCell>
                      <TableCell className="max-w-44 truncate border-r border-neutral-100" title={user.username}>{user.username}</TableCell>
                      <TableCell className="max-w-60 truncate border-r border-neutral-100" title={user.email ?? ""}>{user.email ?? "—"}</TableCell>
                      <TableCell className="border-r border-neutral-100">{user.phone ?? "—"}</TableCell>
                      <TableCell className="border-r border-neutral-100 text-center"><Verification label="Email" value={user.emailVerifiedAt} /></TableCell>
                      <TableCell className="border-r border-neutral-100 text-center"><Verification label="Điện thoại" value={user.phoneVerifiedAt} /></TableCell>
                      <TableCell className="max-w-44 truncate border-r border-neutral-100" title={user.roles.map(r => r.name).join(", ")}>{user.roles.map(r => r.name).join(", ") || "—"}</TableCell>
                      <TableCell className="border-r border-neutral-100 capitalize">{user.status}</TableCell>
                      <TableCell className="border-r border-neutral-100">{user.createdAt ? new Date(user.createdAt).toLocaleDateString("vi-VN") : "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <IconTip label={`Sửa ${user.username}`} onClick={() => setEditId(user.id)}><Pencil className="size-4" /></IconTip>
                          <IconTip label={`Vô hiệu hóa ${user.username}`} onClick={() => setDeleteTarget(user)} destructive><Trash2 className="size-4" /></IconTip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
          <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-neutral-200 bg-white px-3 py-3">
            <span className="text-sm font-normal text-neutral-600">Total: {pagination?.total ?? 0} users</span>
            <div className="flex items-center gap-2">
              <label htmlFor="users-page-limit" className="text-xs font-light text-neutral-500">Rows</label>
              <select id="users-page-limit" aria-label="Rows per page" value={limit}
                className="h-8 rounded-lg border border-neutral-200 bg-white px-2 text-sm font-normal"
                onChange={e => updateQuery({ limit: e.target.value === "20" ? null : e.target.value, page: null })}>
                {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="min-w-16 text-center text-sm font-normal">{page} / {Math.max(1, totalPages)}</span>
              <IconTip label="Previous page" disabled={loading || page <= 1} onClick={() => changePage(page - 1)}><ChevronLeft className="size-4" /></IconTip>
              <IconTip label="Next page" disabled={loading || page >= totalPages} onClick={() => changePage(page + 1)}><ChevronRight className="size-4" /></IconTip>
            </div>
          </footer>
        </div>
      </section>

      <Dialog open={!!editId} onOpenChange={open => { if (!open && !saving) setEditId(null); }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-2xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit user</DialogTitle>
            <DialogDescription className="font-light">Dữ liệu được tải lại từ GET /api/users/:id trước khi chỉnh sửa.</DialogDescription>
          </DialogHeader>
          {editLoading ? <div className="grid grid-cols-2 gap-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div> :
            !editForm ? <p className="text-sm font-light">Không tải được dữ liệu chi tiết. Đóng và thử lại sau khi backend đã hỗ trợ GET /users/:id.</p> :
            <form id="user-edit-form" onSubmit={saveEdit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {([
                ["username", "Username"], ["firstName", "First name"], ["lastName", "Last name"],
                ["email", "Email"], ["phone", "Phone"], ["address", "Address"],
              ] as const).map(([key, label]) => <label key={key} className="space-y-1 text-xs font-normal">
                <span>{label}</span>
                <Input value={editForm[key]} onChange={e => patchForm(key, e.target.value)}
                  type={key === "email" ? "email" : "text"} disabled={saving} maxLength={key === "address" ? 255 : key === "phone" ? 20 : 100}
                  className="rounded-lg font-normal" />
              </label>)}
              <label className="space-y-1 text-xs font-normal">
                <span>Status</span>
                <select value={editForm.status} disabled={saving} onChange={e => patchForm("status", e.target.value)}
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white px-2 font-normal">
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <div className="self-end text-xs font-light text-neutral-500">Roles: {editUser?.roles.map(r => r.name).join(", ") || "—"} (read-only)</div>
            </form>}
          <DialogFooter>
            <Button variant="outline" className="font-normal" disabled={saving} onClick={() => setEditId(null)}>Cancel</Button>
            <Button className="font-normal" type="submit" form="user-edit-form" disabled={saving || editLoading || !editForm}>
              {saving ? <LoaderCircle className="size-4 animate-spin" /> : null} Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open && !deleting) setDeleteTarget(null); }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">Vô hiệu hóa tài khoản?</AlertDialogTitle>
            <AlertDialogDescription className="font-light">Tài khoản {deleteTarget?.username} sẽ chuyển sang inactive và không thể đăng nhập. Đây là soft-delete, không xóa dữ liệu lịch sử.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" disabled={deleting} className="font-normal" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button disabled={deleting} className="bg-neutral-950 font-normal text-white hover:bg-neutral-800" onClick={() => void disableUser()}>
              {deleting ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Confirm
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
