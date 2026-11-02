
"use client";

import type { ReactNode } from "react";

import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  CheckCircle2,
  CircleX,
  MinusCircle,
  Pencil,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { SORTADMIN } from "@/lib/constants/sort.constant";
import type { User, SortKey } from "./user.types";

type SortField = keyof typeof SORTADMIN.USER;

type Column = {
  label: string;
  field?: SortField;
  width: string;
};

const COLUMNS: Column[] = [
  { label: "Name", field: "name", width: "min-w-44" },
  // { label: "Username", field: "username", width: "min-w-36" },
  { label: "Email", field: "email", width: "min-w-56" },
  { label: "Phone", field: "phone", width: "min-w-36" },
  // { label: "Email verified", field: "emailVerified", width: "min-w-32" },
  // { label: "Phone verified", field: "phoneVerified", width: "min-w-32" },
  { label: "Role", field: "role", width: "min-w-36" },
  { label: "Status", field: "status", width: "min-w-28" },
  { label: "Created", field: "created", width: "min-w-32" },
  { label: "Action", width: "w-24" },
];

type IconTipProps = {
  label: string;
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  destructive?: boolean;
};

// Export để UsersAdmin vẫn dùng được tại Header và Pagination.
export function IconTip({
  label,
  children,
  disabled,
  onClick,
  destructive = false,
}: IconTipProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`size-8 rounded-lg font-normal ${
              destructive ? "hover:bg-red-50 hover:text-red-700" : ""
            }`}
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
          >
            {children}
          </Button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function Verification({
  value,
  label,
}: {
  value: string | null | undefined;
  label: string;
}) {
  const verified = typeof value === "string" && value.length > 0;
  const unknown = value === undefined;

  const text = unknown
    ? "Chưa xác định"
    : verified
      ? "Đã xác minh"
      : "Chưa xác minh";

  return (
    <Tooltip>
      <TooltipTrigger
        className="inline-flex rounded-full p-1 outline-offset-2"
        aria-label={`${label}: ${text}`}
      >
        {unknown ? (
          <MinusCircle className="size-4 text-neutral-400" />
        ) : verified ? (
          <CheckCircle2 className="size-4 text-emerald-600" />
        ) : (
          <CircleX className="size-4 text-red-600" />
        )}
      </TooltipTrigger>

      <TooltipContent>
        {label}: {text}
      </TooltipContent>
    </Tooltip>
  );
}

function SortButton({
  label,
  field,
  sort,
  onSort,
}: {
  label: string;
  field: SortField;
  sort: SortKey;
  onSort: (field: SortField) => void;
}) {
  const [asc, desc] = SORTADMIN.USER[field];
  const current = sort === asc || sort === desc;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={() => onSort(field)}
            aria-label={`Sắp xếp ${label}: ${
              sort === asc ? "giảm dần" : "tăng dần"
            }`}
            aria-pressed={current}
            className="inline-flex w-full items-center justify-between gap-2 rounded-md px-1 py-2 text-left font-normal hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-neutral-900"
          >
            <span>{label}</span>

            {sort === asc ? (
              <ArrowUp className="size-3.5" />
            ) : sort === desc ? (
              <ArrowDown className="size-3.5" />
            ) : (
              <ArrowDownUp className="size-3.5 opacity-50" />
            )}
          </button>
        }
      />

      <TooltipContent>
        Bấm để sắp xếp tăng / giảm trên toàn bộ kết quả
      </TooltipContent>
    </Tooltip>
  );
}

function UserTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <TableRow key={i} className="h-14">
          {Array.from({ length: COLUMNS.length }, (_, j) => (
            <TableCell
              key={j}
              className="border-r border-neutral-100 last:border-r-0"
            >
              <Skeleton className="h-4 w-full max-w-36 rounded-md" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

function fullName(user: User): string {
  return (
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username
  );
}

type UsersTableProps = {
  users: User[];
  loading: boolean;
  error: string;
  sort: SortKey;
  onSort: (field: SortField) => void;
  onEdit: (id: string) => void;
  onDisable: (user: User) => void;
};

export function UsersTable({
  users,
  loading,
  error,
  sort,
  onSort,
  onEdit,
  onDisable,
}: UsersTableProps) {
  return (
    <div className="min-h-0 min-w-0 flex-1 overflow-auto [scrollbar-gutter:stable] [&_[data-slot=table-container]]:overflow-visible">
      <Table className="min-w-[1340px] border-separate border-spacing-0 text-sm font-normal">
        <TableHeader className="sticky top-0 z-10 bg-neutral-50 shadow-[0_1px_0_#e5e5e5]">
          <TableRow className="hover:bg-neutral-50">
            {COLUMNS.map((column) => (
              <TableHead
                key={column.label}
                scope="col"
                className={`${column.width} h-11 border-r border-neutral-200 px-3 font-normal text-neutral-700 last:border-r-0`}
              >
                {column.field ? (
                  <SortButton
                    field={column.field}
                    label={column.label}
                    sort={sort}
                    onSort={onSort}
                  />
                ) : (
                  <span className="px-1">{column.label}</span>
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {loading ? (
            <UserTableSkeleton />
          ) : error ? (
            <TableRow>
              <TableCell
                colSpan={COLUMNS.length}
                className="h-36 text-center font-light text-neutral-600"
              >
                {error}
              </TableCell>
            </TableRow>
          ) : users.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={COLUMNS.length}
                className="h-36 text-center font-light text-neutral-500"
              >
                Không tìm thấy người dùng.
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow
                key={user.id}
                className="h-14 border-b border-neutral-100 hover:bg-neutral-50/70"
              >
                <TableCell
                  className="max-w-55 truncate border-r border-neutral-100 font-normal"
                  title={fullName(user)}
                >
                  {fullName(user)}
                </TableCell>

                {/* <TableCell
                  className="max-w-44 truncate border-r border-neutral-100"
                  title={user.username}
                >
                  {user.username}
                </TableCell> */}

                <TableCell
                  className="max-w-60 truncate border-r border-neutral-100"
                  title={user.email ?? ""}
                >
                  {user.email ?? "—"}
                  {user.email && (
      <Verification
        label="Email"
        value={user.emailVerifiedAt}
      />
    )}
                </TableCell>

                <TableCell className="border-r border-neutral-100">
                  {user.phone ?? "—"}
                  {user.phone && (
      <Verification
        label="Phone"
        value={user.phoneVerifiedAt}
      />
    )}
                </TableCell>

                {/* <TableCell className="border-r border-neutral-100 text-center">
                  <Verification
                    label="Email"
                    value={user.emailVerifiedAt}
                  />
                </TableCell>

                <TableCell className="border-r border-neutral-100 text-center">
                  <Verification
                    label="Điện thoại"
                    value={user.phoneVerifiedAt}
                  />
                </TableCell> */}

                <TableCell
                  className="max-w-44 truncate border-r border-neutral-100"
                  title={user.roleAssignments?.map((r) => r.name).join(", ")}
                >
                  {user.roleAssignments?.map((r) => r.name).join(", ") || "—"}
                </TableCell>

                <TableCell className="border-r border-neutral-100 capitalize">
                  {user.status}
                </TableCell>

                <TableCell className="border-r border-neutral-100">
                  {user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString("vi-VN")
                    : "—"}
                </TableCell>

                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <IconTip
                      label={`Sửa ${user.username}`}
                      onClick={() => onEdit(user.id)}
                    >
                      <Pencil className="size-4" />
                    </IconTip>

                    <IconTip
                      label={`Vô hiệu hóa ${user.username}`}
                      onClick={() => onDisable(user)}
                      destructive
                    >
                      <Trash2 className="size-4" />
                    </IconTip>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
