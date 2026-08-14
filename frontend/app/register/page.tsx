"use client";

import { useState } from "react";
import { Building2, CheckCircle, ArrowRight, ChevronLeft, ChevronRight, Eye, EyeOff, Search, Loader2 } from "lucide-react";
import { api } from "@/lib/mock/api";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { CompanyType, Company } from "@/types";
import { http } from "@/lib/api/http";
import { toast } from "react-toastify";


const STEPS = [
  { title: "Company Info", description: "Basic company information" },
  { title: "Branch Location", description: "Corporate headquarters" },
  { title: "Admin Account", description: "Create your login credentials" },
];

const inputCls =
  "h-11 w-full rounded-[var(--radius)] border border-[var(--d2d-line)] px-4 text-body-sm outline-none focus:border-[var(--d2d-primary)] focus:ring-1 focus:ring-[var(--d2d-primary)]";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [type, setType] = useState<CompanyType>("CARRIER");
  const [plan, setPlan] = useState<Company["plan"]>("STARTER");
  const [dotNumber, setDotNumber] = useState("");
  const [mcNumber, setMcNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [branchCity, setBranchCity] = useState("");
  const [branchState, setBranchState] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [searchingDot, setSearchingDot] = useState(false);
  const [dotError, setDotError] = useState("");

  const submit = async () => {
    if (!name || !phone || !branchAddress || !branchCity || !branchState || !adminName || !adminEmail || !adminPassword) return;
    setSubmitting(true);
    try {
      await api.createCompany(
        name,
        type,
        plan,
        branchCity,
        branchState,
        adminName,
        adminEmail,
        "PENDING",
        dotNumber,
        mcNumber,
        phone,
        adminPassword,
        branchAddress
      );
      setSubmitted(true);
    } catch (e) {
      console.error(e);
      toast.error((e instanceof Error ? e.message : "Failed to create company"));
      setSubmitting(false);
    }
  };

  const nextStep = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 0) setStep(step - 1);
  };

  const canProceed = () => {
    switch (step) {
      case 0: return !!name && !!type && !!plan && !!phone;
      case 1: return !!branchAddress && !!branchCity && !!branchState;
      case 2: return !!adminName && !!adminEmail && !!adminPassword;
      default: return false;
    }
  };

  const searchUsDot = async () => {
    if (!dotNumber || dotNumber.length < 2) {
      setDotError("DOT number must be at least 2 characters");
      return;
    }
    setSearchingDot(true);
    setDotError("");
    try {
      const response = await http.get(`/usdot/${dotNumber}`);
      const data = (response as { data?: { legal_name?: string; physical_address?: string; phone?: string; mc_mx_ff_numbers?: string } }).data;
      console.log("data",data)
      if (data) {
        const companyData = data;
        // Auto-fill company details from USDOT data
        if (companyData.legal_name) {
          setName(companyData.legal_name);
        }
        if (companyData.physical_address) {
          setBranchAddress(companyData.physical_address || "");
          setBranchCity(companyData.physical_address?.split(", ")[1] || "");
          setBranchState(companyData.physical_address?.split(", ")[2]?.split(" ")[0] || "");
        }
        if (companyData.phone) {
          setPhone(companyData.phone);
        }
        if (companyData.mc_mx_ff_numbers) {
          setMcNumber(companyData.mc_mx_ff_numbers);
        }
      } else {
        setDotError("No data found for this DOT number");
      }
    } catch (error: unknown) {
      console.error("Error fetching USDOT data:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch USDOT data. Please try again.";
      setDotError(errorMessage);
    } finally {
      setSearchingDot(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--d2d-surface)] p-4">
        <div className="w-full max-w-md rounded-[var(--radius)] bg-white p-8 shadow-[var(--d2d-shadow)] text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--d2d-success-tint)]">
            <CheckCircle className="h-8 w-8 text-[var(--d2d-success)]" />
          </div>
          <h1 className="font-display text-2xl font-bold text-[var(--d2d-ink)] mb-2">Registration Submitted</h1>
          <p className="text-body text-[var(--d2d-ink-soft)] mb-6">
            Your company registration has been submitted for review. We&apos;ll notify you once your account is approved.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="inline-flex items-center gap-2 rounded-[var(--radius)] bg-[var(--d2d-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Go to login <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  const isCarrier = type === "CARRIER";
  const needsDotMc = isCarrier || type === "BROKER";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--d2d-surface)] p-4">
      <div className="w-full max-w-lg rounded-[var(--radius)] bg-white p-8 shadow-[var(--d2d-shadow)]">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--d2d-primary-tint)]">
            <Building2 className="h-6 w-6 text-[var(--d2d-primary)]" />
          </div>
          <h1 className="font-display text-2xl font-bold text-[var(--d2d-ink)]">Register Your Company</h1>
          <p className="text-body text-[var(--d2d-ink-soft)] mt-2">
            Join Docks2Doc to streamline your logistics operations
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
                      i <= step ? "bg-[var(--d2d-primary)] text-white" : "bg-[var(--d2d-surface-sunk)] text-[var(--d2d-ink-faint)]"
                    )}
                  >
                    {i + 1}
                  </div>
                  <span className={cn("mt-1 text-xs", i <= step ? "text-[var(--d2d-ink)]" : "text-[var(--d2d-ink-faint)]")}>
                    {s.title}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-0.5 mx-2",
                      i < step ? "bg-[var(--d2d-primary)]" : "bg-[var(--d2d-line)]"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="space-y-4">
          {step === 0 && (
            <>
              <label className="block">
                <span className="text-label text-[var(--d2d-ink-soft)]">Company type</span>
                <select className={cn(inputCls, "mt-1")} value={type} onChange={(e) => setType(e.target.value as CompanyType)}>
                  <option value="CARRIER">Carrier</option>
                  <option value="BROKER">Broker</option>
                  <option value="SHIPPER_RECEIVER">Shipper / Receiver</option>
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                {needsDotMc && (
                  <>
                    <label className="block">
                      <span className="text-label text-[var(--d2d-ink-soft)]">DOT Number</span>
                      <div className="relative mt-1">
                        <input className={cn(inputCls, "pr-20")} value={dotNumber} onChange={(e) => { setDotNumber(e.target.value); setDotError(""); }} placeholder="1234567" />
                        <button
                          type="button"
                          onClick={searchUsDot}
                          disabled={searchingDot || !dotNumber}
                          className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded bg-[var(--d2d-primary)] px-2 py-1 text-xs text-white hover:opacity-90 disabled:opacity-50"
                        >
                          {searchingDot ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                          <span>Search</span>
                        </button>
                      </div>
                      {dotError && (
                        <p className="mt-1 text-xs text-[var(--d2d-danger)]">{dotError}</p>
                      )}
                    </label>
                    <label className="block">
                      <span className="text-label text-[var(--d2d-ink-soft)]">MC Number</span>
                      <input className={cn(inputCls, "mt-1")} value={mcNumber} onChange={(e) => setMcNumber(e.target.value)} placeholder="MC-123456" />
                    </label>
                  </>
                )}
              </div>
              <label className="block">
                <span className="text-label text-[var(--d2d-ink-soft)]">Company name</span>
                <input className={cn(inputCls, "mt-1")} value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Logistics" />
              </label>
              <label className="block">
                <span className="text-label text-[var(--d2d-ink-soft)]">Phone</span>
                <input className={cn(inputCls, "mt-1")} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" />
              </label>
              <label className="block">
                <span className="text-label text-[var(--d2d-ink-soft)]">Plan</span>
                <select className={cn(inputCls, "mt-1")} value={plan} onChange={(e) => setPlan(e.target.value as Company["plan"])}>
                  <option value="STARTER">Starter ($1,200/mo)</option>
                  <option value="GROWTH">Growth ($3,500/mo)</option>
                  <option value="ENTERPRISE">Enterprise ($9,800/mo)</option>
                </select>
              </label>
            </>
          )}

          {step === 1 && (
            <>
              <p className="text-label text-[var(--d2d-ink-soft)] mb-3">Corporate branch (HQ)</p>
              <div className="space-y-4">
                <label className="block">
                  <span className="text-label text-[var(--d2d-ink-soft)]">Address</span>
                  <input className={cn(inputCls, "mt-1")} value={branchAddress} onChange={(e) => setBranchAddress(e.target.value)} placeholder="123 Main Street" />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-label text-[var(--d2d-ink-soft)]">City</span>
                    <input className={cn(inputCls, "mt-1")} value={branchCity} onChange={(e) => setBranchCity(e.target.value)} placeholder="Dallas" />
                  </label>
                  <label className="block">
                    <span className="text-label text-[var(--d2d-ink-soft)]">State</span>
                    <input className={cn(inputCls, "mt-1")} value={branchState} onChange={(e) => setBranchState(e.target.value)} placeholder="TX" maxLength={2} />
                  </label>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-label text-[var(--d2d-ink-soft)] mb-3">Admin account</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-label text-[var(--d2d-ink-soft)]">Full name</span>
                  <input className={cn(inputCls, "mt-1")} value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Jordan Lee" />
                </label>
                <label className="block">
                  <span className="text-label text-[var(--d2d-ink-soft)]">Email</span>
                  <input className={cn(inputCls, "mt-1")} value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="jordan@acme.com" type="email" />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-label text-[var(--d2d-ink-soft)]">Password</span>
                  <div className="relative mt-1">
                    <input
                      className={cn(inputCls)}
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Create a password"
                      type={showPassword ? "text" : "password"}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--d2d-ink-soft)] hover:text-[var(--d2d-ink)]"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>
              </div>
            </>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 pt-4">
            {step > 0 && (
              <button
                onClick={prevStep}
                className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius)] border border-[var(--d2d-line)] px-4 py-3 text-sm font-medium text-[var(--d2d-ink)] hover:bg-[var(--d2d-surface-sunk)]"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                onClick={nextStep}
                disabled={!canProceed()}
                className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius)] bg-[var(--d2d-primary)] px-4 py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={!canProceed() || submitting}
                className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius)] bg-[var(--d2d-primary)] px-4 py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting..." : "Submit Registration"}
              </button>
            )}
          </div>

          <p className="text-center text-body-sm text-[var(--d2d-ink-faint)]">
            Already have an account?{" "}
            <button onClick={() => router.push("/login")} className="text-[var(--d2d-primary)] hover:underline">
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
