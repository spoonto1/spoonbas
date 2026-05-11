import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ---------- Users ----------
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  password: text("password").notNull(),
  role: text("role").notNull(), // admin | dispatcher | technician
  createdAt: integer("created_at").notNull(),
});

export const insertUserSchema = createInsertSchema(users)
  .omit({ id: true, createdAt: true })
  .extend({
    email: z.string().email(),
    name: z.string().min(1),
    password: z.string().min(1),
    role: z.enum(["admin", "dispatcher", "technician"]),
  });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type SafeUser = Omit<User, "password">;

// ---------- Service Calls ----------
export const serviceCalls = sqliteTable("service_calls", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ticketNumber: text("ticket_number").notNull().unique(),
  siteName: text("site_name").notNull(),
  siteAddress: text("site_address").notNull(),
  contactName: text("contact_name").notNull(),
  contactPhone: text("contact_phone").notNull(),
  systemType: text("system_type").notNull(), // AHU, VAV, Chiller, Boiler, BAS Controller, Other
  symptom: text("symptom").notNull(),
  description: text("description").notNull(),
  priority: text("priority").notNull(), // low | normal | high | critical
  status: text("status").notNull(), // new | triaged | dispatched | on_site | resolved | closed
  assignedToId: integer("assigned_to_id"),
  createdById: integer("created_by_id").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const insertServiceCallSchema = createInsertSchema(serviceCalls)
  .omit({
    id: true,
    ticketNumber: true,
    createdAt: true,
    updatedAt: true,
    createdById: true,
  })
  .extend({
    siteName: z.string().min(1),
    siteAddress: z.string().min(1),
    contactName: z.string().min(1),
    contactPhone: z.string().min(1),
    systemType: z.enum([
      "AHU",
      "VAV",
      "Chiller",
      "Boiler",
      "BAS Controller",
      "RTU",
      "Pump",
      "Other",
    ]),
    symptom: z.string().min(1),
    description: z.string().min(1),
    priority: z.enum(["low", "normal", "high", "critical"]),
    status: z.enum([
      "new",
      "triaged",
      "dispatched",
      "on_site",
      "resolved",
      "closed",
    ]),
    assignedToId: z.number().nullable().optional(),
  });

export const updateServiceCallSchema = insertServiceCallSchema.partial();

export type InsertServiceCall = z.infer<typeof insertServiceCallSchema>;
export type UpdateServiceCall = z.infer<typeof updateServiceCallSchema>;
export type ServiceCall = typeof serviceCalls.$inferSelect;

// ---------- Call Messages (chat thread) ----------
export const callMessages = sqliteTable("call_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  callId: integer("call_id").notNull(),
  authorId: integer("author_id").notNull(),
  body: text("body").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const insertCallMessageSchema = createInsertSchema(callMessages)
  .omit({ id: true, createdAt: true, authorId: true, callId: true })
  .extend({
    body: z.string().min(1),
  });

export type InsertCallMessage = z.infer<typeof insertCallMessageSchema>;
export type CallMessage = typeof callMessages.$inferSelect;

// ---------- Checklist Items ----------
export const checklistItems = sqliteTable("checklist_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  callId: integer("call_id").notNull(),
  label: text("label").notNull(),
  done: integer("done", { mode: "boolean" }).notNull().default(false),
  position: integer("position").notNull().default(0),
});

export const insertChecklistItemSchema = createInsertSchema(checklistItems)
  .omit({ id: true, callId: true })
  .extend({
    label: z.string().min(1),
    done: z.boolean().optional(),
    position: z.number().optional(),
  });

export const updateChecklistItemSchema = z.object({
  label: z.string().min(1).optional(),
  done: z.boolean().optional(),
  position: z.number().optional(),
});

export type InsertChecklistItem = z.infer<typeof insertChecklistItemSchema>;
export type UpdateChecklistItem = z.infer<typeof updateChecklistItemSchema>;
export type ChecklistItem = typeof checklistItems.$inferSelect;
