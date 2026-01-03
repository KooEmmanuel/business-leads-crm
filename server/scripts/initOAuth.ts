import "dotenv/config";
import { nanoid } from "nanoid";
import * as db from "../db";
import { registerApplication } from "../_core/oauthServer";

async function initOAuth() {
  const appId = process.env.VITE_APP_ID || "business-leads-crm";
  const appSecret = process.env.OAUTH_APP_SECRET || nanoid(64);
  const appName = "Business Leads CRM";
  const baseUrl = process.env.VITE_OAUTH_PORTAL_URL || `http://localhost:${process.env.PORT || 3003}`;
  const redirectUris = [
    `${baseUrl}/api/oauth/callback`,
    `http://localhost:${process.env.PORT || 3003}/api/oauth/callback`,
  ];

  console.log("Initializing OAuth application...");
  console.log("App ID:", appId);
  console.log("App Secret:", appSecret);
  console.log("Redirect URIs:", redirectUris);

  try {
    await registerApplication(appId, appSecret, appName, redirectUris);
    console.log("✅ OAuth application registered successfully!");
    console.log("\nAdd these to your .env file:");
    console.log(`VITE_APP_ID=${appId}`);
    console.log(`OAUTH_APP_SECRET=${appSecret}`);
    console.log(`VITE_OAUTH_PORTAL_URL=${baseUrl}`);
    console.log(`OAUTH_SERVER_URL=${baseUrl}`);
  } catch (error) {
    if (String(error).includes("Duplicate entry")) {
      console.log("ℹ️  OAuth application already exists");
    } else {
      console.error("❌ Failed to register OAuth application:", error);
      process.exit(1);
    }
  }

  process.exit(0);
}

initOAuth();

