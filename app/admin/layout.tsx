import { authApi } from "@/src/api/auth";
import "../globals.css";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "sonner";
import { NextIntlClientProvider } from "next-intl";

export default function AdminRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="layout-out min-h-full flex flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <Toaster position="top-right" richColors={false} />
      </body>
    </html>
  );
}
