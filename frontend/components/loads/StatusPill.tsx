import { cn } from "@/lib/utils";
import { STATUS_COLOR_VAR, STATUS_LABEL } from "@/lib/lifecycle";
import type { LoadStatus } from "@/types";

interface StatusPillProps {
  status: LoadStatus;
  exception?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function StatusPill({ status, exception, size = "md", className }: StatusPillProps) {
  const colorVar = exception ? "--d2d-danger" : STATUS_COLOR_VAR[status];
  const label = exception ? "Exception" : STATUS_LABEL[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[4px] font-medium",
        size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-0.5 text-body-sm",
        className
      )}
      style={{
        color: `var(${colorVar})`,
        backgroundColor: `color-mix(in srgb, var(${colorVar}) 12%, white)`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: `var(${colorVar})` }}
      />
      {label}
    </span>
  );
}
