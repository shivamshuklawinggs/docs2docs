"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadRail } from "@/components/loads/LoadRail";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/store/session";
import { Eye, EyeOff } from "lucide-react";
import type { LoadStatus } from "@/types";


const LOOP: LoadStatus[] = [
  "DRAFT",
  "DISPATCHED",
  "ASSIGNED",
  "AT_PICKUP",
  "LOADED",
  "IN_TRANSIT",
  "AT_DELIVERY",
  "DELIVERED",
];

export default function LoginPage() {
  const router = useRouter();
  const login = useSession((s) => s.login);
  const [email, setEmail] = useState("carrier@docks2doc.demo");
  const [password, setPassword] = useState("demo1234");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loopIdx, setLoopIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setLoopIdx((i) => (i + 1) % LOOP.length), 1400);
    return () => clearInterval(t);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const ok = await login(email, password);
    if (ok) {
      router.push("/dashboard");
    } else {
      setError("Invalid credentials");
    }
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Left — sign-in card */}
      <div className="flex items-center justify-center bg-[var(--d2d-surface)] px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius)] bg-[var(--d2d-signal)] font-display text-sm font-bold text-[var(--d2d-ink)]">
              D2
            </div>
            <span className="font-display text-title font-bold">Docks2Doc</span>
          </div>

          <h1 className="font-display text-display-md text-[var(--d2d-ink)]">Sign in</h1>
          <p className="mt-1 text-body-sm text-[var(--d2d-ink-soft)]">
            Business platform · demo workspace
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="text-label text-[var(--d2d-ink-soft)]">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 h-10 w-full rounded-[var(--radius)] border border-[var(--d2d-line)] px-3 text-body-sm outline-none focus:border-[var(--d2d-primary)]"
              />
            </div>
            <div>
              <label className="text-label text-[var(--d2d-ink-soft)]">Password</label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 w-full rounded-[var(--radius)] border border-[var(--d2d-line)] px-3 pr-10 text-body-sm outline-none focus:border-[var(--d2d-primary)]"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--d2d-ink-soft)] hover:text-[var(--d2d-ink)]"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <label className="flex items-center gap-2 text-body-sm text-[var(--d2d-ink-soft)]">
              <input type="checkbox" defaultChecked className="accent-[var(--d2d-primary)]" />
              Keep me signed in
            </label>
            {error && <p className="text-body-sm text-[var(--d2d-danger)]">{error}</p>}
            <Button type="submit" size="lg" className="w-full">
              Sign in
            </Button>
          </form>

          <p className="mt-4 text-center text-body-sm text-[var(--d2d-ink-soft)]">
            Don&apos;t have an account?{" "}
            <button onClick={() => router.push("/register")} className="text-[var(--d2d-primary)] hover:underline font-medium">
              Register your company
            </button>
          </p>
        </div>
      </div>

      {/* Right — dark panel with the Load Rail advancing on a loop */}
      <div className="relative hidden flex-col justify-center overflow-hidden bg-[var(--d2d-ink)] px-14 lg:flex">
        <div className="max-w-lg">
          <p className="font-display text-[2rem] font-bold leading-tight text-white">
            From the dock to the door — one record, every hand.
          </p>
          <div className="mt-10 rounded-[var(--radius)] bg-white/5 p-6 ring-1 ring-white/10">
            <div className="[&_*]:!text-white/80">
              <LoadRail status={LOOP[loopIdx]} variant="full" />
            </div>
          </div>
          {/* <p className="mt-6 font-mono text-[12px] text-white/40">
            Eight steps · Draft → Paid · live in the browser
          </p> */}
        </div>
      </div>
    </div>
  );
}
