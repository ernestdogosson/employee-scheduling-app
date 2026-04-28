# Employee Scheduling API

Small scheduling app. Employers add employees, employees mark when they can work, employers assign shifts on a weekly grid.

## Stack

- Backend: Postgres, Prisma, Express, Zod, TypeScript, JWT
- Frontend: React, Vite, Tailwind, shadcn, react-router

## Project structure

Backend (`backend/`):

- `prisma/` — Prisma schema, migrations, and the seed script.
- `src/server.ts` — Express app entry point.
- `src/db.ts` — Prisma client.
- `src/routes/` — one file per resource: `auth`, `employees`, `availability`, `schedule`, `shifts`.
- `src/middleware/` — `requireAuth`, `requireRole`, `validate` (Zod), `errorHandler`, `requestLogger`.

Frontend (`frontend/`):

- `src/pages/` — top-level routes (`Login`, `Dashboard`).
- `src/components/` — feature components: `DashboardShell` (rail + topbar), `EmployerView`, `EmployeeView`, `ScheduleGrid`, `ScheduleEditor`, `RequireAuth`.
- `src/lib/api.ts` — small fetch wrapper that adds the auth token and clears it on 401.

Root:

- `docker-compose.yml` — Postgres + pgAdmin for local dev.

## Data model

- **User** — login identity. Has `email`, `loginCode`, and a `role` (`EMPLOYER` or `EMPLOYEE`). One employer can sign in directly; one employee can sign in once linked to an Employee row.
- **Employee** — profile (firstName, lastName, optional phone) tied to a `User` row.
- **Shift** — just a name. Three are seeded: `Morning`, `Afternoon`, `Night`.
- **Availability** — an employee says "I can work this shift on this date." Unique on `(employeeId, date, shiftId)`.
- **ScheduleEntry** — the employer's decision: "this employee works this shift on this date." Same uniqueness rule.

Deleting an employee cascades to their availabilities and schedule entries.

## Setup

You need Docker and Node 20+.

1. Start Postgres and pgAdmin:
   ```
   docker compose up -d
   ```
   - Postgres: `localhost:5432` (`scheduler` / `scheduler`, db `scheduling`)
   - pgAdmin: `http://localhost:5050` (`admin@local.dev` / `admin`)
2. Backend env. Create `backend/.env`:
   ```
   DATABASE_URL=postgresql://scheduler:scheduler@localhost:5432/scheduling
   JWT_SECRET=replace-me
   JWT_EXPIRES_IN=7d
   PORT=3000
   ```
3. Backend:
   ```
   cd backend
   npm install
   npx prisma migrate deploy
   npx prisma db seed
   npm run dev
   ```
   Runs on `http://localhost:3000`.
4. Frontend env (only needed if backend isn't on 3000). Create `frontend/.env`:
   ```
   VITE_API_URL=http://localhost:3000
   ```
5. Frontend (in another terminal):
   ```
   cd frontend
   npm install
   npm run dev
   ```
   Runs on `http://localhost:5173`.

## Default login

The seed creates one employer and the three shifts.

- Email: `employer@scheduler.local`
- Login code: `1000`

Add employees from the employer dashboard. Each new employee gets an email and a 4-digit login code, both shown in the employees table so you can sign in as them.

## API

- **Auth** — `POST /auth/login`, `GET /auth/me`
- **Employees** — `GET /employees`, `POST /employees`, `GET /employees/:id`, `GET /employees/me`, `DELETE /employees/:id`
- **Availability** — `GET /availability/:employeeId`, `PUT /availability/:employeeId`
- **Schedule** — `GET /schedule?from=&to=`, `PUT /schedule`
- **Shifts** — `GET /shifts`

Employer-only: creating and deleting employees, and saving the schedule. Employees can only edit their own availability and read their own profile via `/employees/me`. Everything else needs a logged-in user. `POST` and `PUT` bodies are validated with Zod.

Authentication: send `Authorization: Bearer <token>` with the JWT returned from `POST /auth/login`. The frontend stores it in `localStorage` and clears it on a 401.

## Notes

- **Login by email + 4-digit code, not password.** The code is stored as plaintext. It's an access code with only 10,000 possibilities, not a real password, and `@unique` on `loginCode` needs plaintext to be meaningful.
- **One error middleware, no per-route try/catch.** Routes throw and the middleware maps Zod errors to 400, Prisma `P2002` (unique conflict) to 409, `P2003` (FK violation) to 400, and anything else to 500.
- **`P2025` is not mapped** on purpose — only errors that can actually happen on existing routes are mapped, no speculative handling.
- **Generated Prisma client lives in the repo** (`backend/src/generated/prisma`) instead of `node_modules`, because the schema sets `output = "../src/generated/prisma"`. This makes types easy to import but means a fresh clone needs `npx prisma generate` (handled automatically by `migrate deploy`).
