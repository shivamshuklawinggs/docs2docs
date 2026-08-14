// The signature element — the 8-segment Load Rail (spec §4.2)
import { cn } from "@/lib/utils";
import { LIFECYCLE, RAIL_TICKS, STATUS_STEP } from "@/lib/lifecycle";
import type { LoadStatus } from "@/types";

interface LoadRailProps {
  status: LoadStatus;
  exception?: boolean;
  variant?: "full" | "ticks";
  className?: string;
}

export function LoadRail({
  status,
  exception = false,
  variant = "ticks",
  className,
}: LoadRailProps) {
  const current = STATUS_STEP[status]; // 1..8

  if (variant === "ticks") {
    return (
      <div className={cn("flex items-center gap-[3px]", className)} aria-hidden>
        {Array.from({ length: 8 }, (_, i) => {
          const step = i + 1;
          const done = step < current;
          const isCurrent = step === current;
          return (
            <span
              key={step}
              className={cn(
                "h-2 w-3 rounded-[2px] transition-colors",
                done && "bg-[var(--d2d-primary)]",
                isCurrent && !exception && "bg-[var(--d2d-primary)] d2d-pulse",
                isCurrent && exception && "bg-[var(--d2d-danger)]",
                !done && !isCurrent && "border border-[var(--d2d-line-strong)] bg-transparent"
              )}
            />
          );
        })}
      </div>
    );
  }

  // Full labelled rail
  return (
    <ol className={cn("flex w-full items-start", className)}>
      {LIFECYCLE.map((seg, i) => {
        const step = seg.step;
        const done = step < current;
        const isCurrent = step === current;
        const last = i === LIFECYCLE.length - 1;
        return (
          <li key={seg.key} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-mono font-medium",
                  done && "bg-[var(--d2d-primary)] text-white",
                  isCurrent && !exception && "bg-[var(--d2d-primary)] text-white d2d-pulse",
                  isCurrent && exception && "bg-[var(--d2d-danger)] text-white",
                  !done && !isCurrent && "border border-[var(--d2d-line-strong)] text-[var(--d2d-ink-faint)]"
                )}
              >
                {String(step).padStart(2, "0")}
              </span>
              {!last && (
                <span
                  className={cn(
                    "h-[2px] flex-1",
                    done ? "bg-[var(--d2d-primary)]" : "bg-[var(--d2d-line)]"
                  )}
                />
              )}
            </div>
            <span
              className={cn(
                "mt-1.5 text-center text-[11px] leading-tight",
                isCurrent ? "font-semibold text-[var(--d2d-ink)]" : "text-[var(--d2d-ink-faint)]"
              )}
            >
              {RAIL_TICKS[i]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
