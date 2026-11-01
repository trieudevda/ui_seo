"use client";

import * as React from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  parseLimit,
  parsePage,
} from "@/lib/parsers/pagination.parser";
import { SORTADMIN } from "@/lib/constants/sort.constant";
import { Changes, SortKey, User, UserStatus } from "@/src/features/user/user.types";
import { useUsers } from "@/src/features/user/useUser";
import { IconTip, UsersTable } from "@/src/features/user/users-table";
import { EditUserDialog } from "@/src/features/user/edit-user-dialog";
import { DisableUserDialog } from "@/src/features/user/disable-user-dialog";
import {STATUSADMIN} from "@/lib/constants/status.constant";

const textWeight = "font-normal";

const ALL_SORTS =
  Object.values(SORTADMIN.USER).flat() as SortKey[];

// Chỉ bật khi backend hỗ trợ đầy đủ sort mở rộng.
const ENABLE_EXTENDED_SORT = false;

const BACKEND_SORT_FIELDS =
  new Set<keyof typeof SORTADMIN.USER>([
    "name",
    "username",
    "created",
  ]);

export function UsersAdmin() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const queryString = searchParams.toString();

  const page = parsePage(searchParams.get("page"));
  const limit = parseLimit(searchParams.get("limit"));

  const rawSort = searchParams.get("sort");

  const rawSortAllowed =
    ALL_SORTS.includes(rawSort as SortKey) &&
    (
      ENABLE_EXTENDED_SORT ||
      [
        "newest",
        "oldest",
        "username_asc",
        "username_desc",
        "name_asc",
        "name_desc",
      ].includes(rawSort ?? "")
    );

  const sort: SortKey = rawSortAllowed
    ? (rawSort as SortKey)
    : "newest";

  const rawStatus = searchParams.get("status");

  const status: UserStatus =
    STATUSADMIN.USER.includes(rawStatus as UserStatus)
      ? (rawStatus as UserStatus)
      : "active";

  const q = (searchParams.get("q") ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 120);

  const rawRoleId = searchParams.get("roleId") ?? "";

  const roleId = /^[1-9]\d*$/.test(rawRoleId)
    ? rawRoleId
    : "";

  const [searchInput, setSearchInput] =
    React.useState(q);

  const [roleInput, setRoleInput] =
    React.useState(roleId);

  const [editId, setEditId] =
    React.useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] =
    React.useState<User | null>(null);

  // Giữ nguyên hàm cập nhật URL.
  const updateQuery = React.useCallback(
    (
      changes: Changes,
      mode: "push" | "replace" = "replace",
    ) => {
      const params = new URLSearchParams(queryString);

      Object.entries(changes).forEach(([key, value]) => {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      const qs = params.toString();

      if (qs === queryString) return;

      const target = qs
        ? `${pathname}?${qs}`
        : pathname;

      if (mode === "push") {
        router.push(target, { scroll: false });
      } else {
        router.replace(target, { scroll: false });
      }
    },
    [queryString, pathname, router],
  );

  // Callback cho useUsers khi page vượt totalPages.
  const onPageOutOfBounds = React.useCallback(
    (nextPage: number | null) => {
      updateQuery({
        page: nextPage === null
          ? null
          : String(nextPage),
      });
    },
    [updateQuery],
  );

  // Dữ liệu danh sách được quản lý bằng hook.
  const {
    data,
    loading,
    error,
    reload,
  } = useUsers({
    page,
    limit,
    sort,
    status,
    q,
    roleId,
    onPageOutOfBounds,
  });

  // Browser Back/Forward khôi phục input.
  React.useEffect(() => {
    setSearchInput(q);
  }, [q]);

  React.useEffect(() => {
    setRoleInput(roleId);
  }, [roleId]);

  // Debounce tìm kiếm và Role ID.
  React.useEffect(() => {
    const nextQ = searchInput
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 120);

    const nextRole = roleInput.trim();

    if (
      nextRole &&
      !/^[1-9]\d*$/.test(nextRole)
    ) {
      return;
    }

    if (
      q === nextQ &&
      roleId === nextRole
    ) {
      return;
    }

    const timer = setTimeout(() => {
      updateQuery({
        q: nextQ || null,
        roleId: nextRole || null,
        page: null,
      });
    }, 450);

    return () => clearTimeout(timer);
  }, [
    q,
    roleId,
    searchInput,
    roleInput,
    updateQuery,
  ]);

  function changeSort(
    field: keyof typeof SORTADMIN.USER,
  ) {
    const [asc, desc] = SORTADMIN.USER[field];

    if (
      !ENABLE_EXTENDED_SORT &&
      !BACKEND_SORT_FIELDS.has(field)
    ) {
      toast.error(
        "Backend chưa hỗ trợ sắp xếp cột này trên toàn bộ dữ liệu.",
      );
      return;
    }

    updateQuery({
      sort: sort === asc ? desc : asc,
      page: null,
    });
  }

  function changePage(next: number) {
    const pages =
      data?.pagination.totalPages ?? 0;

    if (next < 1 || next > pages) return;

    updateQuery(
      {
        page: next === 1
          ? null
          : String(next),
      },
      "push",
    );
  }

  const pagination = data?.pagination;

  const totalPages =
    pagination?.totalPages ?? 0;

  return (
    <TooltipProvider>
      <section
        className={`flex h-[calc(100dvh-2rem)] min-h-0 min-w-0 flex-col gap-3 p-3 text-neutral-950 sm:p-4 ${textWeight}`}
      >
        <header className="flex shrink-0 items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Users
            </h1>
            <p className="mt-0.5 text-sm font-light text-neutral-500">
              Manage accounts, verification and access permissions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-normal sm:block">
              {loading && !data
                ? "Đang tải..."
                : `${pagination?.total ?? 0} users`}
            </span>
            <IconTip
              label="Làm mới danh sách"
              onClick={reload}
              disabled={loading}
            >
              <RotateCw
                className={`size-4 ${
                  loading ? "animate-spin" : ""
                }`}
              />
            </IconTip>
          </div>
        </header>
        {/* Search, Status, Role ID */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-white p-2.5 shadow-sm">
          <div className="relative min-w-44 flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
            <Input
              value={searchInput}
              onChange={(e) =>
                setSearchInput(e.target.value)
              }
              placeholder="Search name, username, email..."
              aria-label="Tìm kiếm người dùng"
              className="h-9 rounded-lg pl-9 font-normal"
            />
          </div>
          <select
            aria-label="Status"
            value={status}
            className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-normal"
            onChange={(e) =>
              updateQuery({
                status:
                  e.target.value === "active"
                    ? null
                    : e.target.value,
                page: null,
              })
            }
          >
            {STATUSADMIN.USER.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <Input
            value={roleInput}
            onChange={(e) =>
              setRoleInput(e.target.value)
            }
            placeholder="Role ID"
            inputMode="numeric"
            aria-label="Role ID"
            className="h-9 w-25 rounded-lg font-normal"
          />
          <span className="hidden text-xs font-light text-neutral-500 lg:block">
            Click column headers to sort
          </span>
        </div>
        {/* Table + Pagination */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <UsersTable
            users={data?.items}
            loading={loading}
            error={error}
            sort={sort}
            onSort={changeSort}
            onEdit={setEditId}
            onDisable={setDeleteTarget}
          />
          <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-neutral-200 bg-white px-3 py-3">
            <span className="text-sm font-normal text-neutral-600">
              Total: {pagination?.total ?? 0} users
            </span>
            <div className="flex items-center gap-2">
              <label
                htmlFor="users-page-limit"
                className="text-xs font-light text-neutral-500"
              >
                Rows
              </label>
              <select
                id="users-page-limit"
                aria-label="Rows per page"
                value={limit}
                className="h-8 rounded-lg border border-neutral-200 bg-white px-2 text-sm font-normal"
                onChange={(e) =>
                  updateQuery({
                    limit:
                      e.target.value === "20"
                        ? null
                        : e.target.value,
                    page: null,
                  })
                }
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <span className="min-w-16 text-center text-sm font-normal">
                {page} / {Math.max(1, totalPages)}
              </span>
              <IconTip
                label="Previous page"
                disabled={loading || page <= 1}
                onClick={() => changePage(page - 1)}
              >
                <ChevronLeft className="size-4" />
              </IconTip>
              <IconTip
                label="Next page"
                disabled={
                  loading ||
                  page >= totalPages
                }
                onClick={() => changePage(page + 1)}
              >
                <ChevronRight className="size-4" />
              </IconTip>
            </div>
          </footer>
        </div>
      </section>
      {/* Edit User */}
      <EditUserDialog
        userId={editId}
        onClose={() => setEditId(null)}
        onSuccess={reload}
      />
      {/* Disable User */}
      <DisableUserDialog
        user={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onSuccess={reload}
      />
    </TooltipProvider>
  );
}