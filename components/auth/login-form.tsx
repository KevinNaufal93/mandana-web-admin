"use client";

import { useActionState } from "react";
import { login, type LoginFormState } from "@/app/actions/auth";
import { LOGIN_FIELD_MESSAGES, LOGIN_FORM_MESSAGES } from "@/lib/auth/login-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function LoginForm({ next, notice }: { next: string; notice?: string }) {
  const [state, action, pending] = useActionState<LoginFormState | undefined, FormData>(
    login,
    undefined,
  );

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-border bg-card p-8 shadow-sm">
      <div className="flex flex-col gap-1.5 text-center">
        <h1 className="font-serif text-2xl font-medium text-primary">Mandana Admin</h1>
        <p className="text-sm text-muted-foreground">Masuk untuk mengelola properti Mandana.</p>
      </div>

      <form action={action} className="flex flex-col gap-4" noValidate>
        {notice && (
          <p role="status" className="rounded-lg border border-border/50 bg-muted p-3 text-sm text-primary">
            {notice}
          </p>
        )}
        {state?.formError && (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {LOGIN_FORM_MESSAGES[state.formError]}
          </p>
        )}

        <input type="hidden" name="next" value={next} />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            defaultValue={state?.email}
            required
            aria-invalid={Boolean(state?.fieldErrors?.email)}
            className={cn(state?.fieldErrors?.email && "border-destructive")}
          />
          {state?.fieldErrors?.email && (
            <p className="text-xs text-destructive">{LOGIN_FIELD_MESSAGES[state.fieldErrors.email]}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Kata sandi</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={Boolean(state?.fieldErrors?.password)}
            className={cn(state?.fieldErrors?.password && "border-destructive")}
          />
          {state?.fieldErrors?.password && (
            <p className="text-xs text-destructive">{LOGIN_FIELD_MESSAGES[state.fieldErrors.password]}</p>
          )}
        </div>

        <Button type="submit" variant="secondary" size="lg" disabled={pending} className="mt-2">
          {pending ? "Memproses…" : "Masuk"}
        </Button>
      </form>
    </div>
  );
}
