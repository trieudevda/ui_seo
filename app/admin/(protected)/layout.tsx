"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import axios from "axios";

import { authApi, canAccessRoute, hasPermission } from "@/src/api/auth";

const routePermissions: Record<string, string | null> = {
  "/admin": null,
  "/admin/user": "user.findAll",
  "/admin/user/new": "user.create",
};

type CheckState = {
  path: string;
  status: "allowed" | "error";
};

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [checked, setChecked] = useState<CheckState | null>(null);

  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;

    setChecked(null);

    async function verify() {
      if (!authApi.hasSession()) {
        router.replace("/admin/login");
        return;
      }

      try {
        const user = await authApi.me();

        if (!active) return;

        // Mặc định từ chối route chưa khai báo.
        if (!Object.prototype.hasOwnProperty.call(routePermissions, pathname)) {
          router.replace("/403");
          return;
        }

        if (!canAccessRoute(user, pathname)) {
          router.replace("/403");
          return;
        }

        setChecked({
          path: pathname,
          status: "allowed",
        });
      } catch (error) {
        if (!active) return;

        const status = axios.isAxiosError(error)
          ? error.response?.status
          : undefined;

        if (status === 401) {
          router.replace("/admin/login");
          return;
        }

        if (status === 403) {
          router.replace("/403");
          return;
        }

        setChecked({
          path: pathname,
          status: "error",
        });
      }
    }

    void verify();

    return () => {
      active = false;
    };
  }, [pathname, router, retry]);

  const current = checked?.path === pathname ? checked : null;

  if (current?.status === "error") {
    return (
      <button onClick={() => setRetry((v) => v + 1)}>
        Không thể xác thực. Thử lại
      </button>
    );
  }

  if (current?.status !== "allowed") {
    return <div>Đang xác thực phiên...</div>;
  }

  return <>{children}</>;
}
