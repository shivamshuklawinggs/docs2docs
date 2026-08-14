"use client";

import { Hammer } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { EmptyState } from "@/components/data/states";

// Instructional placeholder for screens scoped to later build phases (spec §12).
export function Placeholder({
  title,
  subtitle,
  phase,
}: {
  title: string;
  subtitle: string;
  phase: string;
}) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <EmptyState
        icon={Hammer}
        title={`${title} — scheduled for ${phase}`}
        body="This screen is defined in the build spec and wired into navigation and role-based access. Its data-rich UI lands in a later build phase."
      />
    </div>
  );
}
