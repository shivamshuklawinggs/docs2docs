"use client";

import { Megaphone, Eye, MousePointerClick } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { KpiCard } from "@/components/data/KpiCard";
import { Card } from "@/components/ui/card";
import { fmtCurrency, fmtPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Campaign {
  id: string;
  name: string;
  advertiser: string;
  slot: "Driver app — home" | "Driver app — load detail" | "Shipper portal — dashboard";
  status: "ACTIVE" | "PAUSED" | "ENDED";
  impressions: number;
  clicks: number;
  spendUsd: number;
}

const CAMPAIGNS: Campaign[] = [
  { id: "ad-1", name: "Fuel card signup", advertiser: "RoadFuel Rewards", slot: "Driver app — home", status: "ACTIVE", impressions: 48200, clicks: 1120, spendUsd: 3400 },
  { id: "ad-2", name: "ELD hardware refresh", advertiser: "TrackerPro", slot: "Driver app — load detail", status: "ACTIVE", impressions: 31500, clicks: 640, spendUsd: 2100 },
  { id: "ad-3", name: "Load board upsell", advertiser: "Docks2Doc", slot: "Shipper portal — dashboard", status: "PAUSED", impressions: 12900, clicks: 210, spendUsd: 0 },
  { id: "ad-4", name: "Tire discount program", advertiser: "Continental Fleet", slot: "Driver app — home", status: "ENDED", impressions: 60800, clicks: 1890, spendUsd: 5200 },
];

const STATUS_STYLE: Record<Campaign["status"], string> = {
  ACTIVE: "bg-[var(--d2d-success-tint)] text-[var(--d2d-success)]",
  PAUSED: "bg-[var(--d2d-warning-tint)] text-[var(--d2d-warning)]",
  ENDED: "bg-[var(--d2d-surface-sunk)] text-[var(--d2d-ink-faint)]",
};

export default function AdvertisingPage() {
  const totalImpressions = CAMPAIGNS.reduce((s, c) => s + c.impressions, 0);
  const totalClicks = CAMPAIGNS.reduce((s, c) => s + c.clicks, 0);
  const totalSpend = CAMPAIGNS.reduce((s, c) => s + c.spendUsd, 0);
  const ctr = (totalClicks / totalImpressions) * 100;

  return (
    <div>
      <PageHeader title="Advertising" subtitle="Driver-app and portal ad slots, campaigns and performance." />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Ad revenue" value={fmtCurrency(totalSpend)} delta="▲ 14%" deltaDir="up" />
        <KpiCard label="Impressions" value={totalImpressions.toLocaleString()} />
        <KpiCard label="Clicks" value={totalClicks.toLocaleString()} />
        <KpiCard label="CTR" value={fmtPercent(ctr, 2)} />
      </div>

      <Card className="overflow-hidden">
        <div className="d2d-scroll overflow-x-auto">
          <table className="w-full border-collapse text-body-sm">
            <caption className="sr-only">Ad campaigns</caption>
            <thead>
              <tr className="border-b border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] text-left text-label text-[var(--d2d-ink-faint)]">
                <th scope="col" className="px-4 py-2.5">Campaign</th>
                <th scope="col" className="px-4 py-2.5">Advertiser</th>
                <th scope="col" className="px-4 py-2.5">Slot</th>
                <th scope="col" className="px-4 py-2.5 text-right">Impressions</th>
                <th scope="col" className="px-4 py-2.5 text-right">Clicks</th>
                <th scope="col" className="px-4 py-2.5 text-right">CTR</th>
                <th scope="col" className="px-4 py-2.5 text-right">Spend</th>
                <th scope="col" className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {CAMPAIGNS.map((c) => (
                <tr key={c.id} className="border-b border-[var(--d2d-line)] hover:bg-[var(--d2d-surface-sunk)]">
                  <td className="px-4 py-2.5 flex items-center gap-2 font-medium">
                    <Megaphone className="h-3.5 w-3.5 text-[var(--d2d-ink-faint)]" /> {c.name}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--d2d-ink-soft)]">{c.advertiser}</td>
                  <td className="px-4 py-2.5 text-[12px] text-[var(--d2d-ink-soft)]">{c.slot}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-[12px]">
                    <span className="inline-flex items-center gap-1">
                      <Eye className="h-3 w-3 text-[var(--d2d-ink-faint)]" /> {c.impressions.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-[12px]">
                    <span className="inline-flex items-center gap-1">
                      <MousePointerClick className="h-3 w-3 text-[var(--d2d-ink-faint)]" /> {c.clicks.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-[12px]">
                    {((c.clicks / c.impressions) * 100).toFixed(2)}%
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-medium">{fmtCurrency(c.spendUsd)}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", STATUS_STYLE[c.status])}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
