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
  type: mysqlEnum("type", ["individual", "company"]).default("individual").notNull(),
  parentId: int("parentId"), // Link individual to company
  status: mysqlEnum("status", ["prospect", "lead", "customer", "inactive"]).default("prospect").notNull(),
  notes: text("notes"),
  website: varchar("website", { length: 500 }),
  contactPerson: varchar("contactPerson", { length: 255 }),
  lastContactedAt: timestamp("lastContactedAt"),
  externalId: varchar("externalId", { length: 255 }), // KwickFlow Business ID
  externalData: json("externalData"), // Full business data from KwickFlow
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
  messageId: varchar("messageId", { length: 255 }), // External message ID
  threadId: varchar("threadId", { length: 255 }), // ID to group related messages
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

/**
 * OAuth Applications table - stores registered OAuth applications
 */
export const oauthApplications = mysqlTable("oauthApplications", {
  id: int("id").autoincrement().primaryKey(),
  appId: varchar("appId", { length: 64 }).notNull().unique(),
  appSecret: varchar("appSecret", { length: 128 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  redirectUris: text("redirectUris").notNull(), // JSON array of allowed redirect URIs
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OAuthApplication = typeof oauthApplications.$inferSelect;
export type InsertOAuthApplication = typeof oauthApplications.$inferInsert;

/**
 * OAuth Authorization Codes table - temporary codes for authorization flow
 */
export const oauthAuthorizationCodes = mysqlTable("oauthAuthorizationCodes", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 128 }).notNull().unique(),
  appId: varchar("appId", { length: 64 }).notNull(),
  userId: int("userId").notNull(),
  redirectUri: text("redirectUri").notNull(),
  state: varchar("state", { length: 512 }),
  expiresAt: timestamp("expiresAt").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OAuthAuthorizationCode = typeof oauthAuthorizationCodes.$inferSelect;
export type InsertOAuthAuthorizationCode = typeof oauthAuthorizationCodes.$inferInsert;

/**
 * OAuth Access Tokens table - stores issued access tokens
 */
export const oauthAccessTokens = mysqlTable("oauthAccessTokens", {
  id: int("id").autoincrement().primaryKey(),
  token: varchar("token", { length: 512 }).notNull().unique(),
  appId: varchar("appId", { length: 64 }).notNull(),
  userId: int("userId").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OAuthAccessToken = typeof oauthAccessTokens.$inferSelect;
export type InsertOAuthAccessToken = typeof oauthAccessTokens.$inferInsert;

/**
 * Vapi Agents table - stores voice AI agents
 */
export const vapiAgents = mysqlTable("vapiAgents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  vapiId: varchar("vapiId", { length: 255 }).notNull().unique(), // The assistant ID from Vapi
  name: varchar("name", { length: 255 }).notNull(),
  model: varchar("model", { length: 50 }).default("gpt-4").notNull(),
  voice: varchar("voice", { length: 50 }).default("josh").notNull(),
  transcriber: varchar("transcriber", { length: 50 }).default("deepgram").notNull(),
  firstMessage: text("firstMessage"),
  voicemailMessage: text("voicemailMessage"),
  endCallMessage: text("endCallMessage"),
  systemPrompt: text("systemPrompt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VapiAgent = typeof vapiAgents.$inferSelect;
export type InsertVapiAgent = typeof vapiAgents.$inferInsert;

/**
 * Vapi Phone Numbers table - stores connected phone numbers
 */
export const vapiPhoneNumbers = mysqlTable("vapiPhoneNumbers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  vapiId: varchar("vapiId", { length: 255 }).notNull().unique(), // The phone number ID from Vapi
  number: varchar("number", { length: 20 }).notNull(),
  provider: varchar("provider", { length: 50 }).default("twilio").notNull(),
  assistantId: varchar("assistantId", { length: 255 }), // Vapi Assistant ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VapiPhoneNumber = typeof vapiPhoneNumbers.$inferSelect;
export type InsertVapiPhoneNumber = typeof vapiPhoneNumbers.$inferInsert;

/**
 * Vapi Calls table - logs and tracks calls
 */
export const vapiCalls = mysqlTable("vapiCalls", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  vapiCallId: varchar("vapiCallId", { length: 255 }).notNull().unique(),
  assistantId: varchar("assistantId", { length: 255 }),
  phoneNumberId: varchar("phoneNumberId", { length: 255 }),
  type: varchar("type", { length: 20 }), // inbound, outbound
  status: varchar("status", { length: 50 }),
  customerNumber: varchar("customerNumber", { length: 20 }),
  recordingUrl: text("recordingUrl"),
  summary: text("summary"),
  transcript: text("transcript"),
  duration: int("duration"),
  startedAt: timestamp("startedAt"),
  endedAt: timestamp("endedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VapiCall = typeof vapiCalls.$inferSelect;
export type InsertVapiCall = typeof vapiCalls.$inferInsert;

/**
 * KwickFlow Businesses table - stores data synced from KwickFlow Admin API
 */
export const kwickflowBusinesses = mysqlTable("kwickflowBusinesses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  businessId: varchar("businessId", { length: 255 }).notNull().unique(),
  contactId: int("contactId").notNull(), // CRM Contact ID
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),
  ownerUserId: varchar("ownerUserId", { length: 255 }),
  status: varchar("status", { length: 50 }),
  subscription: json("subscription"), // Store isActive, planName, etc.
  contactInfo: json("contactInfo"), // Store address, phone, email
  ownerInfo: json("ownerInfo"), // Store name, email, phone from owner object
  users: json("users"), // Store list of staff
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KwickflowBusiness = typeof kwickflowBusinesses.$inferSelect;
export type InsertKwickflowBusiness = typeof kwickflowBusinesses.$inferInsert;
