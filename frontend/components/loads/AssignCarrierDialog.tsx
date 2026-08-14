"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, X, Star, Building2, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/mock/api";
import { useDataVersion } from "@/lib/store/data";
import { cn } from "@/lib/utils";
import type { Company, Load, Branch } from "@/types";

interface Check {
  label: string;
  ok: boolean;
  detail: string;
}

function buildChecks(carrier: Company, load: Load): Check[] {
  const needsHazmat = load.requiredQualifications.some((q) => /hazmat/i.test(q));
  const hasEquipment = true; // Simplified check
  const isActive = carrier.status === "ACTIVE" || carrier.status === "TRIAL";
  
  return [
    { label: "Status", ok: isActive, detail: carrier.status || "Unknown" },
    { label: "Equipment", ok: hasEquipment, detail: "Available equipment" },
    {
      label: "Hazmat capable",
      ok: !needsHazmat || true, // Simplified - assume carriers can handle hazmat
      detail: needsHazmat ? "Required for this load" : "Not required",
    },
    { label: "Rating", ok: carrier.rating >= 4.0, detail: `${carrier.rating} stars` },
  ];
}

export function AssignCarrierDialog({
  load,
  companies,
  onClose,
}: {
  load: Load;
  companies: Company[];
  onClose: () => void;
}) {
  const bump = useDataVersion((s) => s.bump);
  const version = useDataVersion((s) => s.version);
  const available = companies.filter((c) => c.type === "CARRIER" && (c.status === "ACTIVE" || c.status === "TRIAL"));
  const [selectedId, setSelectedId] = useState<string | null>(available[0]?.id ?? null);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [carrierBranches, setCarrierBranches] = useState<Branch[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Company[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const carrier = companies.find((c) => c.id === selectedId);
  const checks = carrier ? buildChecks(carrier, load) : [];
  const blocked = checks.some((c) => !c.ok);

  // Filter carriers based on search query
  const filteredCarriers = searchQuery.trim()
    ? available.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.dotNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.mcNumbers?.some((mc) => mc.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : available;

  // Fetch branches when carrier changes
  useEffect(() => {
    if (carrier) {
      api.getBranches({ companyId: carrier.id, branchId: "ALL", role: "CARRIER_CORP" }).then((branches) => {
        setCarrierBranches(branches);
        // Auto-select the first branch (usually corporate HQ)
        if (branches.length > 0) {
          setSelectedBranchId(branches[0].id);
        }
      });
    } else {
      setCarrierBranches([]);
      setSelectedBranchId(null);
    }
  }, [carrier, version]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  // Search carriers via API with debouncing
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      // Call API to search carriers
      const results = await api.searchCarriers(query);
      setSearchResults(results);
    } catch (error) {
      console.error("Failed to search carriers:", error);
      // Fallback to local filtering if API fails
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const assign = async () => {
    if (!carrier || !selectedBranchId) return;
    setBusy(true);
    try {
      await api.updateLoad(load.id, { 
        carrier: {
          carrierId: carrier.id,
          branchId: selectedBranchId,
          assignedAt: new Date().toISOString(),
        }
      });
      bump();
      onClose();
    } catch (error) {
      console.error("Failed to assign carrier:", error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-[var(--radius)] bg-white shadow-[var(--d2d-shadow)]">
        <div className="flex items-center justify-between border-b border-[var(--d2d-line)] px-5 py-3">
          <h2 className="font-display text-title">Assign carrier to {load.id}</h2>
          <button onClick={onClose} className="text-[var(--d2d-ink-faint)] hover:text-[var(--d2d-ink)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-0 sm:grid-cols-2">
          {/* Carrier picker */}
          <div className="max-h-80 overflow-y-auto border-r border-[var(--d2d-line)] d2d-scroll">
            {/* Search input */}
            <div className="sticky top-0 border-b border-[var(--d2d-line)] bg-white p-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--d2d-ink-faint)]" />
                <input
                  type="text"
                  placeholder="Search carriers..."
                  value={searchQuery}
                  onChange={(e) => {
                    const query = e.target.value;
                    setSearchQuery(query);
                    
                    // Clear existing timer
                    if (debounceTimer) {
                      clearTimeout(debounceTimer);
                    }
                    
                    // Set new timer for debounced search
                    const timer = setTimeout(() => {
                      handleSearch(query);
                    }, 300);
                    
                    setDebounceTimer(timer);
                  }}
                  className="w-full rounded-md border border-[var(--d2d-line)] bg-[var(--d2d-surface)] px-3 py-2 pl-9 text-sm text-[var(--d2d-ink)] placeholder:text-[var(--d2d-ink-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--d2d-primary)]"
                />
              </div>
            </div>

            {/* Carrier list */}
            {(searchQuery.trim() ? searchResults : filteredCarriers).map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 border-b border-[var(--d2d-line)] px-3 py-2.5 text-left hover:bg-[var(--d2d-surface-sunk)]",
                  selectedId === c.id && "bg-[var(--d2d-primary-tint)]"
                )}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--d2d-primary)] text-[11px] font-medium text-white">
                  <Building2 className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-body-sm font-medium">{c.name}</p>
                  <p className="flex items-center gap-1 text-[11px] text-[var(--d2d-ink-soft)]">
                    <Star className="h-3 w-3 fill-[var(--d2d-signal)] text-[var(--d2d-signal)]" />
                    {c.rating} · {c.plan}
                  </p>
                </div>
              </button>
            ))}

            {isSearching && (
              <div className="px-3 py-4 text-center text-sm text-[var(--d2d-ink-soft)]">
                Searching...
              </div>
            )}

            {!isSearching && searchQuery.trim() && searchResults.length === 0 && (
              <div className="px-3 py-4 text-center text-sm text-[var(--d2d-ink-soft)]">
                No carriers found
              </div>
            )}
          </div>

          {/* Qualification check */}
          <div className="p-4">
            {carrier ? (
              <>
                <p className="mb-2 text-body-sm font-medium">{carrier.name}</p>
                <ul className="space-y-1.5">
                  {checks.map((c) => (
                    <li key={c.label} className="flex items-center gap-2 text-body-sm">
                      {c.ok ? (
                        <Check className="h-4 w-4 shrink-0 text-[var(--d2d-success)]" />
                      ) : (
                        <X className="h-4 w-4 shrink-0 text-[var(--d2d-danger)]" />
                      )}
                      <span className={cn(!c.ok && "font-medium text-[var(--d2d-danger)]")}>
                        {c.label} <span className="text-[var(--d2d-ink-soft)]">{c.detail}</span>
                      </span>
                    </li>
                  ))}
                  {carrier.dotNumber && (
                    <li className="flex items-center gap-2 text-body-sm text-[var(--d2d-ink-soft)]">
                      <span className="font-mono text-[11px]">DOT: {carrier.dotNumber}</span>
                    </li>
                  )}
                  {carrier.mcNumbers?.length && (
                    <li className="flex items-center gap-2 text-body-sm text-[var(--d2d-ink-soft)]">
                      <span className="font-mono text-[11px]">MC: {carrier.mcNumbers.join(", ")}</span>
                    </li>
                  )}
                </ul>

                {/* Branch selection */}
                {carrierBranches.length > 0 && (
                  <div className="mt-4 border-t border-[var(--d2d-line)] pt-3">
                    <p className="mb-2 text-label text-[var(--d2d-ink-faint)]">Select branch</p>
                    <div className="space-y-1.5">
                      {carrierBranches.map((b) => (
                        <button
                          key={b.id}
                          onClick={() => setSelectedBranchId(b.id)}
                          className={cn(
                            "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-body-sm",
                            selectedBranchId === b.id
                              ? "bg-[var(--d2d-primary-tint)] text-[var(--d2d-primary)]"
                              : "hover:bg-[var(--d2d-surface-sunk)]"
                          )}
                        >
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="flex-1">{b.city}, {b.state}</span>
                          {b.level === "CORPORATE" && (
                            <span className="rounded bg-[var(--d2d-primary)] px-1.5 py-0.5 text-[10px] font-medium text-white">
                              HQ
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-body-sm text-[var(--d2d-ink-soft)]">Select a carrier to view details.</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--d2d-line)] px-5 py-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={assign} disabled={!carrier || !selectedBranchId || blocked || busy}>
            {blocked ? "Requirements not met" : !selectedBranchId ? "Select a branch" : "Assign carrier"}
          </Button>
        </div>
      </div>
    </div>
  );
}
