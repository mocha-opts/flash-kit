import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@flash-kit/ui/components/card";
import { ResendButton } from "./resend-button";

export default function VerifyEmailPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Check your email</CardTitle>
        <CardDescription>
          We sent a verification link to your email address. Click the link to
          verify your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 text-center">
          <ResendButton />
          <a
            href="/sign-in"
            className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            Back to sign in
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
