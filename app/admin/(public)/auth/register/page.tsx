import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function RegisterPage() {
  return (
    <Card className="w-md max-w-full">
      <CardHeader>
        <CardTitle>Registration unavailable</CardTitle>
        <CardDescription>
          New accounts are managed by your administrator. Contact them to
          request access.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link
          className="text-sm underline underline-offset-4"
          href="/admin/auth/signin"
        >
          Return to sign in
        </Link>
      </CardContent>
    </Card>
  );
}
