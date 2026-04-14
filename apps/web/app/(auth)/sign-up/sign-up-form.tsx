"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { z } from "zod/v4";

import { signIn, signUp } from "@flash-kit/auth/client";
import { Button } from "@flash-kit/ui/components/button";
import { Input } from "@flash-kit/ui/components/input";
import { Separator } from "@flash-kit/ui/components/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@flash-kit/ui/components/form";

const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type SignUpValues = z.infer<typeof signUpSchema>;

export function SignUpForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(values: SignUpValues) {
    setError(null);
    const result = await signUp.email({
      name: values.name,
      email: values.email,
      password: values.password,
    });

    if (result.error) {
      setError(result.error.message ?? "Sign up failed. Please try again.");
      return;
    }

    router.push("/verify-email");
  }

  async function handleSocialSignIn(provider: "google" | "github") {
    setError(null);
    setSocialLoading(provider);
    await signIn.social({
      provider,
      callbackURL: "/dashboard",
    });
  }

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 gap-4">
        <Button
          variant="outline"
          onClick={() => handleSocialSignIn("google")}
          disabled={isSubmitting || socialLoading !== null}
        >
          {socialLoading === "google" && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Google
        </Button>
        <Button
          variant="outline"
          onClick={() => handleSocialSignIn("github")}
          disabled={isSubmitting || socialLoading !== null}
        >
          {socialLoading === "github" && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          GitHub
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground uppercase">
          or continue with
        </span>
        <Separator className="flex-1" />
      </div>

      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="John Doe"
                    autoComplete="name"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || socialLoading !== null}
          >
            {isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create account
          </Button>
        </form>
      </Form>

      <p className="text-sm text-center text-muted-foreground">
        Already have an account?{" "}
        <a
          href="/sign-in"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Sign in
        </a>
      </p>
    </div>
  );
}
