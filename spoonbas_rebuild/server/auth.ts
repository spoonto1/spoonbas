import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import crypto from "node:crypto";
import { storage } from "./storage";
import type { SafeUser, User } from "@shared/schema";

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

declare global {
  namespace Express {
    interface Request {
      authUser?: SafeUser;
    }
  }
}

// In-memory bearer tokens (preview-iframe fallback when cookies are stripped).
type BearerEntry = { userId: number; expiresAt: number };
const bearerTokens = new Map<string, BearerEntry>();
const BEARER_TTL_MS = 8 * 60 * 60 * 1000; // 8h

function pruneBearer() {
  const now = Date.now();
  bearerTokens.forEach((v, t) => {
    if (v.expiresAt < now) bearerTokens.delete(t);
  });
}

function issueBearer(userId: number): string {
  pruneBearer();
  const token = crypto.randomBytes(32).toString("hex");
  bearerTokens.set(token, { userId, expiresAt: Date.now() + BEARER_TTL_MS });
  return token;
}

function consumeBearer(token: string): number | null {
  pruneBearer();
  const e = bearerTokens.get(token);
  if (!e) return null;
  if (e.expiresAt < Date.now()) {
    bearerTokens.delete(token);
    return null;
  }
  return e.userId;
}

function revokeBearer(token: string) {
  bearerTokens.delete(token);
}

export function setupSession(app: Express) {
  const MemoryStore = createMemoryStore(session);
  const isProd = process.env.NODE_ENV === "production";
  const insecureCookie = process.env.AUTH_INSECURE_COOKIE === "1";
  app.set("trust proxy", 1);
  app.use(
    session({
      name: "spoonbas.sid",
      secret:
        process.env.SESSION_SECRET ||
        (isProd ? "" : "spoonbas-dev-secret-change-me"),
      resave: false,
      saveUninitialized: false,
      rolling: true,
      store: new MemoryStore({ checkPeriod: 60 * 60 * 1000 }),
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: isProd && !insecureCookie,
        maxAge: 8 * 60 * 60 * 1000,
      },
    }),
  );
}

function readBearer(req: Request): string | null {
  const h = req.headers.authorization;
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : null;
}

export async function attachUser(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  let userId: number | null = null;
  if (req.session?.userId) userId = req.session.userId;
  if (!userId) {
    const t = readBearer(req);
    if (t) userId = consumeBearer(t);
  }
  if (userId) {
    const u = await storage.getUser(userId);
    if (u) {
      const { password, ...safe } = u;
      req.authUser = safe;
    }
  }
  next();
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.authUser) return res.status(401).json({ message: "Unauthorized" });
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.authUser) return res.status(401).json({ message: "Unauthorized" });
    if (!roles.includes(req.authUser.role))
      return res.status(403).json({ message: "Forbidden" });
    next();
  };
}

export function login(
  req: Request,
  user: Pick<User, "id">,
): { token: string } {
  req.session.userId = user.id;
  return { token: issueBearer(user.id) };
}

export function logout(req: Request) {
  const t = readBearer(req);
  if (t) revokeBearer(t);
  return new Promise<void>((resolve) => {
    req.session.destroy(() => resolve());
  });
}
