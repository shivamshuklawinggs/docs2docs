import * as React from "react";
import { Inbox, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Empty state — instructional copy + the action that fixes it (spec §11)
export function EmptyState({
  title,
  body,
  action,
  icon: Icon = Inbox,
}: {
  title: string;
  body: string;
  action?: { label: string; onClick: () => void };
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius)] border border-dashed border-[var(--d2d-line-strong)] bg-[var(--d2d-surface)] px-6 py-14 text-center">
      <Icon className="h-8 w-8 text-[var(--d2d-ink-faint)]" />
      <div>
        <p className="font-display text-title text-[var(--d2d-ink)]">{title}</p>
        <p className="mx-auto mt-1 max-w-md text-body-sm text-[var(--d2d-ink-soft)]">{body}</p>
      </div>
      {action && (
        <Button className="mt-1" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

// Error state — what failed + Try again (spec §11)
export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius)] border border-[var(--d2d-danger)] bg-[var(--d2d-danger-tint)] px-6 py-12 text-center">
      <AlertTriangle className="h-7 w-7 text-[var(--d2d-danger)]" />
      <p className="max-w-md text-body-sm text-[var(--d2d-ink)]">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

// Skeletons that match the final layout shape (spec §11)
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[4px] bg-[var(--d2d-surface-sunk)]",
        className
      )}
    />
  );
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-11 w-full" />
      ))}
    </div>
  );
}
