function cleanEnvValue(value: string | undefined) {
  return value?.trim() ?? "";
}

export const ENV = {
  cookieSecret: cleanEnvValue(process.env.JWT_SECRET),
  googleClientId: cleanEnvValue(process.env.GOOGLE_CLIENT_ID ?? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID),
  googleClientSecret: cleanEnvValue(process.env.GOOGLE_CLIENT_SECRET),
  mongoUri: cleanEnvValue(process.env.MONGODB_URI),
  ownerOpenId: cleanEnvValue(process.env.OWNER_OPEN_ID),
  isProduction: process.env.NODE_ENV === "production",
  openRouterApiUrl: cleanEnvValue(process.env.OPENAI_API_URL),
  openRouterApiKey: cleanEnvValue(process.env.OPENAI_API_KEY),
  openRouterModel: cleanEnvValue(process.env.OPENAI_MODEL) || "google/gemini-2.5-flash",
  forgeApiUrl: cleanEnvValue(process.env.BUILT_IN_FORGE_API_URL),
  forgeApiKey: cleanEnvValue(process.env.BUILT_IN_FORGE_API_KEY),
  siteUrl:
    cleanEnvValue(process.env.NEXT_PUBLIC_SITE_URL) ||
    "http://localhost:3000",
};
