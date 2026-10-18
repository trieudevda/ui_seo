"use client";

import * as React from "react";
import axios from "axios";
import * as z from "zod";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import {
  authApi,
  getLandingRoute,
} from "@/src/api/auth";
import { PATH } from "@/src/path";

// Schema tương ứng LoginDto NestJS
const formSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Username is required.")
    .max(100, "Username must be at most 100 characters."),

  password: z
    .string()
    .min(1, "Password is required.")
    .max(255, "Password must be at most 255 characters."),
});

type FormValues = z.infer<typeof formSchema>;

type AuthStatus =
  | "checking"
  | "guest"
  | "redirecting"
  | "error";

export default function AuthSignInAdminPage() {
  const router = useRouter();

  const [status, setStatus] =
    React.useState<AuthStatus>("checking");

  const [retry, setRetry] = React.useState(0);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Kiểm tra session trước khi render form
  React.useEffect(() => {
    let active = true;

    async function verify() {
      setStatus("checking");

      // Chưa có token -> cho phép đăng nhập
      if (!authApi.hasSession()) {
        if (active) setStatus("guest");
        return;
      }

      try {
        // Xác nhận phiên thực tế từ backend
        const user = await authApi.me();

        if (!active) return;

        // Chuyển đến trang phù hợp với quyền
        setStatus("redirecting");
        router.replace(getLandingRoute(user));
      } catch (error) {
        if (!active) return;

        const httpStatus = axios.isAxiosError(error)
          ? error.response?.status
          : undefined;

        if (httpStatus === 401) {
          // Phiên hết hạn / refresh thất bại
          setStatus("guest");
          return;
        }

        if (httpStatus === 403) {
          router.replace(PATH.DASHBOARD.INDEX());
          return;
        }

        // Lỗi mạng, 500 hoặc lỗi không xác định
        setStatus("error");
      }
    }

    void verify();

    return () => {
      active = false;
    };
  }, [router, retry]);

  async function onSubmit(data: FormValues) {
    try {
      await authApi.login(data);

      setStatus("redirecting");

      // Lấy quyền hiện tại từ backend
      const user = await authApi.me();

      toast.success("Signed in successfully.");

      router.replace(getLandingRoute(user));
    } catch (error) {
      setStatus("guest");

      const message = axios.isAxiosError(error)
        ? error.response?.data?.message
        : undefined;

      toast.error(
        typeof message === "string"
          ? message
          : "Authentication failed. Please try again.",
      );
    }
  }

  // Chưa kiểm tra xong hoặc đang chuyển trang
  if (status === "checking" || status === "redirecting") {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Checking authentication...
        </p>
      </div>
    );
  }

  // Không thể kiểm tra session
  if (status === "error") {
    return (
      <Card className="w-md max-w-full">
        <CardHeader>
          <CardTitle>Connection error</CardTitle>
          <CardDescription>
            Unable to verify your session.
          </CardDescription>
        </CardHeader>

        <CardFooter>
          <Button
            type="button"
            onClick={() => setRetry((v) => v + 1)}
          >
            Try again
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Chỉ hiển thị form khi chưa đăng nhập
  return (
    <Card className="w-md max-w-full sm:max-w-md">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>
          Enter your credentials to access the admin panel.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          id="form-signin-admin"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <FieldGroup>
            <Controller
              name="username"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="signin-username">
                    Username
                  </FieldLabel>

                  <Input
                    {...field}
                    id="signin-username"
                    aria-invalid={fieldState.invalid}
                    placeholder="Enter your username"
                    autoComplete="username"
                  />

                  {fieldState.invalid && (
                    <FieldError
                      errors={[fieldState.error]}
                    />
                  )}
                </Field>
              )}
            />

            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="signin-password">
                    Password
                  </FieldLabel>

                  <Input
                    {...field}
                    id="signin-password"
                    type="password"
                    aria-invalid={fieldState.invalid}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />

                  {fieldState.invalid && (
                    <FieldError
                      errors={[fieldState.error]}
                    />
                  )}
                </Field>
              )}
            />
          </FieldGroup>
        </form>
      </CardContent>

      <CardFooter>
        <Field orientation="horizontal">
          <Button
            type="submit"
            form="form-signin-admin"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting
              ? "Signing in..."
              : "Sign In"}
          </Button>
        </Field>
      </CardFooter>
    </Card>
  );
}