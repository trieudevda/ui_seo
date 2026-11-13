import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ForgotPasswordPage = () => {
  return (
    <Card className="w-md max-w-full">
      <CardHeader>
        <CardTitle>Forgot password?</CardTitle>
        <CardDescription>
          Password recovery is not available yet. Contact your administrator
          for help accessing your account.
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
export default ForgotPasswordPage;