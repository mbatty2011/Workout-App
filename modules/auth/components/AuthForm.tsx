"use client";

import { useState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { signInWithPassword, signUpWithPassword } from "@/modules/auth/actions";

export function AuthForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setError(null);
    setPending(true);
    const action = mode === "signin" ? signInWithPassword : signUpWithPassword;
    const res = await action(formData);
    setPending(false);
    if (res?.error) setError(res.error);
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-4">
      <div>
        <Label>Email</Label>
        <Input name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <Label>Password</Label>
        <Input
          name="password"
          type="password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          minLength={6}
          required
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "…" : mode === "signin" ? "Sign in" : "Create account"}
      </Button>

      <button
        type="button"
        className="text-center text-sm text-muted underline-offset-4 hover:underline"
        onClick={() => {
          setError(null);
          setMode((m) => (m === "signin" ? "signup" : "signin"));
        }}
      >
        {mode === "signin"
          ? "New here? Create an account"
          : "Have an account? Sign in"}
      </button>
    </form>
  );
}
