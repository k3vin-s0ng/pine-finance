export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  mongoUri: process.env.MONGODB_URI ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  openRouterApiUrl: process.env.OPENAI_API_URL ?? "",
  openRouterApiKey: process.env.OPENAI_API_KEY ?? "",
  openRouterModel: process.env.OPENROUTER_MODEL ?? "google/gemini-2.5-flash",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000",
};
