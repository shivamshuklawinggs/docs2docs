"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Bell,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/store/session";
import { ROLE_LABEL, isCorporate } from "@/lib/rbac";
import { api } from "@/lib/mock/api";
import { useAsync } from "@/lib/hooks";
import { useDataVersion } from "@/lib/store/data";
import { fmtRelative } from "@/lib/format";
import type { Notification, Company, Branch } from "@/types";

export function Topbar() {
  const router = useRouter();
  const { user, role, mode, setMode, logout, branchId, setBranch } = useSession();
  const version = useDataVersion((s) => s.version);
  const [bellOpen, setBellOpen] = useState(false);
  const [acctOpen, setAcctOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: companies } = useAsync(() => api.getCompanies(), [version]);
  const { data: notificationList } = useAsync(() => api.getNotifications(), [version]);
  const { data: branchList } = useAsync(() => user && role ? api.getBranches({ companyId: user.companyId, branchId: "ALL", role }) : Promise.resolve([]), [user?.companyId, role, version]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setBellOpen(false);
        setAcctOpen(false);
        setBranchOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!user || !role) return null;

  const company = companies?.find((c: Company) => c.id === user.companyId);
  const branches = branchList ?? [];
  const corporate = isCorporate(role);
  const notifications: Notification[] = [...(notificationList ?? [])].sort(
    (a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)
  );
  const unread = notifications.filter((n) => !n.read).length;
  const isShipper = role === "SHIPPER_RECEIVER";

  const currentBranchLabel =
    branchId === "ALL"
      ? "All branches"
      : branches.find((b: Branch) => b.id === branchId)?.city ?? "Branch";

  return (
    <header
      ref={ref}
      className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[var(--d2d-line)] bg-[var(--d2d-surface)] px-6"
    >
      {/* Global search */}
      <div className="relative flex-1 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--d2d-ink-faint)]" />
        <input
          placeholder="Search loads, drivers, docs…"
          className="h-9 w-full rounded-[var(--radius)] border border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] pl-9 pr-14 text-body-sm outline-none focus:border-[var(--d2d-primary)]"
        />
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-[var(--d2d-line)] bg-white px-1.5 py-0.5 font-mono text-[10px] text-[var(--d2d-ink-faint)]">
          ⌘K
        </kbd>
      </div>

      <div className="flex-1" />

      {/* Shipper/Receiver mode switch */}
      {isShipper && (
        <div className="flex rounded-[var(--radius)] border border-[var(--d2d-line)] p-0.5 text-body-sm">
          <button
            onClick={() => setMode("OUTBOUND")}
            className={cn(
              "flex items-center gap-1.5 rounded-[4px] px-2.5 py-1",
              mode === "OUTBOUND"
                ? "bg-[var(--d2d-primary)] text-white"
                : "text-[var(--d2d-ink-soft)]"
            )}
          >
            <ArrowUp className="h-3.5 w-3.5" /> Outbound
          </button>
          <button
            onClick={() => setMode("INBOUND")}
            className={cn(
              "flex items-center gap-1.5 rounded-[4px] px-2.5 py-1",
              mode === "INBOUND"
                ? "bg-[var(--d2d-primary)] text-white"
                : "text-[var(--d2d-ink-soft)]"
            )}
          >
            <ArrowDown className="h-3.5 w-3.5" /> Inbound
          </button>
        </div>
      )}

      {/* Branch scope selector for corporate users */}
      {corporate ? (
        <div className="relative">
          <button
            onClick={() => setBranchOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-[var(--radius)] border border-[var(--d2d-line)] px-3 py-1.5 text-body-sm hover:bg-[var(--d2d-surface-sunk)]"
          >
            <span className="text-[var(--d2d-ink-faint)]">Branch:</span>
            <span className="font-medium">{currentBranchLabel}</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {branchOpen && (
            <div className="absolute right-0 top-full z-40 mt-1 w-56 rounded-[var(--radius)] border border-[var(--d2d-line)] bg-white py-1 shadow-[var(--d2d-shadow)]">
              <button
                onClick={() => {
                  setBranch("ALL");
                  setBranchOpen(false);
                }}
                className="block w-full px-3 py-1.5 text-left text-body-sm hover:bg-[var(--d2d-surface-sunk)]"
              >
                All branches
              </button>
              {branches
                .filter((b) => b.level === "SATELLITE" || b.level === "CORPORATE")
                .map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setBranch(b.id);
                      setBranchOpen(false);
                    }}
                    className="flex w-full items-center justify-between px-3 py-1.5 text-left text-body-sm hover:bg-[var(--d2d-surface-sunk)]"
                  >
                    <span>{b.city}, {b.state}</span>
                    <span className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-medium",
                      b.level === "CORPORATE"
                        ? "bg-[var(--d2d-primary-tint)] text-[var(--d2d-primary)]"
                        : "bg-[var(--d2d-surface-sunk)] text-[var(--d2d-ink-soft)]"
                    )}>
                      {b.level === "CORPORATE" ? "HQ" : "Satellite"}
                    </span>
                  </button>
                ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Notification bell */}
      <div className="relative">
        <button
          onClick={() => setBellOpen((o) => !o)}
          className="relative flex h-9 w-9 items-center justify-center rounded-[var(--radius)] hover:bg-[var(--d2d-surface-sunk)]"
        >
          <Bell className="h-[18px] w-[18px] text-[var(--d2d-ink-soft)]" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--d2d-danger)] px-1 text-[10px] font-medium text-white">
              {unread}
            </span>
          )}
        </button>
        {bellOpen && (
          <div className="absolute right-0 top-full z-40 mt-1 max-h-96 w-80 overflow-y-auto rounded-[var(--radius)] border border-[var(--d2d-line)] bg-white shadow-[var(--d2d-shadow)] d2d-scroll">
            <p className="border-b border-[var(--d2d-line)] px-3 py-2 text-label text-[var(--d2d-ink-faint)]">
              Notifications
            </p>
            {notifications.slice(0, 12).map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  if (n.loadId) router.push(`/loads/${n.loadId}`);
                  setBellOpen(false);
                }}
                className={cn(
                  "flex w-full flex-col items-start border-b border-[var(--d2d-line)] px-3 py-2 text-left hover:bg-[var(--d2d-surface-sunk)]",
                  n.pinned && "bg-[var(--d2d-signal-tint)]"
                )}
              >
                <span className="text-body-sm font-medium text-[var(--d2d-ink)]">{n.title}</span>
                <span className="text-[12px] text-[var(--d2d-ink-soft)]">{n.body}</span>
                <span className="mt-0.5 font-mono text-[11px] text-[var(--d2d-ink-faint)]">
                  {fmtRelative(n.at)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Account menu */}
      <div className="relative">
        <button
          onClick={() => setAcctOpen((o) => !o)}
          className="flex items-center gap-2 rounded-[var(--radius)] px-1.5 py-1 hover:bg-[var(--d2d-surface-sunk)]"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--d2d-primary)] text-xs font-medium text-white">
            {user.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-[var(--d2d-ink-faint)]" />
        </button>
        {acctOpen && (
          <div className="absolute right-0 top-full z-40 mt-1 w-56 rounded-[var(--radius)] border border-[var(--d2d-line)] bg-white py-1 shadow-[var(--d2d-shadow)]">
            <div className="border-b border-[var(--d2d-line)] px-3 py-2">
              <p className="text-body-sm font-medium">{user.name}</p>
              <p className="text-[12px] text-[var(--d2d-ink-soft)]">{ROLE_LABEL[role]}</p>
              <p className="mt-0.5 font-mono text-[11px] text-[var(--d2d-ink-faint)]">{company?.name}</p>
            </div>
            <button
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-body-sm text-[var(--d2d-danger)] hover:bg-[var(--d2d-surface-sunk)]"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
