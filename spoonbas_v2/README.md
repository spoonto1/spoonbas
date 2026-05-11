# Spoon BAS — Service Operations Console

A service-call dispatch and triage console for **Tony Spoon**'s BAS / HVAC controls
practice. Built for three personas:

- **Admin** — owns the system, manages users, has full delete privileges.
- **Dispatcher** — intakes incoming service requests, triages, and assigns.
- **Technician** — works the queue, runs the troubleshooting checklist, and
  collaborates with the dispatcher inside the call thread.

The app is a single React SPA on top of an Express + SQLite backend, packaged
with the standard fullstack webapp template (Vite + Tailwind + shadcn/ui +
Drizzle).

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:5000  (Vite + Express on the same port)
```

Sign in with one of the demo accounts:

| Name           | Email                | Password | Role        |
| -------------- | -------------------- | -------- | ----------- |
| Tony Spoon     | tony@spoonbas.io     | demo     | admin       |
| Maya Ortega    | maya@spoonbas.io     | demo     | dispatcher  |
| Dev Patel      | dev@spoonbas.io      | demo     | technician  |

Seed users and a small queue of realistic service calls are inserted on first
boot if the database is empty (`server/seed.ts`). There are no QA / test
accounts and no test tickets in the seed data.

---

## Production build

```bash
npm run build
NODE_ENV=production SESSION_SECRET=<long-random-secret> node dist/index.cjs
```

The server listens on `PORT` (default `5000`). For local HTTP smoke tests where
the proxy isn't terminating TLS, set `AUTH_INSECURE_COOKIE=1` so the session
cookie isn't forced `Secure`. **Never** use that flag in production.

| Env var                | Purpose                                                     |
| ---------------------- | ----------------------------------------------------------- |
| `PORT`                 | Listening port (default `5000`).                            |
| `NODE_ENV`             | Set to `production` for the prebuilt server bundle.         |
| `SESSION_SECRET`       | Required in production. Long random string for cookie sign. |
| `DATABASE_PATH`        | SQLite file path (default `data.db`). Use `/var/data/spoonbas.db` on Render with a persistent disk. |
| `AUTH_INSECURE_COOKIE` | `1` only for local HTTP smoke tests, never production.      |

### Render deployment

Use these settings for a Render **Web Service**:

```text
Runtime: Node
Build Command: npm install && npm run build
Start Command: npm start
```

Set these environment variables:

```text
NODE_ENV=production
SESSION_SECRET=<long random secret>
DATABASE_PATH=/var/data/spoonbas.db
```

Render supplies `PORT` automatically. If you add a persistent disk, mount it at
`/var/data` so the SQLite database survives deploys and restarts. Without a
persistent disk, the app still runs, but the SQLite file may reset when the
service is rebuilt.

Generate `SESSION_SECRET` locally with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

---

## Architecture walkthrough

```
spoonbas_rebuild/
├─ shared/schema.ts           # Drizzle + Zod models (single source of truth)
├─ server/
│  ├─ index.ts                # Express bootstrap (template default)
│  ├─ routes.ts               # All /api routes (auth + CRUD)
│  ├─ auth.ts                 # Sessions + in-memory bearer tokens
│  ├─ storage.ts              # IStorage + DatabaseStorage (better-sqlite3)
│  └─ seed.ts                 # First-boot seed: 3 users + sample queue
├─ client/src/
│  ├─ App.tsx                 # Hash-routed app shell w/ AuthProvider
│  ├─ main.tsx                # Vite entry
│  ├─ index.css               # Controls-console palette (no `red` placeholders)
│  ├─ lib/
│  │  ├─ queryClient.ts       # apiRequest + getQueryFn (bearer in memory)
│  │  ├─ auth.tsx             # AuthProvider / useAuth context
│  │  ├─ theme.tsx            # ThemeProvider (dark first)
│  │  └─ format.ts            # formatTimeAgo / formatDateTime
│  ├─ components/
│  │  ├─ console-shell.tsx    # Sidebar + nav + sign-out
│  │  ├─ logo.tsx             # Original SVG shield emblem
│  │  └─ badges.tsx           # Status / Priority / Role badges
│  └─ pages/
│     ├─ login.tsx            # Local sign-in screen + demo account picker
│     ├─ queue.tsx            # KPIs + searchable service queue
│     ├─ new-call.tsx         # Intake form (zod-validated)
│     ├─ call-detail.tsx      # Detail + checklist + chat thread
│     └─ team.tsx             # Roster + admin-only "Add user" form
└─ tailwind.config.ts / index.css   # Dark teal/amber controls palette
```

### Routing

`client/src/App.tsx` mounts:

```tsx
<Router hook={useHashLocation}>
  <Switch>
    <Route path="/" component={QueuePage} />
    <Route path="/new" component={NewCallPage} />
    <Route path="/calls/:id" component={CallDetailPage} />
    <Route path="/team" component={TeamPage} />
    <Route component={NotFound} />
  </Switch>
</Router>
```

All in-app navigation uses `<Link>` from `wouter`. `useHashLocation` is
required by the deploy proxy (the app runs inside a sandbox iframe).

### Data flow

- All frontend HTTP goes through `apiRequest(method, url, body)` or the default
  `getQueryFn` in `client/src/lib/queryClient.ts`. **Never** raw `fetch` from
  components — `__PORT_5000__` would be skipped.
- `apiRequest` includes `credentials: "include"` (session cookie) **and** an
  in-memory `Authorization: Bearer <token>` header when one was issued by
  `/api/auth/login`. Both auth paths are accepted by the server.
- `attachUser` middleware in `server/auth.ts` reads either path and attaches a
  password-stripped `SafeUser` to `req.authUser`. `requireAuth` and
  `requireRole(...)` enforce access on every protected route.
- The bearer token is **memory-only** in the browser — no `localStorage`,
  `sessionStorage`, `indexedDB`, or non-session cookies are ever written. A
  hard refresh in the iframe falls back to the session cookie if it survives,
  otherwise the user is shown the login screen.

### Database

- SQLite (`data.db`) via `better-sqlite3` + Drizzle.
- Set `DATABASE_PATH` to move the SQLite file. For Render persistent disk use
  `/var/data/spoonbas.db`.
- Tables: `users`, `service_calls`, `call_messages`, `checklist_items`.
- Tables are created via `CREATE TABLE IF NOT EXISTS` at boot in
  `server/storage.ts`. For schema migrations, run `npm run db:push`
  (drizzle-kit).
- Sessions live in `memorystore` and disappear on server restart — fine for
  this demo, swap in a Redis or SQLite-backed store for multi-instance
  deployments.

---

## API surface

| Method | Path                                  | Auth   | Purpose                                  |
| ------ | ------------------------------------- | ------ | ---------------------------------------- |
| GET    | `/api/auth/config`                    | no     | Returns `{ mode: "local" }`              |
| GET    | `/api/auth/me`                        | no     | Current user or `401`                    |
| GET    | `/api/auth/demo-users`                | no     | Demo accounts for the login picker       |
| POST   | `/api/auth/login`                     | no     | `{ email, password } -> { user, token }` |
| POST   | `/api/auth/logout`                    | no     | Clears session + revokes bearer          |
| GET    | `/api/users`                          | yes    | List users (no passwords)                |
| POST   | `/api/users`                          | admin  | Create user                              |
| GET    | `/api/service-calls`                  | yes    | List service calls                       |
| POST   | `/api/service-calls`                  | yes    | Create service call                      |
| GET    | `/api/service-calls/:id`              | yes    | One service call                         |
| PATCH  | `/api/service-calls/:id`              | yes    | Update status, priority, assignee, etc.  |
| DELETE | `/api/service-calls/:id`              | admin / dispatcher | Hard delete + cascade        |
| GET    | `/api/service-calls/:id/messages`     | yes    | List chat messages                       |
| POST   | `/api/service-calls/:id/messages`     | yes    | Post a chat message                      |
| GET    | `/api/service-calls/:id/checklist`    | yes    | List checklist items                     |
| POST   | `/api/service-calls/:id/checklist`    | yes    | Create checklist item                    |
| PATCH  | `/api/checklist/:id`                  | yes    | Toggle / edit checklist item             |
| DELETE | `/api/checklist/:id`                  | yes    | Delete checklist item                    |

---

## Adding users

Either:

1. Sign in as Tony (`admin`), open the **Team** page, and use the "Add user"
   form on the right.
2. Or hit the API directly:

   ```bash
   curl -i -c c.txt -b c.txt -H 'Content-Type: application/json' \
     -X POST http://localhost:5000/api/auth/login \
     -d '{"email":"tony@spoonbas.io","password":"demo"}'

   curl -i -c c.txt -b c.txt -H 'Content-Type: application/json' \
     -X POST http://localhost:5000/api/users \
     -d '{"email":"new@spoonbas.io","name":"New Tech","password":"change-me","role":"technician"}'
   ```

Roles must be `admin`, `dispatcher`, or `technician`.

---

## Conventions for future edits

- **Schema first.** All new fields go through `shared/schema.ts` (Drizzle table
  + insert schema + types). Frontend types are imported from `@shared/schema`.
- **Storage interface.** Backend mutations go through `IStorage` /
  `DatabaseStorage` — keep `routes.ts` thin and use `.get()` / `.all()` /
  `.run()` on the synchronous Drizzle driver.
- **API access from the client.** Use `apiRequest(...)` and TanStack Query.
  Never raw `fetch` (the deploy proxy depends on `__PORT_5000__` rewriting via
  `queryClient.ts`).
- **Storage in the browser.** Do **not** add `localStorage`, `sessionStorage`,
  `indexedDB`, or non-session cookies — they break the sandboxed iframe. If
  you need new client-side persistence, use a backend table.
- **Routing.** Hash-only via `wouter` + `useHashLocation`. Every page
  registered on `<Switch>` in `client/src/App.tsx`. Never use `href="#section"`
  anchor links.
- **Theming.** Tokens live in `client/src/index.css` (HSL `H S% L%`,
  unwrapped). Both `:root` (light) and `.dark` (dark — primary) are defined.
  No `red` placeholders remain.
- **Test IDs.** Add `data-testid` to every interactive control and every
  important displayed value. Existing pages use the `{action}-{target}`
  convention.

---

## Known limitations

- Passwords are stored as plain text. Add bcrypt / Argon2 before moving outside
  a trusted prototype.
- Session store is in memory (`memorystore`) — sessions reset on server
  restart and are not multi-instance safe.
- Bearer tokens are also in memory and last 8 hours; they're a preview-iframe
  fallback, not a long-lived auth mechanism.
- No file attachments on tickets yet — schema is intentionally minimal.
- No real-time updates; the queue and chat re-fetch on TanStack Query
  invalidation rather than over a websocket.

See `AUTH.md` for the auth-specific deep-dive.
