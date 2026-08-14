"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeft } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { NAV } from "@/lib/rbac";
import { useSession } from "@/lib/store/session";
import { ICONS } from "./icons";

export function Sidebar() {
  const role = useSession((s) => s.role);
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  if (!role) return null;
  const items = NAV[role];
  const main = items.filter((i) => i.section === "main");
  const corporate = items.filter((i) => i.section === "corporate");
  const admin = items.filter((i) => i.section === "admin");

  const renderItem = (item: (typeof items)[number]) => {
    const Icon = ICONS[item.icon];
    const active = pathname === item.href || pathname.startsWith(item.href + "/");
    return (
      <Link
        key={item.key}
        href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-body-sm transition-colors",
          active
            ? "bg-[var(--d2d-primary-hover)] font-medium text-white"
            : "text-white/70 hover:bg-white/10 hover:text-white",
          collapsed && "justify-center px-0"
        )}
        title={collapsed ? item.label : undefined}
      >
        {Icon && <Icon className="h-[18px] w-[18px] shrink-0" />}
        {!collapsed && <span>{item.label}</span>}
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-dvh flex-col bg-[var(--d2d-ink)] text-white transition-[width]",
        collapsed ? "w-16" : "w-[248px]"
      )}
    >
      <div className={cn("flex h-14 items-center gap-2 px-4", collapsed && "justify-center px-0")}>
        <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius)] bg-[var(--d2d-signal)] font-display text-sm font-bold text-[var(--d2d-ink)]">
          D2
        </div>
        {!collapsed && (
          <span className="font-display text-title font-bold tracking-tight">Docks2Doc</span>
        )}
      </div>

      <nav className="d2d-scroll flex-1 space-y-1 overflow-y-auto px-2 py-3">
        {main.map(renderItem)}
        {corporate.length > 0 && (
          <div className="pt-3">
            {!collapsed && (
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Corporate
              </p>
            )}
            <div className="space-y-1 border-t border-white/10 pt-2">
              {corporate.map(renderItem)}
            </div>
          </div>
        )}
        {admin.length > 0 && (
          <div className="pt-3">
            {!collapsed && (
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Platform
              </p>
            )}
            <div className="space-y-1 border-t border-white/10 pt-2">
              {admin.map(renderItem)}
            </div>
          </div>
        )}
      </nav>

      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex h-11 items-center gap-2 border-t border-white/10 px-4 text-body-sm text-white/60 hover:text-white"
      >
        {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        {!collapsed && <span>Collapse</span>}
      </button>
    </aside>
  );
}
