# Spoon BAS — Authentication

Spoon BAS uses **local application authentication only.** There is no
Microsoft Entra / OIDC integration. There is no external identity provider.
The login form posts `{ email, password }` to `POST /api/auth/login`.

## How sign-in works

1. User submits the login form.
2. `POST /api/auth/login` validates against the `users` table in the local
   SQLite database.
3. On success the server:
   - Creates an `express-session` server-side session backed by an in-memory
     store. The browser receives an HTTP-only `spoonbas.sid` cookie.
   - Issues a short-lived (8h) random bearer token and returns it in the JSON
     body. The browser keeps this token **only in React memory** (see
     `client/src/lib/queryClient.ts` — `setAuthToken`). It is never written to
     `localStorage`, `sessionStorage`, `indexedDB`, or any other browser
     storage that's blocked inside the deploy iframe.
4. Subsequent requests are authenticated by **either**:
   - the session cookie (preferred), **or**
   - the `Authorization: Bearer <token>` header — which the
     queryClient automatically attaches to every request.
5. `POST /api/auth/logout` destroys the session and revokes the bearer token.

A hard refresh in the iframe loses the bearer token (because we never persist
it). If the session cookie is also stripped by the iframe, the user is
returned to the login screen — which is the safe outcome.

## Demo users

The seed (`server/seed.ts`) creates these on first boot if the user table is
empty:

| Name           | Email                | Password | Role        |
| -------------- | -------------------- | -------- | ----------- |
| Tony Spoon     | `tony@spoonbas.io`   | `demo`   | `admin`     |
| Maya Ortega    | `maya@spoonbas.io`   | `demo`   | `dispatcher`|
| Dev Patel      | `dev@spoonbas.io`    | `demo`   | `technician`|

These are intentionally the only seed accounts — no QA / test users.

## Adding more users

Only an authenticated `admin` can create users.

- **From the UI:** sign in as Tony, go to **Team**, fill the "Add user" form.
- **From curl:**

  ```bash
  curl -i -c c.txt -b c.txt -H 'Content-Type: application/json' \
    -X POST http://localhost:5000/api/auth/login \
    -d '{"email":"tony@spoonbas.io","password":"demo"}'

  curl -i -c c.txt -b c.txt -H 'Content-Type: application/json' \
    -X POST http://localhost:5000/api/users \
    -d '{"email":"new@spoonbas.io","name":"New Person","password":"change-me","role":"technician"}'
  ```

Valid roles: `admin`, `dispatcher`, `technician`.

## Authorization summary

| Capability                        | admin | dispatcher | technician |
| --------------------------------- | ----- | ---------- | ---------- |
| View queue, calls, messages       | ✅    | ✅         | ✅         |
| Create / edit calls               | ✅    | ✅         | ✅         |
| Reassign / change priority        | ✅    | ✅         | ✅         |
| Add / toggle checklist items      | ✅    | ✅         | ✅         |
| Post messages                     | ✅    | ✅         | ✅         |
| Delete service call               | ✅    | ✅         | ❌         |
| Add user                          | ✅    | ❌         | ❌         |

The role gates are enforced server-side (`requireRole()` middleware in
`server/auth.ts`). The UI hides actions a user cannot perform.

## Environment variables

| Var                    | Required        | Notes                                         |
| ---------------------- | --------------- | --------------------------------------------- |
| `SESSION_SECRET`       | prod            | Long random string for cookie signing.        |
| `NODE_ENV`             | recommended     | `production` for the prebuilt server bundle.  |
| `DATABASE_PATH`        | recommended     | SQLite file path. Use `/var/data/spoonbas.db` on Render persistent disk. |
| `AUTH_INSECURE_COOKIE` | dev only        | `1` for local HTTP smoke tests; never prod.   |
| `PORT`                 | optional        | Defaults to `5000`.                           |

## Render deployment settings

Use these settings for a Render web service:

```text
Build Command: npm install && npm run build
Start Command: npm start
```

Set:

```text
NODE_ENV=production
SESSION_SECRET=<long random secret>
DATABASE_PATH=/var/data/spoonbas.db
```

Mount a Render persistent disk at `/var/data` if you want users and service
calls to survive redeploys. If you skip the disk, the app will still boot and
seed the three demo accounts, but SQLite data may reset after rebuilds.

## Security caveats (read before promoting beyond demo)

- Passwords are plain text. Replace with bcrypt or Argon2 before any non-demo
  use.
- Session store is in-memory. Use Redis / SQLite session store for multi-node
  or restart-safe deployments.
- No rate limiting on `/api/auth/login`.
- No password policy / reset flow.

These are intentional simplifications for a personal-use service-ops console.
