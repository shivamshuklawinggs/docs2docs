// Real API client — talks to backend/ (Node + Express + MongoDB).
// Mirrors the method surface of lib/mock/api.ts so it can be swapped in
// as a drop-in replacement (see lib/mock/api.ts USE_BACKEND branch).
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
} from "@/types";
import { http, setToken } from "./http";

interface Envelope<T> {
  success: boolean;
  data: T;
}

function scopeQuery(scope: Scope) {
  const query: Record<string, string | undefined> = { companyId: scope.companyId, branchId: scope.branchId, role: scope.role };
  // For superadmin viewing all branches, use "ALL" for companyId
  if (scope.role === "SUPER_ADMIN" && scope.companyId === "ALL") {
    query.companyId = "ALL";
  }
  return query;
}

export const apiClient = {
  async login(email: string, password: string) {
    const res = await http.post<{ success: boolean; token: string; user: User; scope: Scope }>(
      "/auth/login",
      { email, password }
    );
    setToken(res.token);
    return res;
  },

  async me(): Promise<User | null> {
    try {
      const res = await http.get<{ success: boolean; user: User }>("/auth/me");
      return res.user;
    } catch {
      return null;
    }
  },

  async register(payload: {
    companyName: string;
    type: Company["type"];
    plan: Company["plan"];
    branchCity: string;
    branchState: string;
    branchAddress?: string;
    adminName: string;
    adminEmail: string;
    adminPassword: string;
    dotNumber?: string;
    mcNumber?: string;
    phone?: string;
    status?: Company["status"];
  }) {
    return http.post<{ success: boolean; company: Company; admin: User }>("/auth/register", payload);
  },

  logout() {
    setToken(null);
  },

  async getLoads(filter: LoadFilter, scope: Scope): Promise<Load[]> {
    const res = await http.get<Envelope<Load[]>>("/loads", { ...scopeQuery(scope), ...filter });
    return res.data;
  },
  async getLoad(id: string, scope: Scope): Promise<Load | null> {
    try {
      const res = await http.get<Envelope<Load>>(`/loads/${id}`, scopeQuery(scope));
      return res.data;
    } catch {
      return null;
    }
  },
  async getDrivers(scope: Scope): Promise<Driver[]> {
    const res = await http.get<Envelope<Driver[]>>("/drivers", scopeQuery(scope));
    return res.data;
  },
  async getEquipment(scope: Scope): Promise<Equipment[]> {
    const res = await http.get<Envelope<Equipment[]>>("/equipment", scopeQuery(scope));
    return res.data;
  },
  async getInvoices(scope: Scope): Promise<Invoice[]> {
    const res = await http.get<Envelope<Invoice[]>>("/invoices", scopeQuery(scope));
    return res.data;
  },
  async getCompanies(type?: Company["type"]): Promise<Company[]> {
    const res = await http.get<Envelope<Company[]>>("/companies", type ? { type } : {});
    console.log(res.data);
    return res.data;
  },
  async searchCarriers(query: string): Promise<Company[]> {
    const res = await http.get<Envelope<Company[]>>("/companies", { search: query, type: "CARRIER" });
    return res.data;
  },
  async getUsers(scope: Scope): Promise<User[]> {
    const res = await http.get<Envelope<User[]>>("/users", scopeQuery(scope));
    return res.data;
  },
  async createUser(name: string, email: string, password: string, role: User["role"], companyId: string, branchIds: string[], permissions: string[] = []): Promise<User> {
    const res = await http.post<Envelope<User>>("/users", {
      name,
      email,
      password,
      role,
      companyId,
      branchIds,
      permissions,
    });
    return res.data;
  },
  async getBranches(scope: Scope): Promise<Branch[]> {
    const res = await http.get<Envelope<Branch[]>>("/branches", scopeQuery(scope));
    return res.data;
  },
  async createBranch(companyId: string, name: string, city: string, state: string, level: Branch["level"], managerId?: string): Promise<Branch> {
    const res = await http.post<Envelope<Branch>>("/branches", {
      companyId,
      name,
      city,
      state,
      level,
      managerId: managerId || "",
    });
    return res.data;
  },
  async createDriver(name: string, email: string, phone: string, password: string, companyId: string, branchId?: string): Promise<Driver> {
    const res = await http.post<Envelope<Driver>>("/drivers", {
      name,
      email,
      phone,
      password,
      companyId,
      branchId: branchId || "ALL",
    });
    return res.data;
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
    const res = await http.post<Envelope<Equipment>>("/equipment", {
      type,
      unitNumber,
      branchId,
      vin,
      insuranceExpiry,
      photos,
      ...additional,
    });
    return res.data;
  },
  async getReviews(subjectId?: string): Promise<Review[]> {
    const res = await http.get<Envelope<Review[]>>("/reviews", { subjectId });
    return res.data;
  },
  async getNotifications(): Promise<Notification[]> {
    const res = await http.get<Envelope<Notification[]>>("/notifications");
    return res.data;
  },

  async advanceLoad(id: string): Promise<Load | null> {
    const res = await http.post<Envelope<Load>>(`/loads/${id}/advance`);
    return res.data;
  },
  async triggerArrival(id: string): Promise<Load | null> {
    const res = await http.post<Envelope<Load>>(`/loads/${id}/trigger-arrival`);
    return res.data;
  },
  async addDelay(id: string): Promise<Load | null> {
    const res = await http.post<Envelope<Load>>(`/loads/${id}/add-delay`);
    return res.data;
  },
  async resetLoad(id: string): Promise<Load | null> {
    const res = await http.post<Envelope<Load>>(`/loads/${id}/reset`);
    return res.data;
  },
  async assignDriver(id: string, driverId: string): Promise<Load | null> {
    const res = await http.post<Envelope<Load>>(`/loads/${id}/assign-driver`, { driverId });
    return res.data;
  },
  async updateLoad(id: string, updates: Partial<Load>): Promise<Load | null> {
    const res = await http.patch<Envelope<Load>>(`/loads/${id}`, updates);
    return res.data;
  },
  async createLoad(partial: Partial<Load>): Promise<Load> {
    const res = await http.post<Envelope<Load>>("/loads", partial);
    return res.data;
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
    const res = await http.post<{ success: boolean; company: Company; admin: User }>(
      "/auth/register",
      {
        companyName: name,
        type,
        plan,
        branchCity,
        branchState,
        branchAddress,
        adminName,
        adminEmail,
        adminPassword: adminPassword || "demo1234",
        status,
        dotNumber,
        mcNumber,
        phone,
      }
    );
    return { company: res.company, admin: res.admin };
  },
  async approveCompany(companyId: string): Promise<Company | null> {
    const res = await http.post<Envelope<Company>>(`/companies/${companyId}/approve`);
    return res.data;
  },
  async declineCompany(companyId: string): Promise<Company | null> {
    const res = await http.post<Envelope<Company>>(`/companies/${companyId}/decline`);
    return res.data;
  },
  async updateCompany(companyId: string, updates: Partial<Company>): Promise<Company> {
    const res = await http.patch<Envelope<Company>>(`/companies/${companyId}`, updates);
    return res.data;
  },
};
