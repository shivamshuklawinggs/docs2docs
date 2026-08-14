# Docks2Doc Backend

Node.js + Express + MongoDB (Mongoose) API, structured as MVC:

```
backend/
  server.js                 entry point
  src/
    app.js                  express app (middleware + route mounting)
    config/db.js             mongoose connection
    models/                  Mongoose schemas (Company, Branch, User, Driver,
                              Equipment, Load, Invoice, Review, Notification)
    controllers/             request handlers per resource
    routes/                  express routers per resource
    middleware/               auth (JWT), asyncHandler, errorHandler
    utils/                    lifecycle.js, rbac.js, applyScope.js, ids.js
    seed/seed.js               populates MongoDB with demo data
```

## Setup

```bash
cd backend
npm install
copy env.example.txt .env      # Windows
# cp env.example.txt .env      # macOS/Linux
```

Edit `.env` and set `MONGODB_URI` (local Mongo or Atlas) and a strong `JWT_SECRET`.

## Run

```bash
npm run seed   # populates the database with demo companies/users/loads
npm run dev    # starts the API with nodemon on http://localhost:5000
```

Demo users (password from `DEMO_PASSWORD` in `.env`, default `demo1234`):

| Role | Email |
|---|---|
| SUPER_ADMIN | superadmin@docks2doc.com |
| CARRIER_CORP | carrier.corp@atlasfreight.com |
| CARRIER_BRANCH | carrier.branch@atlasfreight.com |
| BROKER_CORP | broker.corp@meridianlogistics.com |
| BROKER_BRANCH | broker.branch@meridianlogistics.com |
| SHIPPER_RECEIVER | shipper@primedistribution.com |

## API surface

All responses are JSON: `{ success, data }` or `{ success, message }` on error.

- `POST /api/auth/login` `{ email, password }` -> `{ token, user, scope }`
- `POST /api/auth/register` `{ companyName, type, adminName, adminEmail, adminPassword, ... }`
- `GET /api/auth/me` (Bearer token)
- `GET /api/loads?branchId=&companyId=&status=&equipmentType=&search=&savedView=`
- `GET /api/loads/:id?branchId=&companyId=`
- `POST /api/loads` — create order (Draft)
- `POST /api/loads/:id/advance` — next lifecycle step
- `POST /api/loads/:id/trigger-arrival`
- `POST /api/loads/:id/add-delay`
- `POST /api/loads/:id/reset`
- `POST /api/loads/:id/assign-driver` `{ driverId }`
- `GET /api/drivers?branchId=`
- `GET /api/equipment?branchId=`
- `GET /api/invoices?branchId=`
- `GET /api/companies` / `POST /api/companies/:id/approve` / `.../decline`
- `GET /api/users?companyId=&branchId=`
- `GET /api/reviews?subjectId=`
- `GET /api/notifications`

`branchId=ALL` (or omitted) disables branch-scoping, matching the frontend's
`applyScope` behaviour in `lib/mock/api.ts`.
