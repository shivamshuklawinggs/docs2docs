// Formatting helpers (spec §3 lib/format.ts)
import { format, formatDistanceToNowStrict, differenceInDays } from "date-fns";

const TZ_ABBR = "CDT"; // America/Chicago default per spec §2

export function fmtWeight(lb: number): string {
  return `${lb.toLocaleString("en-US")} lb`;
}

export function fmtCurrency(usd: number, opts?: { cents?: boolean }): string {
  return usd.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: opts?.cents ? 2 : 0,
    maximumFractionDigits: opts?.cents ? 2 : 0,
  });
}

export function fmtDistance(mi: number): string {
  return `${mi.toLocaleString("en-US")} mi`;
}

export function fmtDate(iso?: string): string {
  if (!iso) return "—";
  return format(new Date(iso), "dd MMM");
}

export function fmtDateTime(iso?: string): string {
  if (!iso) return "—";
  return `${format(new Date(iso), "dd MMM, HH:mm")} ${TZ_ABBR}`;
}

export function fmtTime(iso?: string): string {
  if (!iso) return "—";
  return `${format(new Date(iso), "HH:mm")} ${TZ_ABBR}`;
}

export function fmtWindow(start: string, end: string): string {
  return `${format(new Date(start), "dd MMM, HH:mm")}–${format(
    new Date(end),
    "HH:mm"
  )} ${TZ_ABBR}`;
}

export function fmtRelative(iso?: string): string {
  if (!iso) return "—";
  return `${formatDistanceToNowStrict(new Date(iso))} ago`;
}

export function fmtCoords(lat: number, lng: number): string {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

export function fmtMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

/** Returns 'expired' | 'expiring' | 'ok' relative to now (30-day window). */
export function expiryStatus(iso: string): "expired" | "expiring" | "ok" {
  const days = differenceInDays(new Date(iso), new Date());
  if (days < 0) return "expired";
  if (days <= 30) return "expiring";
  return "ok";
}

export function fmtPercent(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}
