import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Contacts table - stores business leads and customer information
 */
export const contacts = mysqlTable("contacts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  company: varchar("company", { length: 255 }),
  location: text("location"),
  category: varchar("category", { length: 100 }),
  status: mysqlEnum("status", ["prospect", "lead", "customer", "inactive"]).default("prospect").notNull(),
  notes: text("notes"),
  website: varchar("website", { length: 500 }),
  contactPerson: varchar("contactPerson", { length: 255 }),
  lastContactedAt: timestamp("lastContactedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;

/**
 * Deals table - tracks sales opportunities
 */
export const deals = mysqlTable("deals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  contactId: int("contactId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  value: decimal("value", { precision: 12, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("USD"),
  stage: mysqlEnum("stage", ["prospecting", "negotiation", "proposal", "won", "lost"]).default("prospecting").notNull(),
  probability: int("probability").default(0),
  expectedCloseDate: timestamp("expectedCloseDate"),
  closedAt: timestamp("closedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Deal = typeof deals.$inferSelect;
export type InsertDeal = typeof deals.$inferInsert;

/**
 * Activities table - logs calls, emails, meetings, notes
 */
export const activities = mysqlTable("activities", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  contactId: int("contactId"),
  dealId: int("dealId"),
  type: mysqlEnum("type", ["call", "email", "meeting", "note", "task"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  duration: int("duration"),
  outcome: varchar("outcome", { length: 100 }),
  scheduledFor: timestamp("scheduledFor"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = typeof activities.$inferInsert;

/**
 * Messages table - internal communication and notes
 */
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  contactId: int("contactId"),
  dealId: int("dealId"),
  type: mysqlEnum("type", ["internal_note", "email", "sms", "call_log"]).default("internal_note").notNull(),
  subject: varchar("subject", { length: 255 }),
  content: text("content").notNull(),
  senderName: varchar("senderName", { length: 255 }),
  recipientEmail: varchar("recipientEmail", { length: 320 }),
  isRead: boolean("isRead").default(false),
  attachments: json("attachments"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * Tasks table - reminders and follow-ups
 */
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  contactId: int("contactId"),
  dealId: int("dealId"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  priority: mysqlEnum("priority", ["low", "medium", "high"]).default("medium").notNull(),
  status: mysqlEnum("status", ["pending", "in_progress", "completed"]).default("pending").notNull(),
  dueDate: timestamp("dueDate").notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

/**
 * Deal stages history - track deal progression
 */
export const dealHistory = mysqlTable("dealHistory", {
  id: int("id").autoincrement().primaryKey(),
  dealId: int("dealId").notNull(),
  userId: int("userId").notNull(),
  previousStage: varchar("previousStage", { length: 50 }),
  newStage: varchar("newStage", { length: 50 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DealHistory = typeof dealHistory.$inferSelect;
export type InsertDealHistory = typeof dealHistory.$inferInsert;