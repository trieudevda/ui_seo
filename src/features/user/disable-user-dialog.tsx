"use client";

import * as React from "react";
import { toast } from "sonner";
import { LoaderCircle, Trash2 } from "lucide-react";

import { privateApi } from "@/src/api/private";

import { Button } from "@/components/ui/button";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import type {
  User,
  UserStatus,
} from "./user.types";

import { readableError } from "./user.helpers";

type DisableUserDialogProps = {
  user: User | null;
  onClose: () => void;
  onSuccess: () => void;
};

export function DisableUserDialog({
  user,
  onClose,
  onSuccess,
}: DisableUserDialogProps) {
  const [deleting, setDeleting] =
    React.useState(false);

  async function disableUser() {
    if (!user || deleting) return;

    setDeleting(true);

    try {
      // Backend DELETE thực hiện soft-disable.
      const result = await privateApi.delete<{
        id: string;
        status: UserStatus;
      }>(
        `/users/${encodeURIComponent(user.id)}`,
      );

      if (
        result?.id !== user.id ||
        result.status !== "inactive"
      ) {
        throw new Error(
          "DELETE /users/:id chưa trả về xác nhận vô hiệu hóa hợp lệ.",
        );
      }

      toast.success("Đã vô hiệu hóa người dùng.");

      onClose();
      onSuccess();
    } catch (err) {
      toast.error(
        readableError(
          err,
          "Thao tác thất bại hoặc backend chưa hỗ trợ DELETE.",
        ),
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog
      open={!!user}
      onOpenChange={(open) => {
        if (!open && !deleting) {
          onClose();
        }
      }}
    >
      <AlertDialogContent className="rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-bold">
            Vô hiệu hóa tài khoản?
          </AlertDialogTitle>

          <AlertDialogDescription className="font-light">
            Tài khoản {user?.username} sẽ chuyển sang
            inactive và không thể đăng nhập. Đây là
            soft-delete, không xóa dữ liệu lịch sử.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <Button
            variant="outline"
            disabled={deleting}
            className="font-normal"
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            disabled={deleting}
            className="bg-neutral-950 font-normal text-white hover:bg-neutral-800"
            onClick={() => void disableUser()}
          >
            {deleting ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}

            Confirm
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}