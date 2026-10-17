export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
   <div className={"m-auto"}>{children}</div>
  );
}
