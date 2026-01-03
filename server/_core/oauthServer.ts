import { eq, and } from "drizzle-orm";
import type { Express, Request, Response } from "express";
import { nanoid } from "nanoid";
import * as db from "../db";
import {
  oauthApplications,
  oauthAuthorizationCodes,
  oauthAccessTokens,
  users,
  type InsertOAuthApplication,
  type InsertOAuthAuthorizationCode,
  type InsertOAuthAccessToken,
} from "../../drizzle/schema";

const CODE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function getBodyParam(req: Request, key: string): string | undefined {
  const value = req.body[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * Register a new OAuth application
 */
export async function registerApplication(
  appId: string,
  appSecret: string,
  name: string,
  redirectUris: string[]
): Promise<void> {
  const dbInstance = await db.getDb();
  if (!dbInstance) {
    throw new Error("Database not available");
  }

  await dbInstance.insert(oauthApplications).values({
    appId,
    appSecret,
    name,
    redirectUris: JSON.stringify(redirectUris),
  });
}

/**
 * Get OAuth application by appId
 */
export async function getApplication(appId: string) {
  const dbInstance = await db.getDb();
  if (!dbInstance) {
    return null;
  }

  const result = await dbInstance
    .select()
    .from(oauthApplications)
    .where(eq(oauthApplications.appId, appId))
    .limit(1);

  if (result.length === 0) return null;

  const app = result[0];
  return {
    ...app,
    redirectUris: JSON.parse(app.redirectUris) as string[],
  };
}

/**
 * Verify application credentials
 */
export async function verifyApplication(
  appId: string,
  appSecret?: string
): Promise<boolean> {
  const app = await getApplication(appId);
  if (!app) return false;
  if (appSecret && app.appSecret !== appSecret) return false;
  return true;
}

/**
 * Create authorization code
 */
export async function createAuthorizationCode(
  appId: string,
  userId: number,
  redirectUri: string,
  state?: string
): Promise<string> {
  const dbInstance = await db.getDb();
  if (!dbInstance) {
    throw new Error("Database not available");
  }

  const code = nanoid(64);
  const expiresAt = new Date(Date.now() + CODE_EXPIRY_MS);

  await dbInstance.insert(oauthAuthorizationCodes).values({
    code,
    appId,
    userId,
    redirectUri,
    state: state || null,
    expiresAt,
    used: false,
  });

  return code;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  code: string,
  appId: string,
  redirectUri: string
): Promise<{ accessToken: string; tokenType: string; expiresIn: number }> {
  const dbInstance = await db.getDb();
  if (!dbInstance) {
    throw new Error("Database not available");
  }

  // Find and validate code
  const codes = await dbInstance
    .select()
    .from(oauthAuthorizationCodes)
    .where(
      and(
        eq(oauthAuthorizationCodes.code, code),
        eq(oauthAuthorizationCodes.appId, appId),
        eq(oauthAuthorizationCodes.used, false)
      )
    )
    .limit(1);

  if (codes.length === 0) {
    throw new Error("Invalid authorization code");
  }

  const authCode = codes[0];

  // Check expiry
  if (new Date() > authCode.expiresAt) {
    throw new Error("Authorization code expired");
  }

  // Check redirect URI matches
  if (authCode.redirectUri !== redirectUri) {
    throw new Error("Redirect URI mismatch");
  }

  // Mark code as used
  await dbInstance
    .update(oauthAuthorizationCodes)
    .set({ used: true })
    .where(eq(oauthAuthorizationCodes.id, authCode.id));

  // Create access token
  const accessToken = nanoid(128);
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);

  await dbInstance.insert(oauthAccessTokens).values({
    token: accessToken,
    appId,
    userId: authCode.userId,
    expiresAt,
  });

  return {
    accessToken,
    tokenType: "Bearer",
    expiresIn: Math.floor(TOKEN_EXPIRY_MS / 1000),
  };
}

/**
 * Get user info from access token
 */
export async function getUserInfoFromToken(
  accessToken: string
): Promise<{ openId: string; projectId: string; name: string; email?: string | null } | null> {
  const dbInstance = await db.getDb();
  if (!dbInstance) {
    return null;
  }

  // Find token
  const tokens = await dbInstance
    .select()
    .from(oauthAccessTokens)
    .where(eq(oauthAccessTokens.token, accessToken))
    .limit(1);

  if (tokens.length === 0) {
    return null;
  }

  const token = tokens[0];

  // Check expiry
  if (new Date() > token.expiresAt) {
    return null;
  }

  // Get user
  const userResult = await dbInstance
    .select()
    .from(users)
    .where(eq(users.id, token.userId))
    .limit(1);

  if (userResult.length === 0) {
    return null;
  }

  const user = userResult[0];

  return {
    openId: user.openId,
    projectId: token.appId,
    name: user.name || "",
    email: user.email,
  };
}

/**
 * Register OAuth server routes
 */
export function registerOAuthServerRoutes(app: Express) {
  // Authorization endpoint - redirects user to login/consent
  app.get("/oauth/authorize", async (req: Request, res: Response) => {
    const appId = getQueryParam(req, "appId");
    const redirectUri = getQueryParam(req, "redirectUri");
    const state = getQueryParam(req, "state");
    const responseType = getQueryParam(req, "responseType") || "code";

    if (!appId || !redirectUri) {
      res.status(400).json({ error: "appId and redirectUri are required" });
      return;
    }

    if (responseType !== "code") {
      res.status(400).json({ error: "Only 'code' response type is supported" });
      return;
    }

    // Verify application exists
    const application = await getApplication(appId);
    if (!application) {
      res.status(400).json({ error: "Invalid application" });
      return;
    }

    // Check redirect URI is allowed
    if (!application.redirectUris.includes(redirectUri)) {
      res.status(400).json({ error: "Invalid redirect URI" });
      return;
    }

    // For now, we'll use a simple session-based auth
    // In production, you'd check for an authenticated session
    // For development, we'll create a default user or use the first user
    const dbInstance = await db.getDb();
    if (!dbInstance) {
      res.status(500).json({ error: "Database not available" });
      return;
    }

    // Get or create a default user for development
    // In production, you'd get this from the authenticated session
    let user = await db.getUserByOpenId("default-user");
    if (!user) {
      // Create a default user for development
      await db.upsertUser({
        openId: "default-user",
        name: "Default User",
        email: "user@example.com",
        loginMethod: "oauth",
      });
      user = await db.getUserByOpenId("default-user");
    }

    if (!user) {
      res.status(500).json({ error: "Failed to get user" });
      return;
    }

    // Create authorization code
    try {
      const code = await createAuthorizationCode(
        appId,
        user.id,
        redirectUri,
        state || undefined
      );

      // Redirect back to client with code
      const redirectUrl = new URL(redirectUri);
      redirectUrl.searchParams.set("code", code);
      if (state) {
        redirectUrl.searchParams.set("state", state);
      }

      res.redirect(302, redirectUrl.toString());
    } catch (error) {
      console.error("[OAuth] Authorization failed", error);
      res.status(500).json({ error: "Authorization failed" });
    }
  });

  // Token exchange endpoint
  app.post("/oauth/token", async (req: Request, res: Response) => {
    const grantType = getBodyParam(req, "grantType");
    const code = getBodyParam(req, "code");
    const redirectUri = getBodyParam(req, "redirectUri");
    const clientId = getBodyParam(req, "clientId");
    const clientSecret = getBodyParam(req, "clientSecret");

    if (grantType !== "authorization_code") {
      res.status(400).json({ error: "Only authorization_code grant type is supported" });
      return;
    }

    if (!code || !redirectUri || !clientId) {
      res.status(400).json({ error: "code, redirectUri, and clientId are required" });
      return;
    }

    // Verify application
    const appSecret = clientSecret || undefined;
    const isValid = await verifyApplication(clientId, appSecret);
    if (!isValid) {
      res.status(401).json({ error: "Invalid client credentials" });
      return;
    }

    try {
      const tokenResponse = await exchangeCodeForToken(code, clientId, redirectUri);
      res.json({
        accessToken: tokenResponse.accessToken,
        tokenType: tokenResponse.tokenType,
        expiresIn: tokenResponse.expiresIn,
        scope: "read",
      });
    } catch (error) {
      console.error("[OAuth] Token exchange failed", error);
      res.status(400).json({ error: String(error) });
    }
  });

  // User info endpoint
  app.post("/oauth/userinfo", async (req: Request, res: Response) => {
    const accessToken = getBodyParam(req, "accessToken");

    if (!accessToken) {
      res.status(400).json({ error: "accessToken is required" });
      return;
    }

    const userInfo = await getUserInfoFromToken(accessToken);
    if (!userInfo) {
      res.status(401).json({ error: "Invalid or expired access token" });
      return;
    }

    res.json(userInfo);
  });

  // Get user info with JWT (for session verification)
  app.post("/oauth/userinfo/jwt", async (req: Request, res: Response) => {
    const jwtToken = getBodyParam(req, "jwtToken");
    const projectId = getBodyParam(req, "projectId");

    if (!jwtToken || !projectId) {
      res.status(400).json({ error: "jwtToken and projectId are required" });
      return;
    }

    // For now, we'll extract user info from the JWT
    // In a full implementation, you'd verify the JWT signature
    // For development, we'll use the access token approach
    try {
      // Try to decode the JWT (simplified - in production use proper JWT verification)
      const userInfo = await getUserInfoFromToken(jwtToken);
      if (!userInfo || userInfo.projectId !== projectId) {
        res.status(401).json({ error: "Invalid token" });
        return;
      }

      res.json({
        ...userInfo,
        platform: "oauth",
        loginMethod: "oauth",
      });
    } catch (error) {
      console.error("[OAuth] JWT userinfo failed", error);
      res.status(401).json({ error: "Invalid token" });
    }
  });
}

