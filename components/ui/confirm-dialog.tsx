"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmOptions {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "destructive" tints the confirm button red — use for delete/remove
   *  flows. Omit for a neutral yes/no confirmation. */
  variant?: "default" | "destructive";
}

/**
 * Promise-based replacement for window.confirm(), built on the Dialog
 * primitive this app already ships but, before this, used in exactly one
 * place (see components/ui/dialog.tsx). Mirrors window.confirm's call
 * shape — `if (!(await confirm({...}))) return;` — so migrating a call
 * site is a small, mechanical diff rather than a restructuring.
 *
 * The returned <Dialog> stays mounted at all times (only `open` toggles),
 * so Radix Presence plays its real exit animation on cancel/confirm
 * instead of the content vanishing instantly — see dialog.tsx's
 * data-[state=closed] duration/easing.
 *
 * Usage inside a component:
 *   const { confirm, dialog } = useConfirmDialog();
 *   async function handleDelete() {
 *     const ok = await confirm({
 *       title: `Hapus "${name}"?`,
 *       description: "Tindakan ini tidak dapat dibatalkan.",
 *       confirmLabel: "Hapus",
 *       variant: "destructive",
 *     });
 *     if (!ok) return;
 *     // ...existing delete logic, unchanged
 *   }
 *   return (
 *     <div>
 *       ...
 *       {dialog}
 *     </div>
 *   );
 */
export function useConfirmDialog() {
  const [open, setOpen] = React.useState(false);
  const [options, setOptions] = React.useState<ConfirmOptions | null>(null);
  // Ref, not state: the resolver belongs to whichever confirm() call is
  // currently pending and must never trigger its own re-render.
  const resolveRef = React.useRef<((value: boolean) => void) | null>(null);

  const confirm = React.useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setOptions(opts);
      setOpen(true);
    });
  }, []);

  const settle = React.useCallback((value: boolean) => {
    setOpen(false);
    resolveRef.current?.(value);
    resolveRef.current = null;
  }, []);

  const dialog = (
    <Dialog open={open} onOpenChange={(next) => !next && settle(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{options?.title}</DialogTitle>
          {options?.description && <DialogDescription>{options.description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outlineSecondary" onClick={() => settle(false)}>
            {options?.cancelLabel ?? "Batal"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className={
              options?.variant === "destructive" ? "bg-destructive hover:bg-destructive/90" : undefined
            }
            onClick={() => settle(true)}
          >
            {options?.confirmLabel ?? "Lanjutkan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { confirm, dialog };
}
