export const ENV = {
  clerkSecretKey: process.env.CLERK_SECRET_KEY ?? "",
  clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY ?? "",
  clerkJwtIssuerDomain: process.env.CLERK_JWT_ISSUER_DOMAIN ?? "",
  // Legacy OAuth fields (kept for backward compatibility)
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  adminApiKey: process.env.ADMIN_API_KEY ?? "kf--dev-UFpNEYjIqLdplppa7mZNNSz5lenaENdYCvg",
  adminApiUrl: process.env.ADMIN_API_URL ?? "http://localhost:3000",
  email: {
    host: process.env.EMAIL_SERVER_HOST ?? "smtp.mymangomail.com",
    port: parseInt(process.env.EMAIL_SERVER_PORT ?? "587", 10),
    user: process.env.EMAIL_SERVER_USER ?? "noreply@kwickflow.com",
    pass: process.env.EMAIL_SERVER_PASSWORD ?? "KWca5!Arizona",
    from: process.env.EMAIL_FROM ?? "noreply@kwickflow.com",
  },
};
