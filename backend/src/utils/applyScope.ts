// The ONE place branch-isolation logic lives (mirrors lib/mock/api.ts §9.3).
// `scope` = { companyId, branchId, role, userId } — branchId "ALL" disables the filter.

interface Scope {
  companyId?: string;
  branchId?: string | "ALL";
  role?: string;
  userId?: string;
  branchIds?: string[];
}

interface Query {
  companyId?: string;
  branchId?: string;
  role?: string;
}

interface UserContext {
  _id: string;
  role: string;
  companyId: string;
  branchIds: string[];
  carrierId?: string;
}

/**
 * Parse scope from query parameters and user context
 * Ensures users can only access data within their company and branch access
 */
function parseScope(query: Query, user?: UserContext): Scope {
  // If no user context, use query parameters (for public endpoints)
  if (!user) {
    return {
      companyId: query.companyId,
      branchId: query.branchId || "ALL",
      role: query.role,
    };
  }

  // For SUPER_ADMIN, allow full access with query parameters
  if (user.role === "SUPER_ADMIN") {
    return {
      companyId: query.companyId,
      branchId: query.branchId || "ALL",
      role: user.role,
      userId: user._id,
    };
  }

  // For all other roles, enforce company-level isolation
  const scope: Scope = {
    companyId: user.companyId, // Always use user's companyId
    role: user.role,
    userId: user._id,
  };

  // Handle branch-level access
  if (user.branchIds.includes("ALL")) {
    // Corporate users can see all branches unless specific branch requested
    scope.branchId = query.branchId || "ALL";
  } else {
    // Satellite users are restricted to their assigned branches
    scope.branchId = user.branchIds[0] || "ALL";
    scope.branchIds = user.branchIds;
  }

  // For drivers, add carrierId for filtering
  if (user.role === "DRIVER" && user.carrierId) {
    // This will be used in scopeFilter
  }

  return scope;
}

/**
 * Build MongoDB query filter based on scope and user context
 * Ensures proper data isolation at company and branch level
 */
function scopeFilter(scope: Scope, user?: UserContext): Record<string, any> {
  const filter: Record<string, any> = {};

  // SUPER_ADMIN can bypass filters
  if (user?.role === "SUPER_ADMIN") {
    return {
      role:{
        $in:["SUPER_ADMIN", "PLATFORM_ADMIN", "COMPANY_ADMIN", "CARRIER_CORP", "CARRIER_SATELLITE", "DRIVER"]
      }
    };
  }

  // Always enforce company-level isolation (except for SUPER_ADMIN)
  if (scope.companyId && user?.role !== "SUPER_ADMIN") {
    filter.companyId = scope.companyId;
  }

  // Handle branch-level filtering
  if (scope.branchId && scope.branchId !== "ALL") {
    filter.branchId = scope.branchId;
  } else if (scope.branchIds && scope.branchIds.length > 0) {
    // User has specific branch assignments
    filter.branchId = { $in: scope.branchIds };
  }

  // For drivers, filter by their own ID or carrier assignment
  if (scope.role === "DRIVER" && user) {
    // Drivers can only see their own records or records where they're assigned
    filter.$or = [
      { _id: user._id }, // Their own user record
      { driverId: user._id }, // Loads assigned to them
      { carrierId: user.carrierId || user.companyId }, // Their carrier's data
    ];
  }

  // For non-corporate users, exclude themselves from user lists
  if (user && scope.role !== "SUPER_ADMIN" && scope.role !== "DRIVER") {
    filter._id = { $ne: user._id };
  }

  return filter;
}

/**
 * Enhanced scope filter for load-specific queries
 * Handles carrier assignment and driver-specific loads
 */
function loadScopeFilter(scope: Scope, user?: UserContext): Record<string, any> {
  const filter: Record<string, any> = {}

  // Special handling for CARRIER_CORP role to see all carrier loads
  if ((user?.role === "CARRIER_CORP"  || user?.role === "CARRIER_SATELLITE")  && scope.companyId) {
    filter["carrier.carrierId"] = scope.companyId;
    delete filter.branchId; // Remove branch filter for corporate carrier view
  }else if(user?.role=="BROKER_CORP" || user?.role=="BROKER_BRANCH") {
    const baseFilter: Record<string, any> = scopeFilter(scope, user);
    Object.assign(filter, baseFilter);
  }

  // For drivers, only show loads assigned to them
  else if (user?.role === "DRIVER") {
    filter.driverId = user._id;
    delete filter.$or; // Remove the generic $or filter for specific driver queries
  }

  return filter;
}

export { scopeFilter, parseScope, loadScopeFilter };
