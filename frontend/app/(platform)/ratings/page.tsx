"use client";

import { useMemo, useState, useCallback } from "react";
import { Star, MessageSquare } from "lucide-react";
import { useSession } from "@/lib/store/session";
import { api } from "@/lib/mock/api";
import { useAsync } from "@/lib/hooks";
import { useDataVersion } from "@/lib/store/data";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/data/states";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Review } from "@/types";

type SubjectType = Review["subjectType"];

const TABS: { key: SubjectType; label: string }[] = [
  { key: "DRIVER", label: "Drivers" },
  { key: "CARRIER", label: "Carriers" },
  { key: "BROKER", label: "Brokers" },
  { key: "SHIPPER", label: "Shippers" },
];

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          style={{ width: size, height: size }}
          className={n <= Math.round(value) ? "fill-[var(--d2d-signal)] text-[var(--d2d-signal)]" : "text-[var(--d2d-line-strong)]"}
        />
      ))}
    </span>
  );
}

export default function RatingsPage() {
  const scope = useSession((s) => s.scope);
  const version = useDataVersion((s) => s.version);
  const [tab, setTab] = useState<SubjectType>("DRIVER");
  const [selected, setSelected] = useState<string | null>(null);
  const { data: reviews, loading, error, retry } = useAsync(() => api.getReviews(), [version]);
  const { data: drivers } = useAsync(() => scope ? api.getDrivers(scope) : Promise.resolve([]), [scope?.branchId, version]);
  const { data: companies } = useAsync(() => api.getCompanies(), [version]);

  const subjectName = useCallback((type: SubjectType, id: string): string => {
    if (type === "DRIVER") return drivers?.find((d) => d.id === id)?.name ?? id;
    return companies?.find((c) => c.id === id)?.name ?? id;
  }, [drivers, companies]);

  const bySubject = useMemo(() => {
    const map = new Map<string, Review[]>();
    for (const r of reviews ?? []) {
      if (r.subjectType !== tab) continue;
      const list = map.get(r.subjectId) ?? [];
      list.push(r);
      map.set(r.subjectId, list);
    }
    return Array.from(map.entries())
      .map(([id, list]) => ({
        id,
        name: subjectName(tab, id),
        avg: list.reduce((s, r) => s + r.stars, 0) / list.length,
        count: list.length,
        reviews: list.sort((a, b) => +new Date(b.date) - +new Date(a.date)),
      }))
      .sort((a, b) => b.count - a.count);
  }, [reviews, tab, subjectName]);

  const activeId = selected ?? bySubject[0]?.id ?? null;
  const active = bySubject.find((s) => s.id === activeId);

  const breakdown = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    for (const r of active?.reviews ?? []) counts[r.stars - 1]++;
    const total = active?.reviews.length ?? 0;
    return [5, 4, 3, 2, 1].map((star) => ({
      star,
      pct: total ? Math.round((counts[star - 1] / total) * 100) : 0,
    }));
  }, [active]);

  if (!scope) return null;

  return (
    <div>
      <PageHeader title="Ratings & performance" subtitle="Aggregated feedback across drivers, carriers, brokers and shippers." />

      <div className="mb-4 flex gap-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              setSelected(null);
            }}
            className={cn(
              "rounded-[var(--radius)] px-3 py-1.5 text-body-sm",
              tab === t.key ? "bg-[var(--d2d-primary)] text-white" : "text-[var(--d2d-ink-soft)] hover:bg-[var(--d2d-surface-sunk)]"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <TableSkeleton rows={8} />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : bySubject.length === 0 ? (
        <EmptyState title="No reviews yet" body="Reviews left after delivery will aggregate here." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <Card className="max-h-[70vh] overflow-y-auto d2d-scroll">
            <ul>
              {bySubject.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => setSelected(s.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 border-b border-[var(--d2d-line)] px-4 py-2.5 text-left hover:bg-[var(--d2d-surface-sunk)]",
                      activeId === s.id && "bg-[var(--d2d-primary-tint)]"
                    )}
                  >
                    <span className="min-w-0 truncate text-body-sm font-medium">{s.name}</span>
                    <span className="flex shrink-0 items-center gap-1 font-mono text-[12px] text-[var(--d2d-ink-soft)]">
                      <Star className="h-3 w-3 fill-[var(--d2d-signal)] text-[var(--d2d-signal)]" />
                      {s.avg.toFixed(1)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          {active && (
            <div className="space-y-4">
              <Card>
                <CardContent className="flex flex-wrap items-center gap-6 pt-5">
                  <div className="text-center">
                    <p className="font-display text-display-lg text-[var(--d2d-primary)]">{active.avg.toFixed(1)}</p>
                    <Stars value={active.avg} />
                    <p className="mt-1 text-[12px] text-[var(--d2d-ink-faint)]">{active.count} reviews</p>
                  </div>
                  <div className="min-w-[220px] flex-1 space-y-1">
                    {breakdown.map((b) => (
                      <div key={b.star} className="flex items-center gap-2 text-[12px]">
                        <span className="w-8 text-[var(--d2d-ink-soft)]">{b.star}★</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--d2d-surface-sunk)]">
                          <div
                            className="h-full bg-[var(--d2d-signal)]"
                            style={{ width: `${b.pct}%` }}
                          />
                        </div>
                        <span className="w-8 text-right text-[var(--d2d-ink-faint)]">{b.pct}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-4 pt-5">
                  <p className="flex items-center gap-1.5 text-label text-[var(--d2d-ink-faint)]">
                    <MessageSquare className="h-3.5 w-3.5" /> Review thread
                  </p>
                  {active.reviews.map((r) => (
                    <div key={r.id} className="border-b border-[var(--d2d-line)] pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-body-sm font-medium">{r.reviewerName}</span>
                          <span className="text-[12px] text-[var(--d2d-ink-faint)]">{r.reviewerRole}</span>
                        </div>
                        <Stars value={r.stars} size={12} />
                      </div>
                      <p className="mt-1 text-body-sm text-[var(--d2d-ink)]">{r.comment}</p>
                      <p className="mt-1 font-mono text-[11px] text-[var(--d2d-ink-faint)]">
                        {r.loadRef} · {fmtDate(r.date)}
                      </p>
                      {r.response && (
                        <div className="mt-2 rounded-[var(--radius)] bg-[var(--d2d-surface-sunk)] px-3 py-2 text-body-sm text-[var(--d2d-ink-soft)]">
                          <span className="font-medium text-[var(--d2d-ink)]">Response: </span>
                          {r.response}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
