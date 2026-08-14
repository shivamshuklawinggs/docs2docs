import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius)] text-body-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--d2d-primary)] text-white hover:bg-[var(--d2d-primary-hover)]",
        signal:
          "bg-[var(--d2d-signal)] text-white hover:brightness-95",
        outline:
          "border border-[var(--d2d-line-strong)] bg-[var(--d2d-surface)] text-[var(--d2d-ink)] hover:bg-[var(--d2d-surface-sunk)]",
        ghost:
          "text-[var(--d2d-ink-soft)] hover:bg-[var(--d2d-surface-sunk)] hover:text-[var(--d2d-ink)]",
        danger:
          "bg-[var(--d2d-danger)] text-white hover:brightness-95",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-9 px-4",
        lg: "h-10 px-5",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
);
Button.displayName = "Button";

export { buttonVariants };
