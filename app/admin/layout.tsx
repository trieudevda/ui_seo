import "../globals.css";

export default function AdminRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="layout-out min-h-full flex flex-col">{children}</body>
    </html>
  );
}
