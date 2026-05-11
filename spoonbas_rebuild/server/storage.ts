import {
  users,
  serviceCalls,
  callMessages,
  checklistItems,
} from "@shared/schema";
import type {
  User,
  InsertUser,
  SafeUser,
  ServiceCall,
  InsertServiceCall,
  UpdateServiceCall,
  CallMessage,
  InsertCallMessage,
  ChecklistItem,
  InsertChecklistItem,
  UpdateChecklistItem,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, asc, and } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

// Make sure tables exist (for first boot before drizzle-kit push).
sqlite.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS service_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_number TEXT NOT NULL UNIQUE,
  site_name TEXT NOT NULL,
  site_address TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  system_type TEXT NOT NULL,
  symptom TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL,
  status TEXT NOT NULL,
  assigned_to_id INTEGER,
  created_by_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS call_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  call_id INTEGER NOT NULL,
  author_id INTEGER NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS checklist_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  call_id INTEGER NOT NULL,
  label TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0
);
`);

export const db = drizzle(sqlite);

function safe(u: User): SafeUser {
  const { password, ...rest } = u;
  return rest;
}

export interface IStorage {
  // users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  listUsers(): Promise<SafeUser[]>;
  createUser(u: InsertUser): Promise<SafeUser>;

  // service calls
  listServiceCalls(): Promise<ServiceCall[]>;
  getServiceCall(id: number): Promise<ServiceCall | undefined>;
  createServiceCall(
    data: InsertServiceCall,
    createdById: number,
  ): Promise<ServiceCall>;
  updateServiceCall(
    id: number,
    data: UpdateServiceCall,
  ): Promise<ServiceCall | undefined>;
  deleteServiceCall(id: number): Promise<boolean>;

  // messages
  listMessages(callId: number): Promise<CallMessage[]>;
  createMessage(
    callId: number,
    authorId: number,
    data: InsertCallMessage,
  ): Promise<CallMessage>;

  // checklist
  listChecklist(callId: number): Promise<ChecklistItem[]>;
  createChecklistItem(
    callId: number,
    data: InsertChecklistItem,
  ): Promise<ChecklistItem>;
  updateChecklistItem(
    id: number,
    data: UpdateChecklistItem,
  ): Promise<ChecklistItem | undefined>;
  deleteChecklistItem(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // ---------- Users ----------
  async getUser(id: number) {
    return db.select().from(users).where(eq(users.id, id)).get();
  }
  async getUserByEmail(email: string) {
    return db.select().from(users).where(eq(users.email, email)).get();
  }
  async listUsers() {
    const rows = db.select().from(users).orderBy(asc(users.id)).all();
    return rows.map(safe);
  }
  async createUser(u: InsertUser) {
    const row = db
      .insert(users)
      .values({ ...u, createdAt: Date.now() })
      .returning()
      .get();
    return safe(row);
  }

  // ---------- Service Calls ----------
  async listServiceCalls() {
    return db
      .select()
      .from(serviceCalls)
      .orderBy(desc(serviceCalls.updatedAt))
      .all();
  }
  async getServiceCall(id: number) {
    return db
      .select()
      .from(serviceCalls)
      .where(eq(serviceCalls.id, id))
      .get();
  }
  async createServiceCall(data: InsertServiceCall, createdById: number) {
    const now = Date.now();
    const ticketNumber = `SB-${now.toString(36).toUpperCase().slice(-6)}`;
    return db
      .insert(serviceCalls)
      .values({
        ...data,
        assignedToId: data.assignedToId ?? null,
        ticketNumber,
        createdById,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();
  }
  async updateServiceCall(id: number, data: UpdateServiceCall) {
    const existing = await this.getServiceCall(id);
    if (!existing) return undefined;
    return db
      .update(serviceCalls)
      .set({ ...data, updatedAt: Date.now() })
      .where(eq(serviceCalls.id, id))
      .returning()
      .get();
  }
  async deleteServiceCall(id: number) {
    const r = db
      .delete(serviceCalls)
      .where(eq(serviceCalls.id, id))
      .run();
    db.delete(callMessages).where(eq(callMessages.callId, id)).run();
    db.delete(checklistItems).where(eq(checklistItems.callId, id)).run();
    return (r.changes ?? 0) > 0;
  }

  // ---------- Messages ----------
  async listMessages(callId: number) {
    return db
      .select()
      .from(callMessages)
      .where(eq(callMessages.callId, callId))
      .orderBy(asc(callMessages.createdAt))
      .all();
  }
  async createMessage(
    callId: number,
    authorId: number,
    data: InsertCallMessage,
  ) {
    return db
      .insert(callMessages)
      .values({
        callId,
        authorId,
        body: data.body,
        createdAt: Date.now(),
      })
      .returning()
      .get();
  }

  // ---------- Checklist ----------
  async listChecklist(callId: number) {
    return db
      .select()
      .from(checklistItems)
      .where(eq(checklistItems.callId, callId))
      .orderBy(asc(checklistItems.position), asc(checklistItems.id))
      .all();
  }
  async createChecklistItem(callId: number, data: InsertChecklistItem) {
    return db
      .insert(checklistItems)
      .values({
        callId,
        label: data.label,
        done: data.done ?? false,
        position: data.position ?? 0,
      })
      .returning()
      .get();
  }
  async updateChecklistItem(id: number, data: UpdateChecklistItem) {
    const existing = db
      .select()
      .from(checklistItems)
      .where(eq(checklistItems.id, id))
      .get();
    if (!existing) return undefined;
    return db
      .update(checklistItems)
      .set(data)
      .where(eq(checklistItems.id, id))
      .returning()
      .get();
  }
  async deleteChecklistItem(id: number) {
    const r = db
      .delete(checklistItems)
      .where(eq(checklistItems.id, id))
      .run();
    return (r.changes ?? 0) > 0;
  }
}

export const storage = new DatabaseStorage();
