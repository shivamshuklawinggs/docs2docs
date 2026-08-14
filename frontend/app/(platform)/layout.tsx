"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { RoleSwitcher } from "@/components/shell/RoleSwitcher";
import { useSession } from "@/lib/store/session";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const role = useSession((s) => s.role);
  const [hydrated, setHydrated] = useState(false);

  // Wait for zustand/persist to rehydrate before deciding to redirect.
  useEffect(() => setHydrated(true), []);
  useEffect(() => {
    if (hydrated && !role) router.replace("/login");
  }, [hydrated, role, router]);

  if (!hydrated || !role) {
    return (
      <div className="flex h-dvh items-center justify-center text-body-sm text-[var(--d2d-ink-faint)]">
        Loading workspace…
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh bg-[var(--d2d-surface-sunk)]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-6">{children}</main>
      </div>
      <RoleSwitcher />
    </div>
  );
}
