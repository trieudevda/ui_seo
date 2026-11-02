"use client";

import * as React from "react";
import axios from "axios";
import { toast } from "sonner";
import { LoaderCircle } from "lucide-react";

import { privateApi } from "@/src/api/private";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { isUser } from "@/lib/validators/user.schema";

import type {
  User,
  EditForm,
} from "./user.types";

import { readableError } from "./user.helpers";
import { STATUSADMIN } from "@/lib/constants/status.constant";
import { useTranslations } from "next-intl";

type EditUserDialogProps = {
  userId: string | null;
  onClose: () => void;
  onSuccess: () => void;
};

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

export function EditUserDialog({
  userId,
  onClose,
  onSuccess,
}: EditUserDialogProps) {
  const t = useTranslations("Users");
  const [editUser, setEditUser] =
    React.useState<User | null>(null);

  const [editForm, setEditForm] =
    React.useState<EditForm | null>(null);

  const [editLoading, setEditLoading] =
    React.useState(false);

  const [saving, setSaving] =
    React.useState(false);

  React.useEffect(() => {
    if (!userId) return;

    const controller = new AbortController();

    setEditLoading(true);
    setEditUser(null);
    setEditForm(null);

    (async () => {
      try {
        const user = await privateApi.get<User>(
          `/users/${encodeURIComponent(userId)}`,
          {
            signal: controller.signal,
          },
        );

        if (controller.signal.aborted) return;

        if (!isUser(user) || user.id !== userId) {
          throw new Error(
            t('noUsers')
          );
        }

        setEditUser(user);
        setEditForm(toForm(user));
      } catch (err) {
        if (
          controller.signal.aborted ||
          axios.isCancel(err)
        ) {
          return;
        }

        toast.error(
          readableError(
            err,
            t('noUsers')
          ),
        );
      } finally {
        if (!controller.signal.aborted) {
          setEditLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [userId]);

  function patchForm(
    key: keyof EditForm,
    value: string,
  ) {
    setEditForm((prev) =>
      prev
        ? { ...prev, [key]: value }
        : prev,
    );
  }

  async function saveEdit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!editForm || !editUser || saving) return;

    const username = editForm.username.trim();

    if (!username || username.length > 100) {
      return toast.error(t('usernameLength'));
    }

    if (
      editForm.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)
    ) {
      return toast.error(t('invalidEmail'));
    }

    if (
      editForm.phone &&
      !/^\+?[0-9]{9,20}$/.test(editForm.phone)
    ) {
      return toast.error(t('invalidPhone'));
    }

    setSaving(true);

    try {
      const payload = {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        ...(editForm.email.trim()
          ? { email: editForm.email.trim() }
          : {}),

        ...(editForm.phone.trim()
          ? { phone: editForm.phone.trim() }
          : {}),

        address: editForm.address.trim(),
        // status: editForm.status,
      };

      const updated = await privateApi.patch<User>(
        `/users/${encodeURIComponent(editUser.id)}`,
        payload,
      );
      if (
        !isUser(updated) ||
        updated.id !== editUser.id
      ) {
        throw new Error(
          t('saveError')
        );
      }

      toast.success(t('saveSuccess'));

      onClose();
      onSuccess();
    } catch (err) {console.log(err)
      toast.error(
        readableError(
          err,
          t('saveError'),
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={!!userId}
      onOpenChange={(open) => {
        if (!open && !saving) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-2xl sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {t('editTitle')}
          </DialogTitle>
        </DialogHeader>

        {editLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton
                key={i}
                className="h-14 rounded-lg"
              />
            ))}
          </div>
        ) : !editForm ? (
          <p className="text-sm font-light">
            {t('noUsersDetail')}
          </p>
        ) : (
          <form
            id="user-edit-form"
            onSubmit={saveEdit}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            {(
              [
                ["username", t('username')],
                ["firstName", t('firstName')],
                ["lastName", t('lastName')],
                ["email", t('email')],
                ["phone", t('phone')],
                ["address", t('address')],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="space-y-1 text-xs font-normal"
              >
                <span>{label}</span>

                <Input
                  value={editForm[key]}
                  onChange={(e) =>
                    patchForm(key, e.target.value)
                  }
                  type={key === "email" ? "email" : "text"}
                  disabled={saving}
                  maxLength={
                    key === "address"
                      ? 255
                      : key === "phone"
                        ? 20
                        : 100
                  }
                  className="rounded-lg font-normal"
                />
              </label>
            ))}

            <label className="space-y-1 text-xs font-normal">
              <span>{t('status')}</span>

              <select
                value={editForm.status}
                disabled={saving}
                onChange={(e) =>
                  patchForm("status", e.target.value)
                }
                className="h-9 w-full rounded-lg border border-neutral-200 bg-white px-2 font-normal"
              >
                {STATUSADMIN.USER.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <div className="self-end text-xs font-light text-neutral-500">
              Roles:{" "}
              {editUser?.roleAssignments
                .map((r) => r.name)
                .join(", ") || "—"}{" "}
              ({t('read-only')})
            </div>
          </form>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            className="font-normal"
            disabled={saving}
            onClick={onClose}
          >
            {t('cancel')}
          </Button>

          <Button
            className="font-normal"
            type="submit"
            form="user-edit-form"
            disabled={
              saving ||
              editLoading ||
              !editForm
            }
          >
            {saving ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : null}

            {t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}