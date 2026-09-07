import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-fast ease-standard active:scale-[0.97] active:duration-[60ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border border-transparent bg-card-foreground font-normal text-primary shadow-sm hover:bg-muted",
        selectedDefault:
          "border border-transparent bg-primary-foreground font-normal text-card shadow-sm hover:bg-primary-foreground/90",
        secondary: "bg-primary text-card hover:bg-primary/80",
        outline:
          "border border-white bg-transparent hover:bg-white hover:text-primary",
        outlineCarousel:
          "border border-border bg-border hover:bg-foreground hover:text-primary-foreground",
        outlineSecondary:
          "border border-primary bg-transparent text-primary-foreground hover:bg-muted hover:text-primary-foreground",
        ghost: "hover:bg-muted",
        link: "text-primary underline-offset-4 hover:underline",
        accent: "bg-accent text-accent-foreground hover:bg-accent/90",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        default: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
