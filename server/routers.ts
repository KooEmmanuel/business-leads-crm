import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

async function syncBusinessesToDb(userId: number, businesses: any[]) {
  for (const biz of businesses) {
    const normalize = (val: any) => {
      if (!val || val === "Unknown" || val === "N/A" || val === "") return null;
      return val;
    };

    // 1. Resolve best owner info for the company level
    const bestOwner = biz.users?.find((u: any) => u.userType === "business_owner") || 
                      biz.users?.find((u: any) => u.role?.toLowerCase() === "admin") ||
                      biz.owner;

    const bizEmail = normalize(bestOwner?.email || biz.contact?.email);
    const bizPhone = normalize(bestOwner?.phone || biz.contact?.phone);

    // 2. Sync the primary COMPANY contact
    const companyContact = await db.upsertContact({
      userId: userId,
      externalId: biz.id, // KwickFlow Business ID
      name: biz.name,
      email: bizEmail,
      phone: bizPhone,
      company: biz.name,
      location: normalize(biz.contact?.address),
      category: normalize(biz.category),
      type: "company",
      status: biz.status === "active" ? "customer" : "lead",
      externalData: biz,
    });

    if (!companyContact) continue;

    // 3. Process all staff members associated with this business
    const bizUsers = biz.users || [];
    for (const user of bizUsers) {
      const userEmail = normalize(user.email);
      if (!userEmail) continue;

      await db.upsertContact({
        userId: userId,
        externalId: user.id, // KwickFlow User ID
        name: normalize(user.name) || "Unknown Staff",
        email: userEmail,
        phone: normalize(user.phone || biz.contact?.phone),
        company: biz.name,
        location: normalize(biz.contact?.address),
        category: normalize(biz.category),
        type: "individual",
        parentId: companyContact.id, // LINK TO COMPANY
        status: biz.status === "active" ? "customer" : "lead",
        contactPerson: normalize(user.role),
        externalData: user,
      });
    }

    // 4. Update detailed metadata record
    await db.upsertKwickFlowBusiness({
      userId: userId,
      businessId: biz.id,
      contactId: companyContact.id,
      name: biz.name,
      category: normalize(biz.category),
      ownerUserId: biz.owner?.id || bestOwner?.id,
      status: biz.status,
      subscription: biz.subscription,
      contactInfo: biz.contact,
      ownerInfo: normalize(biz.owner?.name) === null ? bestOwner : biz.owner,
      users: biz.users,
      createdAt: biz.createdDate ? new Date(biz.createdDate) : new Date(),
      updatedAt: biz.modifiedDate ? new Date(biz.modifiedDate) : new Date(),
    });
  }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(async (opts) => {
      // If user is authenticated, return it; otherwise return null
      // This allows the client to check auth status
      return opts.ctx.user;
    }),
    sync: publicProcedure.mutation(async ({ ctx }) => {
      // Sync current user to database (useful after Clerk sign-in)
      // The context already handles syncing, but this endpoint ensures it happens
      return {
        success: true,
        user: ctx.user,
      };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  contacts: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const { KwickFlowClient } = await import("./utils/kwickflow");
      try {
        const data = await KwickFlowClient.getBusinesses();
        const businesses = data.businesses || [];
        console.log(`[KwickFlow Sync] Processing ${businesses.length} businesses from API`);
        await syncBusinessesToDb(ctx.user.id, businesses);
      } catch (err) {
        console.error("[KwickFlow Auto-Sync] Failed:", err);
      }
      return db.getContactsByUserId(ctx.user.id);
    }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ ctx, input }) => db.getContactById(input.id, ctx.user.id)),
    getRelated: protectedProcedure
      .input(z.object({ parentId: z.number() }))
      .query(({ ctx, input }) => db.getContactsByParentId(input.parentId, ctx.user.id)),
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          email: z.preprocess((val) => (val === "" ? null : val), z.string().email().nullable().optional()),
          phone: z.string().nullable().optional(),
          company: z.string().nullable().optional(),
          location: z.string().nullable().optional(),
          category: z.string().nullable().optional(),
          type: z.enum(["individual", "company"]).default("individual"),
          status: z.enum(["prospect", "lead", "customer", "inactive"]).default("prospect"),
          notes: z.string().nullable().optional(),
          website: z.string().nullable().optional(),
          contactPerson: z.string().nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return db.createContact({
          ...input,
          userId: ctx.user.id,
        });
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).optional(),
          email: z.preprocess((val) => (val === "" ? null : val), z.string().email().nullable().optional()),
          phone: z.string().nullable().optional(),
          company: z.string().nullable().optional(),
          location: z.string().nullable().optional(),
          category: z.string().nullable().optional(),
          status: z.enum(["prospect", "lead", "customer", "inactive"]).optional(),
          type: z.enum(["individual", "company"]).optional(),
          notes: z.string().nullable().optional(),
          website: z.string().nullable().optional(),
          contactPerson: z.string().nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return db.updateContact(input.id, ctx.user.id, input);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return db.deleteContact(input.id, ctx.user.id);
      }),
    import: protectedProcedure
      .input(
        z.object({
          fileContent: z.string(), // Base64 encoded file content
          fileName: z.string(),
          fileType: z.enum(["csv", "xlsx", "xls"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { parseCSV, parseExcel } = await import("./utils/parseContacts");
        const { insertContacts } = await import("./db");
        
        let contacts: any[] = [];
        let errors: string[] = [];
        
        try {
          // Decode base64 file content
          const fileBuffer = Buffer.from(input.fileContent, "base64");
          
          if (input.fileType === "csv") {
            const csvContent = fileBuffer.toString("utf-8");
            const result = parseCSV(csvContent);
            contacts = result.contacts;
            errors = result.errors;
          } else {
            // Excel file
            const result = parseExcel(fileBuffer);
            contacts = result.contacts;
            errors = result.errors;
          }
          
          // Insert contacts into database with userId
          let insertedCount = 0;
          if (contacts.length > 0) {
            insertedCount = await insertContacts(contacts, ctx.user.id);
          }
          
          return {
            success: true,
            inserted: insertedCount,
            total: contacts.length,
            errors: errors.length > 0 ? errors : undefined,
          };
        } catch (error) {
          console.error("[Import] Failed to import contacts:", error);
          throw new Error(`Failed to import contacts: ${error instanceof Error ? error.message : String(error)}`);
        }
      }),
    syncExternal: protectedProcedure.mutation(async ({ ctx }) => {
      const { KwickFlowClient } = await import("./utils/kwickflow");
      try {
        const data = await KwickFlowClient.getBusinesses();
        const businesses = data.businesses || [];
        await syncBusinessesToDb(ctx.user.id, businesses);
        return { success: true, count: businesses.length };
      } catch (error) {
        console.error("[Sync External] Failed:", error);
        throw new Error("Failed to sync external businesses");
      }
    }),
  }),

  deals: router({
    list: protectedProcedure.query(({ ctx }) => db.getDealsByUserId(ctx.user.id)),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ ctx, input }) => db.getDealById(input.id, ctx.user.id)),
    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1),
          contactId: z.number(),
          description: z.string().nullable().optional(),
          value: z.number().nullable().optional(),
          currency: z.string().default("USD"),
          stage: z.enum(["prospecting", "negotiation", "proposal", "won", "lost"]).default("prospecting"),
          probability: z.number().min(0).max(100).default(50),
          expectedCloseDate: z.string().nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { expectedCloseDate, value, ...rest } = input;
        return db.createDeal({
          ...rest,
          value: value?.toString(),
          expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
          userId: ctx.user.id,
        });
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().min(1).optional(),
          contactId: z.number().optional(),
          description: z.string().nullable().optional(),
          value: z.number().nullable().optional(),
          currency: z.string().optional(),
          stage: z.enum(["prospecting", "negotiation", "proposal", "won", "lost"]).optional(),
          probability: z.number().min(0).max(100).optional(),
          expectedCloseDate: z.string().nullable().optional(),
          closedAt: z.string().nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { expectedCloseDate, closedAt, value, ...rest } = input;
        const updates: any = { ...rest };
        if (value !== undefined) {
          updates.value = value?.toString();
        }
        if (expectedCloseDate !== undefined) {
          updates.expectedCloseDate = expectedCloseDate ? new Date(expectedCloseDate) : null;
        }
        if (closedAt !== undefined) {
          updates.closedAt = closedAt ? new Date(closedAt) : null;
        }
        return db.updateDeal(input.id, ctx.user.id, updates);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return db.deleteDeal(input.id, ctx.user.id);
      }),
  }),

  activities: router({
    list: protectedProcedure.query(({ ctx }) => db.getActivitiesByUserId(ctx.user.id)),
    getByContact: protectedProcedure
      .input(z.object({ contactId: z.number() }))
      .query(({ ctx, input }) => db.getActivitiesByContactId(input.contactId, ctx.user.id)),
    create: protectedProcedure
      .input(
        z.object({
          type: z.enum(["call", "email", "meeting", "note", "task"]),
          title: z.string().min(1),
          description: z.string().nullable().optional(),
          contactId: z.number().nullable().optional(),
          dealId: z.number().nullable().optional(),
          duration: z.number().nullable().optional(),
          outcome: z.string().nullable().optional(),
          scheduledFor: z.string().nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { scheduledFor, ...rest } = input;
        return db.createActivity({
          ...rest,
          scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
          userId: ctx.user.id,
        });
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          type: z.enum(["call", "email", "meeting", "note", "task"]).optional(),
          title: z.string().min(1).optional(),
          description: z.string().nullable().optional(),
          contactId: z.number().nullable().optional(),
          dealId: z.number().nullable().optional(),
          duration: z.number().nullable().optional(),
          outcome: z.string().nullable().optional(),
          scheduledFor: z.string().nullable().optional(),
          completedAt: z.string().nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { scheduledFor, completedAt, ...rest } = input;
        const updates: any = { ...rest };
        if (scheduledFor !== undefined) {
          updates.scheduledFor = scheduledFor ? new Date(scheduledFor) : null;
        }
        if (completedAt !== undefined) {
          updates.completedAt = completedAt ? new Date(completedAt) : null;
        }
        return db.updateActivity(input.id, ctx.user.id, updates);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return db.deleteActivity(input.id, ctx.user.id);
      }),
  }),

  messages: router({
    list: protectedProcedure.query(({ ctx }) => db.getMessagesByUserId(ctx.user.id)),
    getByContact: protectedProcedure
      .input(z.object({ contactId: z.number() }))
      .query(({ ctx, input }) => db.getMessagesByContactId(input.contactId, ctx.user.id)),
    create: protectedProcedure
      .input(
        z.object({
          type: z.enum(["internal_note", "email", "sms", "call_log"]).default("internal_note"),
          subject: z.string().nullable().optional(),
          content: z.string().min(1),
          contactId: z.number().nullable().optional(),
          dealId: z.number().nullable().optional(),
          senderName: z.string().nullable().optional(),
          recipientEmail: z.string().nullable().optional(),
          threadId: z.string().nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return db.createMessage({
          ...input,
          userId: ctx.user.id,
        });
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          isRead: z.boolean().optional(),
          content: z.string().optional(),
          subject: z.string().nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return db.updateMessage(input.id, ctx.user.id, input);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return db.deleteMessage(input.id, ctx.user.id);
      }),
  }),

  tasks: router({
    list: protectedProcedure.query(({ ctx }) => db.getTasksByUserId(ctx.user.id)),
  }),

  kwickflow: router({
    syncBusinesses: protectedProcedure.mutation(async ({ ctx }) => {
      const { KwickFlowClient } = await import("./utils/kwickflow");
      try {
        const data = await KwickFlowClient.getBusinesses();
        const businesses = data.businesses || [];
        console.log(`[KwickFlow Sync] Processing ${businesses.length} businesses from API`);
        await syncBusinessesToDb(ctx.user.id, businesses);
        return { success: true, count: businesses.length };
      } catch (error) {
        console.error("[KwickFlow Sync] Failed:", error);
        throw new Error("Failed to sync KwickFlow businesses");
      }
    }),
    getBusinessByContactId: protectedProcedure
      .input(z.object({ contactId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getKwickFlowBusinessByContactId(input.contactId, ctx.user.id);
      }),
  }),

  email: router({
    send: protectedProcedure
      .input(
        z.object({
          to: z.string().email().transform(v => v.trim()),
          subject: z.string().min(1),
          content: z.string().min(1),
          contactId: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { EmailService } = await import("./utils/email");
        
        // 1. Send email
        await EmailService.sendEmail(input.to, input.subject, input.content);
        
        // 2. Calculate threadId
        const threadId = input.subject.replace(/^(Re|Fwd|Aw|Rif):\s*/i, "").trim().toLowerCase();

        // 3. Log message
        if (input.contactId) {
          await db.createMessage({
            userId: ctx.user.id,
            contactId: input.contactId,
            type: "email",
            subject: input.subject,
            content: input.content,
            recipientEmail: input.to,
            threadId: threadId,
          });
          
          await db.createActivity({
            userId: ctx.user.id,
            contactId: input.contactId,
            type: "email",
            title: `Sent email: ${input.subject}`,
            description: input.content.substring(0, 200),
          });
        }
        
        return { success: true };
      }),
    list: protectedProcedure
      .input(z.object({ email: z.string().optional() }).optional())
      .query(async ({ input }) => {
        const { EmailService } = await import("./utils/email");
        const emails = await EmailService.fetchEmails();
        
        if (input?.email) {
          return emails.filter(e => 
            e.fromEmail?.toLowerCase() === input.email?.toLowerCase() || 
            e.to?.toLowerCase() === input.email?.toLowerCase() 
          );
        }
        
        return emails;
      }),
  }),
  
    vapi: router({
    listAgents: protectedProcedure.query(async ({ ctx }) => {
      const { VapiClient } = await import("./utils/vapi");
      try {
        const vapiAssistants = await VapiClient.listAssistants();
        for (const assistant of vapiAssistants) {
          await db.upsertVapiAgent({
            userId: ctx.user.id,
            vapiId: assistant.id,
            name: assistant.name,
            model: assistant.model?.model || "gpt-4o",
            voice: assistant.voice?.voiceId || "Elliot",
            firstMessage: assistant.firstMessage,
            voicemailMessage: assistant.voicemailMessage,
            endCallMessage: assistant.endCallMessage,
            systemPrompt: assistant.model?.messages?.find((m: any) => m.role === "system")?.content,
          });
        }
      } catch (err) {
        console.error("[Vapi Sync] Failed to auto-sync agents:", err);
      }
      return db.getVapiAgentsByUserId(ctx.user.id);
    }),
    createAgent: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          model: z.string().default("gpt-4o"),
          voice: z.string().default("Elliot"),
          voiceProvider: z.string().default("vapi"),
          firstMessage: z.string().optional(),
          systemPrompt: z.string().optional(),
          voicemailMessage: z.string().optional(),
          endCallMessage: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { VapiClient } = await import("./utils/vapi");
        
        // 1. Create in Vapi
        const vapiAssistant = await VapiClient.createAssistant(input);
        
        // 2. Save in our DB
        return db.createVapiAgent({
          userId: ctx.user.id,
          vapiId: vapiAssistant.id,
          name: input.name,
          model: input.model,
          voice: input.voice,
          firstMessage: input.firstMessage,
          voicemailMessage: input.voicemailMessage,
          endCallMessage: input.endCallMessage,
          systemPrompt: input.systemPrompt,
        });
      }),
    updateAgent: protectedProcedure
      .input(
        z.object({
          vapiId: z.string(),
          name: z.string().optional(),
          model: z.string().optional(),
          voice: z.string().optional(),
          voiceProvider: z.string().optional(),
          firstMessage: z.string().optional(),
          systemPrompt: z.string().optional(),
          voicemailMessage: z.string().optional(),
          endCallMessage: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { VapiClient } = await import("./utils/vapi");
        const { vapiId, ...data } = input;
        
        // 1. Update in Vapi
        await VapiClient.updateAssistant(vapiId, data);
        
        // 2. Update in our DB
        return db.updateVapiAgent(vapiId, ctx.user.id, data);
      }),
    deleteAgent: protectedProcedure
      .input(z.object({ vapiId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const { VapiClient } = await import("./utils/vapi");
        
        // 1. Delete from Vapi
        await VapiClient.deleteAssistant(input.vapiId);
        
        // 2. Delete from our DB
        return db.deleteVapiAgent(input.vapiId, ctx.user.id);
      }),
    syncAgents: protectedProcedure.mutation(async ({ ctx }) => {
      const { VapiClient } = await import("./utils/vapi");
      
      // 1. Fetch from Vapi
      const vapiAssistants = await VapiClient.listAssistants();
      
      // 2. Sync to our DB
      for (const assistant of vapiAssistants) {
        await db.upsertVapiAgent({
          userId: ctx.user.id,
          vapiId: assistant.id,
          name: assistant.name,
          model: assistant.model?.model || "gpt-4o",
          voice: assistant.voice?.voiceId || "Elliot",
          firstMessage: assistant.firstMessage,
          voicemailMessage: assistant.voicemailMessage,
          endCallMessage: assistant.endCallMessage,
          systemPrompt: assistant.model?.messages?.find((m: any) => m.role === "system")?.content,
        });
      }
      
      return { success: true, count: vapiAssistants.length };
    }),
    listPhoneNumbers: protectedProcedure.query(async ({ ctx }) => {
      const { VapiClient } = await import("./utils/vapi");
      const { upsertVapiPhoneNumber } = await import("./db");
      try {
        const vapiNumbers = await VapiClient.listPhoneNumbers();
        for (const vnum of vapiNumbers) {
          await upsertVapiPhoneNumber({
            userId: ctx.user.id,
            vapiId: vnum.id,
            number: vnum.number,
            provider: vnum.provider,
            assistantId: vnum.assistantId,
          });
        }
      } catch (err) {
        console.error("[Vapi Sync] Failed to auto-sync phone numbers:", err);
      }
      return db.getVapiPhoneNumbersByUserId(ctx.user.id);
    }),
    provisionPhoneNumber: protectedProcedure
      .input(
        z.object({
          areaCode: z.string().length(3).optional(),
          name: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { VapiClient } = await import("./utils/vapi");
        
        // 1. Provision in Vapi
        const vapiPhone = await VapiClient.provisionPhoneNumber(input);
        
        // 2. Save in our DB
        return db.createVapiPhoneNumber({
          userId: ctx.user.id,
          vapiId: vapiPhone.id,
          number: vapiPhone.number,
          provider: "vapi",
        });
      }),
    importPhoneNumber: protectedProcedure
      .input(
        z.object({
          number: z.string().min(1),
          provider: z.string().default("twilio"),
          twilioAccountSid: z.string().optional(),
          twilioAuthToken: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { VapiClient } = await import("./utils/vapi");
        
        // 1. Import to Vapi
        const vapiPhone = await VapiClient.importPhoneNumber(input);
        
        // 2. Save in our DB
        return db.createVapiPhoneNumber({
          userId: ctx.user.id,
          vapiId: vapiPhone.id,
          number: input.number,
          provider: input.provider,
        });
      }),
    syncPhoneNumbers: protectedProcedure.mutation(async ({ ctx }) => {
      const { VapiClient } = await import("./utils/vapi");
      const { upsertVapiPhoneNumber } = await import("./db");
      
      // 1. Fetch from Vapi
      const vapiNumbers = await VapiClient.listPhoneNumbers();
      
      // 2. Sync to our DB
      for (const vnum of vapiNumbers) {
        await upsertVapiPhoneNumber({
          userId: ctx.user.id,
          vapiId: vnum.id,
          number: vnum.number,
          provider: vnum.provider,
          assistantId: vnum.assistantId,
        });
      }
      
      return { success: true, count: vapiNumbers.length };
    }),
    updatePhoneNumber: protectedProcedure
      .input(
        z.object({
          id: z.string(), // Vapi phone number ID
          assistantId: z.string().optional(),
          name: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { VapiClient } = await import("./utils/vapi");
        const { id, ...data } = input;
        
        // 1. Update in Vapi
        const vapiPhone = await VapiClient.updatePhoneNumber(id, data);
        
        // 2. Update in our DB
        const dbUpdates: any = {};
        if (input.name) dbUpdates.name = input.name;
        // Find our internal assistant record if assistantId is provided
        // For simplicity we just store the Vapi ID in the DB for now
        
        return { success: true, phone: vapiPhone };
      }),
    listCalls: protectedProcedure.query(async ({ ctx }) => {
      const { VapiClient } = await import("./utils/vapi");
      try {
        const vapiCalls = await VapiClient.listCalls();
        for (const call of vapiCalls) {
          await db.upsertVapiCall({
            userId: ctx.user.id,
            vapiCallId: call.id,
            assistantId: call.assistantId,
            phoneNumberId: call.phoneNumberId,
            type: call.type,
            status: call.status,
            customerNumber: call.customer?.number,
            recordingUrl: call.recordingUrl,
            summary: call.analysis?.summary,
            transcript: call.transcript,
            duration: call.duration ? Math.round(call.duration) : undefined,
            startedAt: call.startedAt ? new Date(call.startedAt) : undefined,
            endedAt: call.endedAt ? new Date(call.endedAt) : undefined,
          });
        }
      } catch (err) {
        console.error("[Vapi Sync] Failed to auto-sync calls:", err);
      }
      return db.getVapiCallsByUserId(ctx.user.id);
    }),
    syncCalls: protectedProcedure.mutation(async ({ ctx }) => {
      const { VapiClient } = await import("./utils/vapi");
      
      // 1. Fetch from Vapi
      const vapiCalls = await VapiClient.listCalls();
      
      // 2. Sync to our DB
      for (const call of vapiCalls) {
        await db.upsertVapiCall({
          userId: ctx.user.id,
          vapiCallId: call.id,
          assistantId: call.assistantId,
          phoneNumberId: call.phoneNumberId,
          type: call.type,
          status: call.status,
          customerNumber: call.customer?.number,
          recordingUrl: call.recordingUrl,
          summary: call.analysis?.summary,
          transcript: call.transcript,
          duration: call.duration ? Math.round(call.duration) : undefined,
          startedAt: call.startedAt ? new Date(call.startedAt) : undefined,
          endedAt: call.endedAt ? new Date(call.endedAt) : undefined,
        });
      }
      
      return { success: true, count: vapiCalls.length };
    }),
    initiateAdhocCall: protectedProcedure
      .input(
        z.object({
          agentId: z.string(), // Vapi assistant ID
          phoneNumber: z.string(), // Number to call
          phoneNumberId: z.string().optional(), // Vapi phone number ID to call from
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { VapiClient } = await import("./utils/vapi");
        
        // 1. Initiate call in Vapi
        const call = await VapiClient.createCall({
          assistantId: input.agentId,
          phoneNumberId: input.phoneNumberId,
          customerNumber: input.phoneNumber,
        });
        
        return call;
      }),
    initiateCall: protectedProcedure
      .input(
        z.object({
          contactId: z.number(),
          agentId: z.string(), // Vapi assistant ID
          phoneNumberId: z.string().optional(), // Vapi phone number ID
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { VapiClient } = await import("./utils/vapi");
        
        const contact = await db.getContactById(input.contactId, ctx.user.id);
        if (!contact || !contact.phone) {
          throw new Error("Contact or phone number not found");
        }
        
        // 1. Initiate call in Vapi
        const call = await VapiClient.createCall({
          assistantId: input.agentId,
          phoneNumberId: input.phoneNumberId,
          customerNumber: contact.phone,
        });
        
        // 2. Log activity
        await db.createActivity({
          userId: ctx.user.id,
          contactId: contact.id,
          type: "call",
          title: `Outgoing call to ${contact.name}`,
          description: `Initiated Vapi call using agent. Call ID: ${call.id}`,
        });
        
        return call;
      }),
  }),
});

export type AppRouter = typeof appRouter;
