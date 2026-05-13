# AGENTS.md - Tesoreria Cursos

High-signal facts for agents working in this Angular/Supabase project.

## Build Commands

- **Dev server**: `npm start`
- **Production build**: `npx ng build` (default configuration)
- **Dev build**: `npx ng build --configuration development`
- **Tests**: `npm test` (Karma, no test files currently)

Windows quirk: Use `npx ng build --configuration development` instead of `npm run build -- --configuration development` to avoid parsing issues.

## No Linter/Typechecker

This project has **no ESLint, TSLint, or Prettier** configuration beyond the `prettier` entry in `package.json` (used manually). Angular's `ng build` does not run any linter. Do not add lint commands expecting them to exist.

## Supabase Security Rules

- **NEVER** put `service_role` or admin JWTs in `src/environments/*` or any Angular code.
- Frontend uses only publishable/anon key.
- Admin operations go through Edge Functions.
- Edge Functions read `SERVICE_ROLE_KEY` from Supabase env vars, not from repo.
- Action pending: rotate the exposed `service_role` in Supabase dashboard.

## Supabase CLI (Windows)

CLI location: `D:\PROGRAMAS\supabase_windows_amd64\supabase.exe`

Add to PATH or use full path:
```bash
D:\PROGRAMAS\supabase_windows_amd64\supabase.exe functions deploy create-user-admin
D:\PROGRAMAS\supabase_windows_amd64\supabase.exe functions logs create-user-admin
```

## Edge Functions

Local path: `supabase/functions/`

Deploy:
```bash
supabase functions deploy create-user-admin
supabase functions deploy delete-user-admin
```

Set secrets in Supabase (Edge Functions → select function → Secrets):
- `PROJECT_URL`: https://jofowipydkgirgaeybia.supabase.co
- `SERVICE_ROLE_KEY`: (from Supabase Settings → API)
- `RESEND_API_KEY`: (optional, for emails via Resend)

**Important**: After deploying, verify **"Verify JWT with legacy secret"** is **OFF** in Edge Functions → Settings. This setting may reset after deployments.

## AuthService Signals (Critical)

- `profileLoaded` - Must be `true` before roleGuard allows access. An agent waiting for auth to "load" but not checking this signal will fail.
- `isAdmin` - True for both `admin` and `super_admin`.
- `isSuperAdmin` - True only for `super_admin`.
- `isCourseUser` - True when user has active membership in `course_members`.

## Guards Behavior

- `authGuard` - Protects `/dashboard` routes.
- `roleGuard` - Waits for `loading=false` AND `profileLoaded=true`. If no admin profile, redirects to `/dashboard/home`.
- `loginGuard` - Redirects to `/dashboard` if user already has session.

## Routes

- `/login`, `/register`, `/forgot-password`, `/reset-password`, `/confirm-email`
- `/dashboard` (protected)
- `/dashboard/home`
- `/dashboard/admin/users` (roleGuard)
- `/dashboard/courses/:courseId/transactions` (contextual)
- `/dashboard/transactions` (global admin)
- `/dashboard/schools`, `/dashboard/categories`, `/dashboard/receipts`, `/dashboard/reports`

## Email Templates

Configured in Supabase Dashboard → Authentication → Email Templates:
- **Reset Password**: Custom branded template with Cl@ssdFund styling
- **Confirm signup**: Custom branded template
- **Invite User**: Custom branded template

## Known Budget Warnings

These do not block build but appear in production build:
- Initial bundle: ~1.09MB (warning at 1MB)
- `login.scss`: 6.25kB (warning at 4kB)
- `transactions.scss`: 4.33kB (warning at 4kB)

## Database Expected

Enums: `global_role_enum` (super_admin/admin/user), `course_role_enum` (presidente/tesorero/secretario/apoderado), `category_type_enum` (income/expense), `transaction_type_enum` (income/expense).

Tables: `profiles`, `schools`, `courses`, `course_members`, `categories`, `transactions`, `receipts`.

## GitHub Pages CI

Deploys on push to `dev` or `main` branches. Build command: `npm run build -- --base-href /classfound/`. Output: `dist/tesoreria-cursos-app/browser/`.

Live URL: https://maxuber79.github.io/classfound/

## Code Conventions

- Standalone components preferred.
- Services per feature (not global).
- Use signals/computed.
- SCSS in components or `src/assets/scss/` for globals.
- Check `git status` and `git diff` before modifying files.
- No secrets in frontend code.

## Pending Features

1. **Email de bienvenida** - Resend API configurada pero requiere verificar dominio en Resend.com para enviar emails
2. **Login OAuth** - Google y Facebook (Supabase Social Login)
3. **Reports** - Gráficos para visualizar finanzas + Exportar a Excel
4. **Notificaciones** - Componente de notificaciones (TODO en dashboard.ts:184)
5. **Course Detail Modal** - TODO en course.ts para abrir modal de detalle
