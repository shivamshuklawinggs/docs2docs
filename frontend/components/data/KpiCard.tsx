import { ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export function KpiCard({
  label,
  value,
  delta,
  deltaDir,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaDir?: "up" | "down" | "neutral";
}) {
  return (
    <Card className="p-4">
      <p className="text-label text-[var(--d2d-ink-faint)]">{label}</p>
      <p className="mt-1.5 font-display text-display-lg text-[var(--d2d-ink)]">{value}</p>
      {delta && (
        <span
          className={cn(
            "mt-1 inline-flex items-center gap-1 text-[12px] font-medium",
            deltaDir === "up" && "text-[var(--d2d-success)]",
            deltaDir === "down" && "text-[var(--d2d-danger)]",
            deltaDir === "neutral" && "text-[var(--d2d-ink-soft)]"
          )}
        >
          {deltaDir === "up" && <ArrowUp className="h-3 w-3" />}
          {deltaDir === "down" && <ArrowDown className="h-3 w-3" />}
          {delta}
        </span>
      )}
    </Card>
  );
}
