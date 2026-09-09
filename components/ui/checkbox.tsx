import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size">;

/**
 * Native <input type="checkbox">, not @radix-ui/react-checkbox — that
 * package isn't installed (components/ui/ ships avatar, dialog,
 * dropdown-menu, label, select, separator, slot only), and a controlled
 * checked/onChange/disabled input needs nothing more. Replaces the bare
 * `<input type="checkbox" className="accent-primary">` convention (see
 * event-support-settings-form.tsx) with real hover/focus/press states —
 * accent-color alone renders a ~13px OS-themed box with no focus ring,
 * not enough when the control is the only interactive element on a page
 * (permission-matrix.tsx).
 *
 * `appearance-none` drops the OS box; the check glyph is an absolutely
 * positioned sibling toggled off the `checked` prop the caller already
 * threads through (same "derive the class from the value you already
 * have" idiom as app-sidebar.tsx's active-link class), not a CSS
 * :checked selector. `active:scale-[0.92]` sits on the wrapping span
 * rather than the input so the glyph presses with it as one unit —
 * :active bubbles to ancestors on press, the same reason button.tsx's
 * active:scale-[0.97] works when a click lands on its inner icon/text.
 */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, disabled, ...props }, ref) => {
    return (
      <span
        className={cn(
          "relative inline-flex size-[18px] shrink-0 transition-transform duration-fast ease-standard",
          !disabled && "active:scale-[0.92]",
        )}
      >
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          className={cn(
            "size-full cursor-pointer appearance-none rounded-[5px] border transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40",
            checked ? "border-primary bg-primary" : "border-border/60 bg-background hover:border-primary",
            className,
          )}
          {...props}
        />
        <Check
          aria-hidden="true"
          strokeWidth={3}
          className={cn(
            "pointer-events-none absolute inset-0 m-auto size-3 text-card transition-opacity duration-fast ease-standard",
            checked ? "opacity-100" : "opacity-0",
          )}
        />
      </span>
    );
  },
);
Checkbox.displayName = "Checkbox";
