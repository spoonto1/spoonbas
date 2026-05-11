import type { Express, Request, Response } from "express";
import type { Server } from "node:http";
import { storage } from "./storage";
import {
  setupSession,
  attachUser,
  requireAuth,
  requireRole,
  login,
  logout,
} from "./auth";
import { runSeed } from "./seed";
import {
  insertUserSchema,
  insertServiceCallSchema,
  updateServiceCallSchema,
  insertCallMessageSchema,
  insertChecklistItemSchema,
  updateChecklistItemSchema,
} from "@shared/schema";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // Sessions + user attach happen for every API request.
  setupSession(app);
  app.use("/api", attachUser);

  // First-boot seeding
  await runSeed();

  // ---------- Auth ----------
  app.get("/api/auth/config", (_req, res) => {
    res.json({ mode: "local" });
  });

  app.get("/api/auth/me", (req: Request, res: Response) => {
    if (!req.authUser) return res.status(401).json({ message: "Unauthorized" });
    res.json(req.authUser);
  });

  app.get("/api/auth/demo-users", async (_req, res) => {
    const users = await storage.listUsers();
    res.json(
      users.map((u) => ({
        email: u.email,
        name: u.name,
        role: u.role,
      })),
    );
  });

  app.post("/api/auth/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ message: "Invalid credentials" });
    const u = await storage.getUserByEmail(parsed.data.email.toLowerCase());
    if (!u || u.password !== parsed.data.password)
      return res.status(401).json({ message: "Invalid email or password" });
    const { token } = login(req, u);
    const { password, ...safe } = u;
    res.json({ user: safe, token });
  });

  app.post("/api/auth/logout", async (req, res) => {
    await logout(req);
    res.json({ ok: true });
  });

  // ---------- Users ----------
  app.get("/api/users", requireAuth, async (_req, res) => {
    res.json(await storage.listUsers());
  });

  app.post(
    "/api/users",
    requireAuth,
    requireRole("admin"),
    async (req, res) => {
      const parsed = insertUserSchema.safeParse({
        ...req.body,
        email: typeof req.body?.email === "string"
          ? req.body.email.toLowerCase()
          : req.body?.email,
      });
      if (!parsed.success)
        return res
          .status(400)
          .json({ message: "Invalid user", errors: parsed.error.flatten() });
      const existing = await storage.getUserByEmail(parsed.data.email);
      if (existing)
        return res.status(409).json({ message: "Email already in use" });
      const created = await storage.createUser(parsed.data);
      res.status(201).json(created);
    },
  );

  // ---------- Service Calls ----------
  app.get("/api/service-calls", requireAuth, async (_req, res) => {
    res.json(await storage.listServiceCalls());
  });

  app.get("/api/service-calls/:id", requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id))
      return res.status(400).json({ message: "Invalid id" });
    const call = await storage.getServiceCall(id);
    if (!call) return res.status(404).json({ message: "Not found" });
    res.json(call);
  });

  app.post("/api/service-calls", requireAuth, async (req, res) => {
    const parsed = insertServiceCallSchema.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ message: "Invalid call", errors: parsed.error.flatten() });
    const created = await storage.createServiceCall(
      parsed.data,
      req.authUser!.id,
    );
    res.status(201).json(created);
  });

  app.patch("/api/service-calls/:id", requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id))
      return res.status(400).json({ message: "Invalid id" });
    const parsed = updateServiceCallSchema.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ message: "Invalid update", errors: parsed.error.flatten() });
    const updated = await storage.updateServiceCall(id, parsed.data);
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  });

  app.delete(
    "/api/service-calls/:id",
    requireAuth,
    requireRole("admin", "dispatcher"),
    async (req, res) => {
      const id = Number(req.params.id);
      if (!Number.isFinite(id))
        return res.status(400).json({ message: "Invalid id" });
      const ok = await storage.deleteServiceCall(id);
      if (!ok) return res.status(404).json({ message: "Not found" });
      res.json({ ok: true });
    },
  );

  // ---------- Messages ----------
  app.get(
    "/api/service-calls/:id/messages",
    requireAuth,
    async (req, res) => {
      const id = Number(req.params.id);
      if (!Number.isFinite(id))
        return res.status(400).json({ message: "Invalid id" });
      res.json(await storage.listMessages(id));
    },
  );

  app.post(
    "/api/service-calls/:id/messages",
    requireAuth,
    async (req, res) => {
      const id = Number(req.params.id);
      if (!Number.isFinite(id))
        return res.status(400).json({ message: "Invalid id" });
      const parsed = insertCallMessageSchema.safeParse(req.body);
      if (!parsed.success)
        return res.status(400).json({ message: "Invalid message" });
      const msg = await storage.createMessage(
        id,
        req.authUser!.id,
        parsed.data,
      );
      res.status(201).json(msg);
    },
  );

  // ---------- Checklist ----------
  app.get(
    "/api/service-calls/:id/checklist",
    requireAuth,
    async (req, res) => {
      const id = Number(req.params.id);
      if (!Number.isFinite(id))
        return res.status(400).json({ message: "Invalid id" });
      res.json(await storage.listChecklist(id));
    },
  );

  app.post(
    "/api/service-calls/:id/checklist",
    requireAuth,
    async (req, res) => {
      const id = Number(req.params.id);
      if (!Number.isFinite(id))
        return res.status(400).json({ message: "Invalid id" });
      const parsed = insertChecklistItemSchema.safeParse(req.body);
      if (!parsed.success)
        return res.status(400).json({ message: "Invalid item" });
      const item = await storage.createChecklistItem(id, parsed.data);
      res.status(201).json(item);
    },
  );

  app.patch("/api/checklist/:id", requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id))
      return res.status(400).json({ message: "Invalid id" });
    const parsed = updateChecklistItemSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ message: "Invalid update" });
    const item = await storage.updateChecklistItem(id, parsed.data);
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  });

  app.delete("/api/checklist/:id", requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id))
      return res.status(400).json({ message: "Invalid id" });
    const ok = await storage.deleteChecklistItem(id);
    if (!ok) return res.status(404).json({ message: "Not found" });
    res.json({ ok: true });
  });

  return httpServer;
}
