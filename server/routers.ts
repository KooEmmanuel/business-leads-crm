import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  contacts: router({
    list: protectedProcedure.query(({ ctx }) => db.getContactsByUserId(ctx.user.id)),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ ctx, input }) => db.getContactById(input.id, ctx.user.id)),
  }),

  deals: router({
    list: protectedProcedure.query(({ ctx }) => db.getDealsByUserId(ctx.user.id)),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ ctx, input }) => db.getDealById(input.id, ctx.user.id)),
  }),

  activities: router({
    getByContact: protectedProcedure
      .input(z.object({ contactId: z.number() }))
      .query(({ ctx, input }) => db.getActivitiesByContactId(input.contactId, ctx.user.id)),
  }),

  messages: router({
    getByContact: protectedProcedure
      .input(z.object({ contactId: z.number() }))
      .query(({ ctx, input }) => db.getMessagesByContactId(input.contactId, ctx.user.id)),
  }),

  tasks: router({
    list: protectedProcedure.query(({ ctx }) => db.getTasksByUserId(ctx.user.id)),
  }),
});

export type AppRouter = typeof appRouter;
