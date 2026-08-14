"use client";

import { useMemo } from "react";
import { MapPin } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useSession } from "@/lib/store/session";
import { api } from "@/lib/mock/api";
import { useAsync } from "@/lib/hooks";
import { PageHeader } from "@/components/shell/PageHeader";
import { KpiCard } from "@/components/data/KpiCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { fmtPercent } from "@/lib/format";

export default function AnalyticsPage() {
  const { scope } = useSession();
  const { data: loads } = useAsync(() => scope ? api.getLoads({}, scope) : Promise.resolve([]), [scope?.branchId]);
  const { data: companies } = useAsync(() => api.getCompanies(), []);

  const docsSigned = 0; // TODO: Add documents API when available
  const delivered = (loads ?? []).filter((l) => ["DELIVERED", "INVOICED", "PAID"].includes(l.status));
  const onTimePct = delivered.length ? (delivered.filter((l) => l.onTime).length / delivered.length) * 100 : 0;

  const weeklyTrend = useMemo(() => {
    const buckets = Array.from({ length: 8 }, (_, i) => ({ week: `W-${7 - i}`, loads: 0 }));
    const now = Date.now();
    for (const l of loads ?? []) {
      const ageDays = (now - new Date(l.createdAt).getTime()) / 86400000;
      const idx = 7 - Math.min(7, Math.floor(ageDays / 7));
      if (idx >= 0 && idx < 8) buckets[idx].loads++;
    }
    return buckets;
  }, [loads]);

  const byCity = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of loads ?? []) {
      const key = `${l.pickup.city}, ${l.pickup.state}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [loads]);
  const maxCity = byCity[0]?.[1] ?? 1;

  return (
    <div>
      <PageHeader title="Platform analytics" subtitle="Loads processed, documents signed, on-time performance and lane density." />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Loads processed" value={(loads?.length ?? 0).toLocaleString()} delta="▲ 12%" deltaDir="up" />
        <KpiCard label="Documents signed" value={docsSigned.toLocaleString()} />
        <KpiCard label="On-time %" value={fmtPercent(onTimePct)} deltaDir="up" delta="▲ 1.4pt" />
        <KpiCard label="Active carriers" value={String((companies ?? []).filter((c) => c.type === "CARRIER").length)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader><CardTitle>Loads processed per week</CardTitle></CardHeader>
          <CardContent className="h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyTrend} margin={{ left: -20, right: 10 }}>
                <CartesianGrid stroke="var(--d2d-line)" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="loads" stroke="var(--d2d-primary)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Top pickup lanes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {byCity.map(([city, count]) => (
              <div key={city} className="flex items-center gap-2 text-body-sm">
                <span className="w-28 shrink-0 truncate text-[var(--d2d-ink-soft)]">{city}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--d2d-surface-sunk)]">
                  <div className="h-full bg-[var(--d2d-signal)]" style={{ width: `${(count / maxCity) * 100}%` }} />
                </div>
                <span className="w-6 text-right font-mono text-[12px] text-[var(--d2d-ink-faint)]">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
