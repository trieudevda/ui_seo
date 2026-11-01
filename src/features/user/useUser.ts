"use client";

import * as React from "react";
import axios from "axios";
import { toast } from "sonner";

import { privateApi } from "@/src/api/private";

import type {
  SortKey,
  UserStatus,
  UsersResponse,
} from "./user.types";
import { readableError } from "./user.helpers";


type UseUsersParams = {
  page: number;
  limit: number;
  sort: SortKey;
  status: UserStatus;
  q: string;
  roleId: string;
  onPageOutOfBounds: (nextPage: number | null) => void;
};

export function useUsers({
  page,
  limit,
  sort,
  status,
  q,
  roleId,
  onPageOutOfBounds,
}: UseUsersParams) {
  const [data, setData] =
    React.useState<UsersResponse | null>(null);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [reloadKey, setReloadKey] = React.useState(0);

  const reload = React.useCallback(() => {
    setReloadKey((x) => x + 1);
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError("");

    (async () => {
      try {
        const result = await privateApi.get<UsersResponse>(
          "/users",
          {
            params: {
              page,
              limit,
              sort,
              status,
              q: q || undefined,
              roleId: roleId || undefined,
            },
            signal: controller.signal,
          },
        );

        if (controller.signal.aborted) return;

        if (
          !Array.isArray(result?.items) ||
          !result.pagination ||
          typeof result.pagination.totalPages !== "number"
        ) {
          throw new Error(
            "API /users không trả về dữ liệu phân trang hợp lệ",
          );
        }

        setData(result);

        if (
          page > Math.max(1, result.pagination.totalPages)
        ) {
          onPageOutOfBounds(
            result.pagination.totalPages > 1
              ? result.pagination.totalPages
              : null,
          );
        }
      } catch (err) {
        if (
          controller.signal.aborted ||
          axios.isCancel(err)
        ) {
          return;
        }

        setData(null);

        const message = readableError(
          err,
          "Không tải được danh sách người dùng.",
        );

        setError(message);
        toast.error(message);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [
    page,
    limit,
    sort,
    status,
    q,
    roleId,
    reloadKey,
    onPageOutOfBounds,
  ]);

  return {
    data,
    loading,
    error,
    reload,
  };
}