export { COOKIE_NAME, ONE_YEAR_MS } from "@/app/shared/const";

function clientIdHint(clientId: string) {
  return clientId.slice(-12);
}

export const getLoginUrl = () => {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (!clientId || typeof window === "undefined") return "/";

  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const currentPath = `${window.location.pathname}${window.location.search}`;
  const redirectTo =
    currentPath === "/" || currentPath === ""
      ? "/dashboard"
      : currentPath;
  const state = btoa(JSON.stringify({ redirectTo }));
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");

  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  url.searchParams.set("access_type", "offline");

  console.info("[auth-debug] login-url-created", {
    origin: window.location.origin,
    currentPath,
    redirectUri,
    redirectTo,
    clientIdHint: clientIdHint(clientId),
  });

  return url.toString();
};
