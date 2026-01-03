import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { InsertUser, InsertContact, InsertDeal, InsertActivity, InsertMessage, InsertVapiAgent, InsertVapiPhoneNumber, InsertVapiCall, InsertKwickflowBusiness, users, contacts, deals, activities, messages, tasks, vapiAgents, vapiPhoneNumbers, vapiCalls, kwickflowBusinesses } from "../drizzle/schema";
import { ENV } from './_core/env';
import type { ParsedContact } from "./utils/parseContacts";

let _db: any = null;
let _pool: mysql.Pool | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // We set TZ=UTC in the entry point, so new Date() is always UTC.
      // We also ensure the database connection treats everything as UTC.
      let url = process.env.DATABASE_URL;
      if (!url.includes('timezone=')) {
        url += (url.includes('?') ? '&' : '?') + 'timezone=Z';
      }

      _pool = mysql.createPool({
        uri: url,
        // @ts-ignore - timezone is supported in some mysql2 versions/pool configs
        timezone: 'Z',
      });
      _db = drizzle(_pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return null;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Contact queries
 */
export async function getContactsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contacts).where(eq(contacts.userId, userId));
}

export async function getContactById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.id, id), eq(contacts.userId, userId)))
    .limit(1);
  return result[0] || null;
}

export async function createContact(contactData: InsertContact) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  
  const now = new Date();
  const data = {
    ...contactData,
    createdAt: now,
    updatedAt: now,
  };
  
  const result = await db.insert(contacts).values(data);
  return { id: Number(result[0].insertId), ...data };
}

export async function updateContact(id: number, userId: number, updates: Partial<InsertContact>) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  
  // Verify ownership
  const existing = await getContactById(id, userId);
  if (!existing) {
    throw new Error("Contact not found");
  }
  
  await db.update(contacts)
    .set(updates)
    .where(and(eq(contacts.id, id), eq(contacts.userId, userId)));
  
  return getContactById(id, userId);
}

export async function deleteContact(id: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  
  // Verify ownership
  const existing = await getContactById(id, userId);
  if (!existing) {
    throw new Error("Contact not found");
  }
  
  await db.delete(contacts)
    .where(and(eq(contacts.id, id), eq(contacts.userId, userId)));
  
  return { success: true };
}

export async function getContactByEmail(email: string, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.email, email), eq(contacts.userId, userId)))
    .limit(1);
  return result[0] || null;
}

export async function getContactByExternalId(externalId: string, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.externalId, externalId), eq(contacts.userId, userId)))
    .limit(1);
  return result[0] || null;
}

export async function getContactsByParentId(parentId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(contacts)
    .where(and(eq(contacts.parentId, parentId), eq(contacts.userId, userId)));
}

export async function upsertContact(contactData: InsertContact) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const now = new Date();
  const data = {
    ...contactData,
    updatedAt: now,
    createdAt: contactData.createdAt || now,
  };
  
  // We upsert based on externalId if provided
  if (data.externalId) {
    // Check if exists by externalId
    const existing = await db.select().from(contacts).where(eq(contacts.externalId, data.externalId)).limit(1);
    if (existing.length > 0) {
      await db.update(contacts).set({
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        location: data.location,
        category: data.category,
        type: data.type || existing[0].type,
        parentId: data.parentId || existing[0].parentId,
        status: data.status,
        externalData: data.externalData,
        updatedAt: now,
      }).where(eq(contacts.id, existing[0].id));
      const updated = await db.select().from(contacts).where(eq(contacts.id, existing[0].id)).limit(1);
      return updated[0];
    } else {
      const result = await db.insert(contacts).values(data);
      const inserted = await db.select().from(contacts).where(eq(contacts.id, result[0].insertId)).limit(1);
      return inserted[0];
    }
  } else if (data.email) {
    // Check if exists by email + userId
    const existing = await db.select().from(contacts).where(and(eq(contacts.email, data.email), eq(contacts.userId, data.userId))).limit(1);
    if (existing.length > 0) {
      await db.update(contacts).set({
        name: data.name,
        phone: data.phone,
        company: data.company,
        location: data.location,
        category: data.category,
        type: data.type || existing[0].type,
        parentId: data.parentId || existing[0].parentId,
        status: data.status,
        updatedAt: now,
      }).where(eq(contacts.id, existing[0].id));
      const updated = await db.select().from(contacts).where(eq(contacts.id, existing[0].id)).limit(1);
      return updated[0];
    } else {
      const result = await db.insert(contacts).values(data);
      const inserted = await db.select().from(contacts).where(eq(contacts.id, result[0].insertId)).limit(1);
      return inserted[0];
    }
  } else {
    const result = await db.insert(contacts).values(data);
    const inserted = await db.select().from(contacts).where(eq(contacts.id, result[0].insertId)).limit(1);
    return inserted[0];
  }
}

export async function insertContacts(contactData: ParsedContact[], userId: number): Promise<number> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  
  if (contactData.length === 0) {
    return 0;
  }

  try {
    // Add userId to each contact
    const contactsWithUserId: InsertContact[] = contactData.map(contact => ({
      ...contact,
      userId,
    }));
    
    await db.insert(contacts).values(contactsWithUserId);
    return contactsWithUserId.length;
  } catch (error) {
    console.error("[Database] Failed to insert contacts:", error);
    throw error;
  }
}

/**
 * Deal queries
 */
export async function getDealsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(deals).where(eq(deals.userId, userId));
}

export async function getDealById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(deals)
    .where(and(eq(deals.id, id), eq(deals.userId, userId)))
    .limit(1);
  return result[0] || null;
}

export async function createDeal(dealData: InsertDeal) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  
  const now = new Date();
  const data = {
    ...dealData,
    createdAt: now,
    updatedAt: now,
  };
  
  const result = await db.insert(deals).values(data);
  return { id: Number(result[0].insertId), ...data };
}

export async function updateDeal(id: number, userId: number, updates: Partial<InsertDeal>) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  
  // Verify ownership
  const existing = await getDealById(id, userId);
  if (!existing) {
    throw new Error("Deal not found");
  }
  
  await db.update(deals)
    .set(updates)
    .where(and(eq(deals.id, id), eq(deals.userId, userId)));
  
  return getDealById(id, userId);
}

export async function deleteDeal(id: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  
  // Verify ownership
  const existing = await getDealById(id, userId);
  if (!existing) {
    throw new Error("Deal not found");
  }
  
  await db.delete(deals)
    .where(and(eq(deals.id, id), eq(deals.userId, userId)));
  
  return { success: true };
}

/**
 * Activity queries
 */
export async function getActivitiesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(activities).where(eq(activities.userId, userId)).orderBy(desc(activities.createdAt));
}

export async function getActivitiesByContactId(contactId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(activities)
    .where(and(eq(activities.contactId, contactId), eq(activities.userId, userId)))
    .orderBy(desc(activities.createdAt));
}

export async function createActivity(activityData: InsertActivity) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  
  const now = new Date();
  const data = {
    ...activityData,
    createdAt: now,
    updatedAt: now,
  };
  
  const result = await db.insert(activities).values(data);
  return { id: Number(result[0].insertId), ...data };
}

export async function updateActivity(id: number, userId: number, updates: Partial<InsertActivity>) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  
  await db.update(activities)
    .set(updates)
    .where(and(eq(activities.id, id), eq(activities.userId, userId)));
  
  const result = await db.select().from(activities).where(eq(activities.id, id)).limit(1);
  return result[0];
}

export async function deleteActivity(id: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  
  await db.delete(activities)
    .where(and(eq(activities.id, id), eq(activities.userId, userId)));
  
  return { success: true };
}

/**
 * Message queries
 */
export async function getMessagesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(messages).where(eq(messages.userId, userId)).orderBy(desc(messages.createdAt));
}

export async function getMessagesByContactId(contactId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(messages)
    .where(and(eq(messages.contactId, contactId), eq(messages.userId, userId)))
    .orderBy(desc(messages.createdAt));
}

export async function createMessage(messageData: InsertMessage) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  
  const now = new Date();
  const data = {
    ...messageData,
    createdAt: now,
    updatedAt: now,
  };
  
  const result = await db.insert(messages).values(data);
  return { id: Number(result[0].insertId), ...data };
}

export async function updateMessage(id: number, userId: number, updates: Partial<InsertMessage>) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  
  await db.update(messages)
    .set(updates)
    .where(and(eq(messages.id, id), eq(messages.userId, userId)));
  
  const result = await db.select().from(messages).where(eq(messages.id, id)).limit(1);
  return result[0];
}

export async function deleteMessage(id: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  
  await db.delete(messages)
    .where(and(eq(messages.id, id), eq(messages.userId, userId)));
  
  return { success: true };
}

/**
 * Task queries
 */
export async function getTasksByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(tasks)
    .where(eq(tasks.userId, userId))
    .orderBy(tasks.dueDate);
}

/**
 * Vapi Agent queries
 */
export async function getVapiAgentsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(vapiAgents).where(eq(vapiAgents.userId, userId));
}

export async function createVapiAgent(agentData: InsertVapiAgent) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  
  const now = new Date();
  const data = {
    ...agentData,
    createdAt: now,
    updatedAt: now,
  };
  
  const result = await db.insert(vapiAgents).values(data);
  return { id: Number(result[0].insertId), ...data };
}

export async function updateVapiAgent(vapiId: string, userId: number, updates: Partial<InsertVapiAgent>) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  
  await db.update(vapiAgents)
    .set(updates)
    .where(and(eq(vapiAgents.vapiId, vapiId), eq(vapiAgents.userId, userId)));
  
  const result = await db.select().from(vapiAgents).where(eq(vapiAgents.vapiId, vapiId)).limit(1);
  return result[0];
}

export async function deleteVapiAgent(vapiId: string, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  
  await db.delete(vapiAgents)
    .where(and(eq(vapiAgents.vapiId, vapiId), eq(vapiAgents.userId, userId)));
  
  return { success: true };
}

/**
 * Vapi Phone Number queries
 */
export async function getVapiPhoneNumbersByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(vapiPhoneNumbers).where(eq(vapiPhoneNumbers.userId, userId));
}

export async function createVapiPhoneNumber(phoneData: InsertVapiPhoneNumber) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  
  const now = new Date();
  const data = {
    ...phoneData,
    createdAt: now,
    updatedAt: now,
  };
  
  const result = await db.insert(vapiPhoneNumbers).values(data);
  return { id: Number(result[0].insertId), ...data };
}

export async function upsertVapiAgent(agentData: InsertVapiAgent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const now = new Date();
  const data = {
    ...agentData,
    updatedAt: now,
    createdAt: agentData.createdAt || now,
  };
  
  await db.insert(vapiAgents).values(data).onDuplicateKeyUpdate({
    set: {
      name: agentData.name,
      model: agentData.model,
      voice: agentData.voice,
      firstMessage: agentData.firstMessage,
      voicemailMessage: agentData.voicemailMessage,
      endCallMessage: agentData.endCallMessage,
      systemPrompt: agentData.systemPrompt,
      updatedAt: now,
    }
  });
}

export async function upsertVapiPhoneNumber(phoneData: InsertVapiPhoneNumber) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const now = new Date();
  const data = {
    ...phoneData,
    updatedAt: now,
    createdAt: phoneData.createdAt || now,
  };
  
  await db.insert(vapiPhoneNumbers).values(data).onDuplicateKeyUpdate({
    set: {
      number: phoneData.number,
      provider: phoneData.provider,
      assistantId: phoneData.assistantId,
      updatedAt: now,
    }
  });
}

export async function getVapiCallsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(vapiCalls).where(eq(vapiCalls.userId, userId)).orderBy(desc(vapiCalls.createdAt));
}

export async function upsertVapiCall(callData: InsertVapiCall) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const now = new Date();
  const data = {
    ...callData,
    createdAt: callData.createdAt || now,
  };
  
  await db.insert(vapiCalls).values(data).onDuplicateKeyUpdate({
    set: {
      status: callData.status,
      recordingUrl: callData.recordingUrl,
      summary: callData.summary,
      transcript: callData.transcript,
      duration: callData.duration,
      endedAt: callData.endedAt,
    }
  });
}

/**
 * KwickFlow Business queries
 */
export async function getKwickFlowBusinessByContactId(contactId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(kwickflowBusinesses)
    .where(and(eq(kwickflowBusinesses.contactId, contactId), eq(kwickflowBusinesses.userId, userId)))
    .limit(1);
  return result[0] || null;
}

export async function upsertKwickFlowBusiness(bizData: InsertKwickflowBusiness) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const now = new Date();
  const data = {
    ...bizData,
    updatedAt: now,
    createdAt: bizData.createdAt || now,
  };
  
  await db.insert(kwickflowBusinesses).values(data).onDuplicateKeyUpdate({
    set: {
      name: bizData.name,
      category: bizData.category,
      ownerUserId: bizData.ownerUserId,
      status: bizData.status,
      subscription: bizData.subscription,
      contactInfo: bizData.contactInfo,
      ownerInfo: bizData.ownerInfo,
      users: bizData.users,
      updatedAt: now,
    }
  });
}
