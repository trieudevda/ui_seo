import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { UsersAdmin } from "./_userAdmin";
// import { UsersAdmin } from "@/components/admin/users-admin";

export default function UserListPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 p-4">
          <Skeleton className="h-10 w-64 rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-[60dvh] w-full rounded-xl" />
        </div>
      }
    >
      <UsersAdmin />
    </Suspense>
  );
}
