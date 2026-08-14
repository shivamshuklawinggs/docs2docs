// Port of lib/rbac.ts permission map — used server-side to gate mutations.

type Role = "SUPER_ADMIN" | "CARRIER_CORP" | "CARRIER_BRANCH" | "BROKER_CORP" | "BROKER_BRANCH" | "SHIPPER_RECEIVER" | "DRIVER";

type Permission =
  | "view:margin"
  | "manage:users"
  | "manage:billing"
  | "manage:branches"
  | "assign:driver"
  | "sign:documents"
  | "create:order"
  | "dispatch:load"
  | "impersonate"
  | "view:compliance"
  | "manage:ads"
  | "view:loads"
  | "update:location";

const PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    "view:margin",
    "manage:users",
    "manage:billing",
    "manage:branches",
    "impersonate",
    "view:compliance",
    "manage:ads",
    "sign:documents",
  ],
  CARRIER_CORP: [
    "manage:users",
    "manage:billing",
    "manage:branches",
    "assign:driver",
    "sign:documents",
    "dispatch:load",
  ],
  CARRIER_BRANCH: ["assign:driver", "sign:documents", "dispatch:load"],
  BROKER_CORP: [
    "view:margin",
    "manage:users",
    "manage:billing",
    "manage:branches",
    "create:order",
    "dispatch:load",
  ],
  BROKER_BRANCH: ["view:margin", "create:order", "dispatch:load"],
  SHIPPER_RECEIVER: [
    "manage:users",
    "manage:billing",
    "manage:branches",
    "create:order",
    "sign:documents",
  ],
  DRIVER: [
    "view:loads",
    "sign:documents",
    "update:location",
  ],
};

const can = (role: Role, action: Permission): boolean => 
  (PERMISSIONS[role] || []).includes(action);

const isCorporate = (role: Role): boolean =>
  ["SUPER_ADMIN", "CARRIER_CORP", "BROKER_CORP", "SHIPPER_RECEIVER"].includes(role);

export { PERMISSIONS, can, isCorporate };
