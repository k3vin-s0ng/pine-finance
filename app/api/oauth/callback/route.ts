import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, ONE_YEAR_MS } from "@/app/shared/const";
import * as db from "@/app/lib/db";
import { sdk } from "@/app/server/_core/sdk";
import { ENV } from "@/app/server/_core/env";

type GoogleTokenResponse = {
  access_token?: string;
  id_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserInfo = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

function maskEmail(email?: string | null) {
  if (!email) return null;
  const [local, domain] = email.split("@");
  if (!domain) return "invalid-email";
  return `${local.slice(0, 2)}***@${domain}`;
}

function decodeState(state: string | null) {
  if (!state) return "/";
  try {
    const parsed = JSON.parse(Buffer.from(state, "base64").toString("utf8")) as {
      redirectTo?: string;
    };
    const redirectTo = parsed.redirectTo || "/";
    return redirectTo.startsWith("/") ? redirectTo : "/";
  } catch {
    return "/";
  }
}

function dashboardPath(role?: string | null) {
  if (role === "recruiter" || role === "admin") return "/dashboard/recruiter";
  if (role === "candidate") return "/dashboard/candidate";
  return "/onboarding";
}

function canonicalRedirectPath(redirectTo: string) {
  const url = new URL(redirectTo, "http://pine.local");
  const normalizedPath = url.pathname.toLowerCase();

  if (normalizedPath === "/onboarding") {
    url.pathname = "/onboarding";
  } else if (normalizedPath === "/dashboard") {
    url.pathname = "/dashboard";
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

function resolveRedirectPath(redirectTo: string, role?: string | null) {
  const canonicalPath = canonicalRedirectPath(redirectTo);

  if (canonicalPath === "/" || canonicalPath === "/dashboard") {
    return dashboardPath(role);
  }
  return canonicalPath;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");
  const decodedState = decodeState(state);
  const redirectUri = new URL("/api/oauth/callback", req.url).toString();

  console.info("[auth-debug] callback-start", {
    host: req.nextUrl.host,
    protocol: req.nextUrl.protocol,
    pathname: req.nextUrl.pathname,
    redirectUri,
    hasCode: Boolean(code),
    hasState: Boolean(state),
    decodedState,
    error,
    googleClientConfigured: Boolean(ENV.googleClientId),
    googleSecretConfigured: Boolean(ENV.googleClientSecret),
  });

  if (error) {
    console.warn("[auth-debug] callback-provider-error", { error });
    return NextResponse.json({ error }, { status: 400 });
  }

  if (!code) {
    console.warn("[auth-debug] callback-missing-code");
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }

  if (!ENV.googleClientId || !ENV.googleClientSecret) {
    console.error("[auth-debug] callback-missing-google-config", {
      googleClientConfigured: Boolean(ENV.googleClientId),
      googleSecretConfigured: Boolean(ENV.googleClientSecret),
    });
    return NextResponse.json(
      { error: "Google OAuth is not configured" },
      { status: 500 },
    );
  }

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: ENV.googleClientId,
        client_secret: ENV.googleClientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    const tokenJson = (await tokenResponse.json()) as GoogleTokenResponse;
    console.info("[auth-debug] token-response", {
      ok: tokenResponse.ok,
      status: tokenResponse.status,
      hasAccessToken: Boolean(tokenJson.access_token),
      hasIdToken: Boolean(tokenJson.id_token),
      error: tokenJson.error,
      errorDescription: tokenJson.error_description,
    });

    if (!tokenResponse.ok || !tokenJson.access_token) {
      console.error("[Google OAuth] Token exchange failed", tokenJson);
      return NextResponse.json(
        { error: tokenJson.error_description ?? tokenJson.error ?? "Token exchange failed" },
        { status: 502 },
      );
    }

    const userInfoResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    const userInfo = (await userInfoResponse.json()) as GoogleUserInfo;

    console.info("[auth-debug] userinfo-response", {
      ok: userInfoResponse.ok,
      status: userInfoResponse.status,
      hasSub: Boolean(userInfo.sub),
      email: maskEmail(userInfo.email),
      emailVerified: userInfo.email_verified,
    });

    if (!userInfoResponse.ok || !userInfo.sub) {
      console.error("[Google OAuth] Userinfo failed", userInfo);
      return NextResponse.json({ error: "Unable to fetch Google user info" }, { status: 502 });
    }

    const openId = `google:${userInfo.sub}`;
    const name = userInfo.name || userInfo.email || "Google User";

    await db.upsertUser({
      openId,
      name,
      email: userInfo.email ?? null,
      loginMethod: "google",
      lastSignedIn: new Date(),
    });
    const user = await db.getUserByOpenId(openId);

    console.info("[auth-debug] user-upserted", {
      userId: user?.id ?? null,
      role: user?.role ?? null,
      onboardingCompleted: user?.onboardingCompleted ?? null,
      email: maskEmail(user?.email),
    });

    const sessionToken = await sdk.createSessionToken(openId, {
      name,
      email: userInfo.email ?? null,
      expiresInMs: ONE_YEAR_MS,
    });

    const resolvedRedirectPath = resolveRedirectPath(decodedState, user?.role);
    const resolvedRedirectUrl = new URL(resolvedRedirectPath, req.url);

    console.info("[auth-debug] callback-redirect", {
      decodedState,
      role: user?.role ?? null,
      resolvedRedirectPath,
      resolvedRedirectUrl: resolvedRedirectUrl.toString(),
      secureCookie: req.nextUrl.protocol === "https:",
      cookiePath: "/",
      sameSite: "lax",
    });

    const response = NextResponse.redirect(resolvedRedirectUrl);
    response.cookies.set(COOKIE_NAME, sessionToken, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: req.nextUrl.protocol === "https:",
      maxAge: Math.floor(ONE_YEAR_MS / 1000),
    });

    return response;
  } catch (error) {
    console.error("[Google OAuth] Callback failed", error);
    return NextResponse.json({ error: "Google OAuth callback failed" }, { status: 500 });
  }
}
