"use client";

import * as React from "react";
import type { Permission } from "@/types";
import { can } from "@/lib/rbac";
import { useSession } from "@/lib/store/session";

// Wraps anything role-gated; renders nothing by default (spec §10)
export function PermissionGate({
  action,
  children,
  fallback = null,
}: {
  action: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const role = useSession((s) => s.role);
  if (!role || !can(role, action)) return <>{fallback}</>;
  return <>{children}</>;
}
