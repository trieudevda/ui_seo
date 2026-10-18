import { authApi } from "@/src/api/auth";
import "../globals.css";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "sonner";

export default function AdminRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="layout-out min-h-full flex flex-col">
        {children}
        <Toaster position="top-right" richColors={false} />
      </body>
    </html>
  );
}
