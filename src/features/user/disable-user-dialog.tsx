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
import { useTranslations } from "next-intl";

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
    const t = useTranslations("Users");

  async function disableUser() {
    if (!user || deleting) return;

    setDeleting(true);

    try {
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
          t('disableError')
        );
      }

      toast.success(t('disableSuccess'));

      onClose();
      onSuccess();
    } catch (err) {
      toast.error(
        readableError(
          err,
          t('disableError'),
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
            {t('disableUserTitle')}
          </AlertDialogTitle>

          <AlertDialogDescription className="font-light">
            {t('disableDescription', { username: user?.username ?? '' })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <Button
            variant="outline"
            disabled={deleting}
            className="font-normal"
            onClick={onClose}
          >
            {t('cancel')}
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

            {t('confirm')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}