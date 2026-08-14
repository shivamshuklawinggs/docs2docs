// Role → nav + permission map (spec §6)
import type { Role, NavItem, Permission } from "@/types";

// Full nav catalog. Each role selects a subset (hidden means not rendered).
const N = {
  dashboard: { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard", section: "main" },
  loads: { key: "loads", label: "Load board", href: "/loads", icon: "Truck", section: "main" },
  dispatch: { key: "dispatch", label: "Dispatch", href: "/dispatch", icon: "LayoutGrid", section: "main" },
  drivers: { key: "drivers", label: "Drivers", href: "/drivers", icon: "IdCard", section: "main" },
  equipment: { key: "equipment", label: "Equipment", href: "/equipment", icon: "Container", section: "main" },
  carriers: { key: "carriers", label: "Carriers", href: "/carriers", icon: "Building2", section: "main" },
  inbound: { key: "inbound", label: "Inbound", href: "/inbound", icon: "PackageOpen", section: "main" },
  dock: { key: "dock", label: "Dock schedule", href: "/dock-schedule", icon: "Warehouse", section: "main" },
  documents: { key: "documents", label: "Documents", href: "/documents", icon: "FileText", section: "main" },
  invoices: { key: "invoices", label: "Invoices", href: "/invoices", icon: "Receipt", section: "main" },
  ratings: { key: "ratings", label: "Ratings", href: "/ratings", icon: "Star", section: "main" },
  reports: { key: "reports", label: "Reports", href: "/reports", icon: "BarChart3", section: "main" },
  branches: { key: "branches", label: "Branches", href: "/branches", icon: "Network", section: "corporate" },
  users: { key: "users", label: "Users", href: "/users", icon: "Users", section: "corporate" },
  billing: { key: "billing", label: "Billing", href: "/billing", icon: "CreditCard", section: "corporate" },
  settings: { key: "settings", label: "Settings", href: "/settings", icon: "Settings", section: "corporate" },
  companies: { key: "companies", label: "Companies", href: "/admin/companies", icon: "Building", section: "admin" },
  subscriptions: { key: "subscriptions", label: "Subscriptions", href: "/admin/subscriptions", icon: "BadgeDollarSign", section: "admin" },
  advertising: { key: "advertising", label: "Advertising", href: "/admin/advertising", icon: "Megaphone", section: "admin" },
  compliance: { key: "compliance", label: "Compliance", href: "/admin/compliance", icon: "ShieldCheck", section: "admin" },
  analytics: { key: "analytics", label: "Analytics", href: "/admin/analytics", icon: "Activity", section: "admin" },
} satisfies Record<string, NavItem>;

export const NAV: Record<Role, NavItem[]> = {
  SUPER_ADMIN: [
    N.dashboard, /* N.loads, */ /* N.drivers, */ /* N.documents, */ /* N.invoices, */ N.ratings, N.reports,
     N.users, N.billing,
    N.companies, N.subscriptions, /* N.advertising, */ N.compliance, N.analytics,
  ],
  CARRIER_CORP: [
    N.dashboard, N.loads, N.dispatch, N.drivers, N.equipment, N.documents,
    N.invoices, N.ratings, N.reports, N.branches, N.users, N.billing, N.settings,
  ],
  CARRIER_BRANCH: [
    N.dashboard, N.loads, N.dispatch, N.drivers, N.equipment, N.documents,
    N.invoices, N.ratings, N.reports, N.users, N.settings,
  ],
  BROKER_CORP: [
    N.dashboard, N.loads, N.dispatch, N.drivers, N.carriers, N.documents,
    N.invoices, N.ratings, N.reports, N.branches, N.users, N.billing, N.settings,
  ],
  BROKER_BRANCH: [
    N.dashboard, N.loads, N.dispatch, N.drivers, N.carriers, N.documents,
    N.invoices, N.ratings, N.reports, N.users, N.settings,
  ],
  SHIPPER_RECEIVER: [
    N.dashboard, N.loads, N.inbound, N.dock, N.documents, N.invoices,
    N.ratings, N.reports, N.branches, N.users, N.billing, N.settings,
  ],
  DRIVER: [
    N.dashboard, N.loads, N.documents, N.invoices, N.ratings, N.reports,
  ],
};

const PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    "view:margin", "manage:users", "manage:billing", "manage:branches",
    "impersonate", "view:compliance", "manage:ads", "sign:documents",
  ],
  CARRIER_CORP: [
    "manage:users", "manage:billing", "manage:branches", "assign:driver",
    "sign:documents", "dispatch:load",
  ],
  CARRIER_BRANCH: ["assign:driver", "sign:documents", "dispatch:load"],
  BROKER_CORP: [
    "view:margin", "manage:users", "manage:billing", "manage:branches",
    "create:order", "dispatch:load",
  ],
  BROKER_BRANCH: ["view:margin", "create:order", "dispatch:load"],
  SHIPPER_RECEIVER: [
    "manage:users", "manage:billing", "manage:branches", "create:order",
    "sign:documents",
  ],
  DRIVER: ["sign:documents"],
};

export const can = (role: Role, action: Permission): boolean =>
  PERMISSIONS[role].includes(action);

export const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  CARRIER_CORP: "Carrier — Corporate",
  CARRIER_BRANCH: "Carrier — Branch",
  BROKER_CORP: "Broker — Corporate",
  BROKER_BRANCH: "Broker — Branch",
  SHIPPER_RECEIVER: "Shipper / Receiver",
  DRIVER: "Driver",
};

export const isCorporate = (role: Role): boolean =>
  ["SUPER_ADMIN", "CARRIER_CORP", "BROKER_CORP", "SHIPPER_RECEIVER"].includes(role);

/** Fields of a Load visible to each role (spec §7.2). Margin gated to broker/admin. */
export function visibleFields(role: Role): {
  customerRate: boolean;
  carrierRate: boolean;
  margin: boolean;
} {
  switch (role) {
    case "BROKER_CORP":
    case "BROKER_BRANCH":
    case "SUPER_ADMIN":
      return { customerRate: true, carrierRate: true, margin: true };
    case "CARRIER_CORP":
    case "CARRIER_BRANCH":
      return { customerRate: false, carrierRate: true, margin: false };
    case "SHIPPER_RECEIVER":
      return { customerRate: true, carrierRate: false, margin: false };
    default:
      return { customerRate: false, carrierRate: false, margin: false };
  }
}
