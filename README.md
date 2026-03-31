# Template Website by Purv

A production-grade Next.js 15 + React 19 template with role-based auth, admin dashboard, reusable UI components, and MongoDB-backed data layer. Includes OTP-based password reset, JWT session cookies, protected routes, and a fully functional admin users table with create/edit/delete.


## Quick Start

```bash
# 1) Install deps (pnpm recommended)
pnpm i

# 2) Copy env template (create your own values)
cp .env.example .env.local   # or create manually

# 3) Run dev server
pnpm dev
```

Then open http://localhost:3000


## Tech Stack
- Next.js 15 (App Router), React 19
- TypeScript, ESLint
- Tailwind CSS v4, Radix UI, shadcn-like UI components
- JWT auth with `jose`, cookies middleware protection
- Nodemailer for OTP emails
- Database: MongoDB
- TanStack Table for data grid


## Project Structure
```
  app\
    (auth)\
      forgot-password\page.tsx        # Request OTP
      login\page.tsx                   # Login form
      reset-password\page.tsx          # Reset with OTP
      signup\page.tsx                  # Email/password signup
    actions\
      admin.ts                          # Server actions for admin ops
      auth.ts                           # Server actions for auth/session
    admin\
      page.tsx                          # Admin dashboard (analytics + links)
      users\
        columns.tsx                     # DataTable column defs/actions
        page.tsx                        # User management table UI
    api\
      auth\
        forgot-password\route.ts        # POST: request OTP & email
        login\route.ts                  # POST: create JWT cookie
        reset-password\route.ts         # POST: verify OTP & update password
        signup\route.ts                 # POST: create user, set JWT cookie
        verify-otp\route.ts             # POST: verify OTP only
    globals.css                         # Tailwind base
    layout.tsx                          # Root layout, fonts, providers
    middleware.ts                       # Route protection by role
    not-found.tsx                       # 404 page
    page.tsx                            # Landing page
    user\page.tsx                       # User dashboard (example)
  components\
    admin\users\                        # CRUD dialogs for users
    custom\data-table.tsx               # Generic DataTable wrapper
    home\                               # Landing page sections
    layout\footer.tsx, navbar.tsx       # Public layout components
    providers.tsx                        # ThemeProviders client wrapper
    ui\...                              # Reusable UI primitives (Radix-based)
  constants\                            # Static content for landing
  hooks\use-mobile.ts                   # Example hook
  lib\
    database\
      clients.ts                        # Lazy-inited MongoDB client
      index.ts                          # getDb(): adapter loader (MongoDB)
      mongodb.ts                        # MongoDbAdapter
      types.ts                          # DatabaseAdapter interface + models
    email.ts                            # Nodemailer OTP sender
    utils.ts                            # UI helpers (cn)
  public\images\logo.svg                # Branding
  eslint.config.mjs, tsconfig.json, next.config.ts, package.json
```


## How It Works

- Auth flow
  - Signup: `POST /api/auth/signup` creates a user in the configured DB, sets `auth_token` (JWT) cookie, redirects by role.
  - Login: `POST /api/auth/login` verifies credentials with bcrypt, sets `auth_token` cookie.
  - Middleware: `middleware.ts` reads `auth_token`, verifies with `jose`, enforces role for `"/admin"` vs `"/user"` paths.
  - Session access: `app/actions/auth.ts#getCurrentUserAction` verifies cookie JWT server-side and fetches user.
  - Logout: `logoutAction` clears cookie.
  - Forgot/reset password: request OTP via email, then verify OTP and set new password.

- Database adapter
  - `lib/database/index.ts#getDb()` returns the MongoDB adapter (cached).
  - `types/database.ts` defines a strict `DatabaseAdapter` interface. The adapter implements:
    - `findUserByEmail`, `findUserById`
    - `createUser`, `updateUser`, `deleteUserById`
    - `getAdminAnalytics`
    - `getPaginatedUsers`
  - MongoDB uses the `users` collection in the configured DB.

- Admin users table
  - Client page `app/admin/users/page.tsx` loads paginated users via server action `getUsersAction` with sorting, filter, pagination.
  - `components/custom/data-table.tsx` wraps TanStack Table and provides common UI.
  - Row actions open dialogs from `components/admin/users/*` to create, edit, delete via server actions in `app/actions/admin.ts`.


## Environment Configuration

Create `.env.local` with the following (only the adapter you choose is strictly required, but the template supports all; missing email envs will throw at startup):

```env
# General
NODE_ENV=development
APP_NAME=My App
JWT_SECRET=replace-with-strong-random-string

# Email (required for OTP)
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587               # 465 for SSL
EMAIL_USER=postmaster@example.com
EMAIL_PASS=yourpassword
EMAIL_FROM=no-reply@example.com

# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster0.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=odoo_private
```

Notes:
- `JWT_SECRET` must be set; it’s used by APIs and middleware.
- Email variables are required at boot by `lib/email.ts`.
- For Firebase private key, keep newline escapes as shown; code replaces `\n` with real newlines.


## Database Setup

- MongoDB
  - Database `MONGODB_DB_NAME`, collection `users` with similar fields.
  - Unique index on `email` recommended.


## Scripts
- `pnpm dev`: start Next.js dev server
- `pnpm build`: production build
- `pnpm start`: start production server
- `pnpm lint`: run ESLint


## API Endpoints
- POST `/api/auth/signup` { fullName, email, password, role? } → sets cookie, returns role
- POST `/api/auth/login` { email, password } → sets cookie, returns role
- POST `/api/auth/forgot-password` { email } → sends OTP if user exists (generic response)
- POST `/api/auth/verify-otp` { email, otp } → verifies OTP validity
- POST `/api/auth/reset-password` { email, otp, password } → updates password

All endpoints are server-only; cookies are `httpOnly`, `sameSite=strict`, `secure` in production.


## Routing & Access Control
- Protected routes: `"/admin"` and `"/user"` guarded by `middleware.ts`.
- Middleware decodes `auth_token` and checks `payload.role` for admin paths.
- On failure, user is redirected to `/login` and the cookie is cleared.


## UI/UX
- `components/ui/*` exposes composable primitives built on Radix.
- `components/custom/data-table.tsx` provides search, sort, pagination, refresh slot.
- `components/admin/users/*` implements CRUD dialogs wired to server actions.
- The public marketing pages live in `components/home/*` and `constants/home/*`.


## Extending the Data Model
1) Update the relevant type files in `types/` directory with new fields or interfaces.
2) Implement the changes in `lib/database/mongodb.ts`.
3) Update server actions and UI where needed.

The `DatabaseAdapter` interface is the contract; keeping it consistent preserves portability across providers.


## Maintenance Guide
- Configuration
  - Keep `.env.local` out of version control.
  - Rotate `JWT_SECRET` and SMTP credentials regularly.

- Security
  - Always hash passwords (`bcryptjs` used already).
  - Limit Supabase service key exposure to server only.
  - Ensure cookies are `secure` in production.

- Database
  - Add indexes for frequent queries (e.g., `email`).
  - Keep schema parity across adapters.

- Email
  - Monitor SMTP deliverability; switch to a provider like SES or Resend as needed.

- Code Quality
  - Run `pnpm lint` in CI.
  - Prefer server actions and API routes for data mutations.
  - Avoid catching errors without meaningful handling.

- Upgrades
  - Check Next.js and React release notes before bumping.
  - Tailwind v4 is used; validate plugin compatibility.


## Troubleshooting
- App throws at startup: missing email envs. Provide all SMTP variables or mock them for dev.
- 401 on login: ensure user exists and password hashes match; check MongoDB connection and `MONGODB_URI`.
- Redirect loops: verify `JWT_SECRET` consistency and cookie domain/path.


## Is this a template?
Yes — this is a template with a MongoDB-backed data layer.
