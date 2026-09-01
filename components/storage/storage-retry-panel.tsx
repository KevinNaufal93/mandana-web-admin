"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Error panel with a "Coba lagi" retry that re-runs the page's server-side
 * fetch via router.refresh(). Safe to rely on here: nothing in
 * lib/api/server-client.ts opts into `{ cache: "force-cache" }`, and this
 * page also calls verifySession() (reads cookies) before the fetch, so
 * Next's default ("Previous Model" — cacheComponents is off in
 * next.config.ts) treats every request as uncached — refresh() genuinely
 * re-hits the network instead of replaying a stale result.
 *
 * `transient` renders a softer hint distinguishing "the server didn't
 * respond, try again" (dropped connection, 502/503/504) from a real
 * validation/auth error that retrying won't fix — see describeError() at
 * each call site.
 */
export function StorageRetryPanel({ message, transient }: { message: string; transient: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
    >
      <div>
        <p>{message}</p>
        {transient && (
          <p className="mt-1 text-xs text-destructive/70">Biasanya ini sementara — server mungkin baru saja restart.</p>
        )}
      </div>
      <Button variant="secondary" onClick={() => startTransition(() => router.refresh())} disabled={isPending}>
        <RefreshCw className={isPending ? "size-4 animate-spin" : "size-4"} />
        {isPending ? "Memuat ulang…" : "Coba lagi"}
      </Button>
    </div>
  );
}
