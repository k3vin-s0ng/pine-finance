function cleanEnvValue(value: string | undefined) {
  return value?.trim() ?? "";
}

function cleanApiKey(value: string | undefined) {
  const cleaned = cleanEnvValue(value);
  const assignmentMatch = cleaned.match(/^(?:OPENAI_API_KEY|OPENROUTER_API_KEY)\s*=\s*(.+)$/);
  return assignmentMatch?.[1]?.trim() ?? cleaned;
}

export const ENV = {
  cookieSecret: cleanEnvValue(process.env.JWT_SECRET),
  googleClientId: cleanEnvValue(process.env.GOOGLE_CLIENT_ID ?? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID),
  googleClientSecret: cleanEnvValue(process.env.GOOGLE_CLIENT_SECRET),
  mongoUri: cleanEnvValue(process.env.MONGODB_URI),
  ownerOpenId: cleanEnvValue(process.env.OWNER_OPEN_ID),
  isProduction: process.env.NODE_ENV === "production",
  openRouterApiUrl: cleanEnvValue(process.env.OPENAI_API_URL),
  openRouterApiKey: cleanApiKey(process.env.OPENAI_API_KEY),
  openRouterModel: cleanEnvValue(process.env.OPENAI_MODEL) || "google/gemini-2.5-flash",
  forgeApiUrl: cleanEnvValue(process.env.BUILT_IN_FORGE_API_URL),
  forgeApiKey: cleanEnvValue(process.env.BUILT_IN_FORGE_API_KEY),
  siteUrl:
    cleanEnvValue(process.env.NEXT_PUBLIC_SITE_URL) ||
    "http://localhost:3000",
};
