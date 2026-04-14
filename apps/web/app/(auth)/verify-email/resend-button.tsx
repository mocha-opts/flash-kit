"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { authClient } from "@flash-kit/auth/client";
import { Button } from "@flash-kit/ui/components/button";

export function ResendButton() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleResend() {
    setLoading(true);
    await authClient.sendVerificationEmail({
      email: "",
      callbackURL: "/sign-in",
    });
    setLoading(false);
    setSent(true);
  }

  return (
    <Button
      variant="outline"
      className="w-full"
      onClick={handleResend}
      disabled={loading || sent}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {sent ? "Email sent" : "Resend verification email"}
    </Button>
  );
}
