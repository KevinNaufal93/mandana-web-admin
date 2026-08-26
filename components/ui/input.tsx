import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // border-border/60, not border-primary: a heavy near-black border
          // on every input was a big part of why edit surfaces read louder
          // than everything else on the page. placeholder:text-muted-foreground,
          // not text-primary: a placeholder at full value color was
          // indistinguishable from a real, typed value — see select.tsx's
          // SelectTrigger for the identical fix, done together on purpose.
          // bg-background, not bg-card: kept as a recessed well one shade
          // off the surface it sits in — DetailCard now fills bg-card
          // (white) precisely so this stays the darker of the two. Making
          // both bg-card was tried and reverted: it fixed DetailCard's
          // wash but created the identical collision on the login card
          // (also bg-card), which relies on this same well/panel contrast.
          "flex h-10 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-primary placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
