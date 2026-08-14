# Docks2Doc — Web Platform (mock-data phase)

Clickable, fully-designed web UI for the Docks2Doc freight platform, built with mock
data and no backend. Implements the build spec in `../Docks2Doc_Web_UI_Spec.md`.

## Getting started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You are redirected to `/login`.

### Demo accounts (password `demo1234`)

| Email | Role |
| --- | --- |
| `carrier@docks2doc.demo` | Carrier Corporate |
| `dispatch@docks2doc.demo` | Carrier Branch (Dallas) |
| `broker@docks2doc.demo` | Broker Corporate |
| `warehouse@docks2doc.demo` | Shipper / Receiver |
| `admin@docks2doc.demo` | Super Admin |

Click any credential on the login page to autofill it. Use the floating **DEMO** role
switcher (bottom-right) to jump between roles instantly.

## What is built (foundation + core, spec phases A–B)

- **Design system** — tokens (`app/globals.css`), Archivo / Inter / IBM Plex Mono fonts
- **RBAC** — `lib/rbac.ts` nav + permission map, `visibleFields()` margin gating
- **8-step lifecycle** — `lib/lifecycle.ts` + the signature `LoadRail` component
- **Mock layer** — deterministic seed (`lib/mock/seed.ts`: 12 companies, 38 drivers,
  64 equipment, 120 loads, invoices, reviews, notifications) behind `lib/mock/api.ts`
  with a 400 ms latency wrapper and branch-scope isolation (`applyScope`)
- **Shell** — sidebar (role-aware nav), topbar (search, branch scope, notifications,
  shipper mode switch), demo role switcher
- **Screens** — login, role-aware dashboard, load board, load detail, drivers,
  invoices, companies; all other spec routes stubbed with instructional placeholders

## Project structure

```
app/(auth)/login        sign-in + workspace panel
app/(platform)/*        shell-wrapped app (dashboard, loads, drivers, invoices, admin/*)
components/{shell,loads,data,ui}
lib/{rbac,lifecycle,format,utils,hooks}
lib/mock/{reference,seed,api}
lib/store/session       zustand session + role/branch/mode (localStorage-hydrated)
types/index.ts
```

## Tech stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Zustand · TanStack Table ·
Recharts · lucide-react · date-fns · react-hook-form + zod.

## Next build phases (per spec §12)

- **C. Flow** — order wizard, dispatch board, assignment dialog, Simulate menu, tracking + map
- **D. Documents & money** — document centre, viewer, signature pad (3 methods), invoice detail
- **E. Depth** — equipment, ratings, branches, users & permissions, billing, Super Admin portal
- **F. Polish** — full four-state coverage, responsive pass, a11y audit

> Note: the parent folder name contains an apostrophe (`Sharad's project`), which trips
> Next's favicon metadata loader. The default `app/favicon.ico` was removed to avoid it;
> add a favicon via `app/icon.png` if needed.
