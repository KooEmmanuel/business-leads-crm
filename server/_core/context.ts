import { createClerkClient } from "@clerk/backend";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { ENV } from "./env";
import * as db from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // Debug: Log environment variables
    if (process.env.NODE_ENV === 'development') {
      console.log('[Auth Debug] Clerk Secret Key:', ENV.clerkSecretKey ? '✓ Set' : '✗ Missing');
      console.log('[Auth Debug] Clerk Publishable Key:', ENV.clerkPublishableKey ? '✓ Set' : '✗ Missing');
    }
    
    if (ENV.clerkSecretKey && ENV.clerkPublishableKey) {
      const clerk = createClerkClient({ 
        secretKey: ENV.clerkSecretKey,
        publishableKey: ENV.clerkPublishableKey,
      });
      
      // Convert Express request to Web API Request for Clerk
      const url = `${opts.req.protocol}://${opts.req.get('host')}${opts.req.url}`;
      const headers = new Headers();
      
      // Copy all headers from Express request
      Object.entries(opts.req.headers).forEach(([key, value]) => {
        if (value && key.toLowerCase() !== 'cookie') { // Skip cookie header, we'll handle it separately
          if (Array.isArray(value)) {
            value.forEach(v => headers.append(key, v));
          } else {
            headers.set(key, value);
          }
        }
      });
      
      // Add cookies to headers as Cookie header
      // Prefer the raw cookie header from the request, otherwise construct from parsed cookies
      const cookieHeader = opts.req.headers.cookie;
      if (cookieHeader) {
        headers.set('Cookie', cookieHeader);
      } else if (opts.req.cookies) {
        const cookieString = Object.entries(opts.req.cookies)
          .map(([key, value]) => `${key}=${value}`)
          .join('; ');
        if (cookieString) {
          headers.set('Cookie', cookieString);
        }
      }
      
      const request = new Request(url, {
        method: opts.req.method,
        headers,
      });
      
      // Use Clerk's authenticateRequest to handle session verification
      const authResult = await clerk.authenticateRequest(request);
      
      // Debug: Log authentication result
      if (process.env.NODE_ENV === 'development') {
        console.log('[Auth Debug] Is Signed In:', authResult.isSignedIn);
        console.log('[Auth Debug] Has __session cookie:', !!opts.req.cookies?.__session);
      }

      if (authResult.isSignedIn) {
        const auth = authResult.toAuth();
        // Get userId from auth object
        // For session tokens, it's userId; for other tokens it might be subject
        let userId: string | undefined;
        if ('userId' in auth && typeof auth.userId === 'string') {
          userId = auth.userId;
        } else if ('subject' in auth && typeof auth.subject === 'string') {
          userId = auth.subject;
        }
        
        if (userId) {
          // Get user from Clerk
          const clerkUser = await clerk.users.getUser(userId);
          
          // Sync user to our database
          await db.upsertUser({
            openId: clerkUser.id,
            name: clerkUser.fullName || clerkUser.firstName || clerkUser.emailAddresses[0]?.emailAddress || null,
            email: clerkUser.emailAddresses[0]?.emailAddress || null,
            loginMethod: "clerk",
            lastSignedIn: new Date(),
          });

          // Get user from our database
          const dbUser = await db.getUserByOpenId(clerkUser.id);
          user = dbUser ?? null;
        }
      }
    }
  } catch (error) {
    // Authentication errors are non-fatal for public routes
    // Only log in development to help debug
    if (process.env.NODE_ENV === 'development') {
      console.error("[Auth] Authentication error", error);
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
