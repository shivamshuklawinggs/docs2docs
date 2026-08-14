// Mock API wrapper (spec §9.3). Every read goes through here so Phase 2
// only needs to swap the internals for `fetch`.
import type {
  Load,
  LoadFilter,
  Scope,
  Driver,
  Equipment,
  Invoice,
  Company,
  User,
  Review,
  Notification,
  Branch,
  Permission,
} from "@/types";
import { SEED } from "./seed";
import {
  DB,
  advanceLoad,
  triggerArrival,
  addDelay,
  resetLoad,
  assignDriver,
  createLoad,
  createCompany,
  approveCompany,
  declineCompany,
} from "./db";
import { apiClient } from "@/lib/api/client";
import { USE_BACKEND } from "@/lib/api/http";

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

// The ONE place branch-isolation logic lives (spec §9.3).
export function applyScope<T extends { branchId?: string } | { branchIds?: string[] }>(
  rows: T[],
  scope: Scope
): T[] {
  if (scope.branchId === "ALL") return rows;
  return rows.filter((r) => {
    if ('branchId' in r) return r.branchId === scope.branchId;
    if ('branchIds' in r && r.branchIds) return r.branchIds.includes(scope.branchId);
    return false;
  });
}



export const api = {
  async getLoads(filter: LoadFilter, scope: Scope): Promise<Load[]> {
    return apiClient.getLoads(filter, scope);
   
  },
  async getLoad(id: string, scope: Scope): Promise<Load | null> {
     return apiClient.getLoad(id, scope);

  },
  async getDrivers(scope: Scope): Promise<Driver[]> {
    if (USE_BACKEND) return apiClient.getDrivers(scope);
    await delay();
    return applyScope(SEED.drivers, scope);
  },
  async createDriver(name: string, email: string, phone: string, password: string, companyId: string, branchId?: string): Promise<Driver> {
    if (USE_BACKEND) return apiClient.createDriver(name, email, phone, password, companyId, branchId);
    await delay();
    const newDriver: Driver = {
      id: `drv-${Date.now()}`,
      name,
      email,
      role: "DRIVER",
      companyId,
      branchIds: [branchId || "ALL"],
      driver: {
        phone,
        status: "AVAILABLE",
        carrierId: companyId,
        addresses: [],
        phones: [phone],
        emergencyContacts: [],
        licenses: [],
        endorsements: [],
        medicalCertExpiry: "",
        workHistory: [],
        rating: 4.5,
        loadsCompleted: 0,
      },
    };
    SEED.drivers.push(newDriver);
    return newDriver;
  },
  async getEquipment(scope: Scope): Promise<Equipment[]> {
    if (USE_BACKEND) return apiClient.getEquipment(scope);
    await delay();
    return applyScope(SEED.equipment, scope);
  },
  async createEquipment(type: Equipment["type"], unitNumber: string, branchId: string, vin?: string, insuranceExpiry?: string, photos?: string[], additional?: {
    make?: string;
    model?: string;
    year?: number;
    plates?: { state: string; number: string; expiry: string }[];
    dotNumber?: string;
    mcNumbers?: string[];
    ifta?: string;
    permits?: string[];
    prePass?: string;
    tollAccounts?: string[];
    insurance?: { carrier: string; policy: string; expiry: string };
  }): Promise<Equipment> {
    if (USE_BACKEND) return apiClient.createEquipment(type, unitNumber, branchId, vin, insuranceExpiry, photos, additional);
    await delay();
    const newEquipment: Equipment = {
      id: `eq-${Date.now()}`,
      type,
      unitNumber,
      branchId,
      vin: vin || "",
      make: additional?.make || "",
      model: additional?.model || "",
      year: additional?.year || new Date().getFullYear(),
      plates: additional?.plates || [],
      dotNumber: additional?.dotNumber,
      mcNumbers: additional?.mcNumbers,
      ifta: additional?.ifta || "",
      permits: additional?.permits || [],
      prePass: additional?.prePass,
      tollAccounts: additional?.tollAccounts || [],
      insurance: additional?.insurance || { carrier: "", policy: "", expiry: insuranceExpiry || "" },
      inspections: [],
      maintenance: [],
      photos: photos || [],
    };
    SEED.equipment.push(newEquipment);
    return newEquipment;
  },
  async getInvoices(scope: Scope): Promise<Invoice[]> {
    if (USE_BACKEND) return apiClient.getInvoices(scope);
    await delay();
    const scopedLoadIds = new Set(applyScope(DB.loads, scope).map((l) => l.id));
    return DB.invoices.filter((i) => scopedLoadIds.has(i.loadId));
  },
  async getCompanies(type?: Company["type"]): Promise<Company[]> {
    if (USE_BACKEND) return apiClient.getCompanies(type);
    await delay();
    return type ? DB.companies.filter((c) => c.type === type) : DB.companies;
  },
  async searchCarriers(query: string): Promise<Company[]> {
    if (USE_BACKEND) return apiClient.searchCarriers(query);
    await delay();
    const lowerQuery = query.toLowerCase();
    return DB.companies.filter((c) => 
      c.type === "CARRIER" &&
      (c.name.toLowerCase().includes(lowerQuery) ||
       c.dotNumber?.toLowerCase().includes(lowerQuery) ||
       c.mcNumbers?.some((mc) => mc.toLowerCase().includes(lowerQuery)))
    );
  },
  async getUsers(scope: Scope): Promise<User[]> {
    if (USE_BACKEND) return apiClient.getUsers(scope);
    await delay();
    if (scope.branchId === "ALL") return SEED.users.filter((u) => u.companyId === scope.companyId);
    return SEED.users.filter(
      (u) => u.companyId === scope.companyId && u.branchIds.includes(scope.branchId)
    );
  },
  async createUser(name: string, email: string, password: string, role: User["role"], companyId: string, branchIds: string[], permissions: Permission[] = []): Promise<User> {
    if (USE_BACKEND) return apiClient.createUser(name, email, password, role, companyId, branchIds, permissions);
    await delay();
    const newUser: User = {
      id: `usr-${Date.now()}`,
      name,
      email,
      role,
      companyId,
      branchIds,
      permissions,
      lastActive: undefined,
    };
    SEED.users.push(newUser);
    return newUser;
  },
  async getBranches(scope: Scope): Promise<Branch[]> {
    if (USE_BACKEND) return apiClient.getBranches(scope);
    await delay();
    // If SUPER_ADMIN with companyId "ALL", return all branches
    if (scope.role === "SUPER_ADMIN" && scope.companyId === "ALL") {
      return SEED.companies.flatMap((c) => c.branches);
    }
    // Otherwise, filter by specific company
    const company = SEED.companies.find((c) => c.id === scope.companyId);
    return company?.branches ?? [];
  },
  async createBranch(companyId: string, name: string, city: string, state: string, level: Branch["level"], managerId?: string): Promise<Branch> {
    if (USE_BACKEND) return apiClient.createBranch(companyId, name, city, state, level, managerId);
    await delay();
    const newBranch: Branch = {
      id: `br-${Date.now()}`,
      companyId,
      name,
      address: "",
      city,
      state,
      level,
      managerId: managerId || "",
    };
    const company = SEED.companies.find((c) => c.id === companyId);
    if (company) {
      company.branches.push(newBranch);
    }
    return newBranch;
  },
  async getReviews(subjectId?: string): Promise<Review[]> {
    if (USE_BACKEND) return apiClient.getReviews(subjectId);
    await delay();
    return subjectId ? SEED.reviews.filter((r) => r.subjectId === subjectId) : SEED.reviews;
  },
  async getNotifications(): Promise<Notification[]> {
    if (USE_BACKEND) return apiClient.getNotifications();
    await delay(200);
    return DB.notifications;
  },

  // ---- mutations (spec §7.3 demo controls, §9.3) ----
  async advanceLoad(id: string): Promise<Load | null> {
    if (USE_BACKEND) return apiClient.advanceLoad(id);
    await delay(250);
    return advanceLoad(id);
  },
  async triggerArrival(id: string): Promise<Load | null> {
    if (USE_BACKEND) return apiClient.triggerArrival(id);
    await delay(200);
    return triggerArrival(id);
  },
  async addDelay(id: string): Promise<Load | null> {
    if (USE_BACKEND) return apiClient.addDelay(id);
    await delay(200);
    return addDelay(id);
  },
  async resetLoad(id: string): Promise<Load | null> {
    if (USE_BACKEND) return apiClient.resetLoad(id);
    await delay(250);
    return resetLoad(id);
  },
  async assignDriver(id: string, driverId: string): Promise<Load | null> {
    if (USE_BACKEND) return apiClient.assignDriver(id, driverId);
    await delay(300);
    return assignDriver(id, driverId);
  },
  async updateLoad(id: string, updates: Partial<Load>): Promise<Load | null> {
    if (USE_BACKEND) return apiClient.updateLoad(id, updates);
    await delay(300);
    const load = DB.loads.find((l) => l.id === id);
    if (!load) return null;
    Object.assign(load, updates);
    return load;
  },
  async createLoad(partial: Partial<Load>): Promise<Load> {
    if (USE_BACKEND) return apiClient.createLoad(partial);
    await delay(400);
    return createLoad(partial);
  },
  async createCompany(
    name: string,
    type: Company["type"],
    plan: Company["plan"],
    branchCity: string,
    branchState: string,
    adminName: string,
    adminEmail: string,
    status: Company["status"],
    dotNumber?: string,
    mcNumber?: string,
    phone?: string,
    adminPassword?: string,
    branchAddress?: string
  ): Promise<{ company: Company; admin: User }> {
    if (USE_BACKEND)
      return apiClient.createCompany(name, type, plan, branchCity, branchState, adminName, adminEmail, status, dotNumber, mcNumber, phone, adminPassword, branchAddress);
    await delay(500);
    return createCompany(name, type, plan, branchCity, branchState, adminName, adminEmail, status, dotNumber, mcNumber, phone, adminPassword, branchAddress);
  },
  async approveCompany(companyId: string): Promise<Company | null> {
    if (USE_BACKEND) return apiClient.approveCompany(companyId);
    await delay(300);
    return approveCompany(companyId);
  },
  async declineCompany(companyId: string): Promise<Company | null> {
    if (USE_BACKEND) return apiClient.declineCompany(companyId);
    await delay(300);
    return declineCompany(companyId);
  },
  async updateCompany(companyId: string, updates: Partial<Company>): Promise<Company> {
    if (USE_BACKEND) return apiClient.updateCompany(companyId, updates);
    await delay(300);
    const company = SEED.companies.find((c) => c.id === companyId);
    if (!company) throw new Error("Company not found");
    Object.assign(company, updates);
    return company;
  },
};

export { SEED };
