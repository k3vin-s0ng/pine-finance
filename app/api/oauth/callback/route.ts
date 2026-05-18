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

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }

  if (!ENV.googleClientId || !ENV.googleClientSecret) {
    return NextResponse.json(
      { error: "Google OAuth is not configured" },
      { status: 500 },
    );
  }

  const redirectUri = new URL("/api/oauth/callback", req.url).toString();

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

    const sessionToken = await sdk.createSessionToken(openId, {
      name,
      email: userInfo.email ?? null,
      expiresInMs: ONE_YEAR_MS,
    });

    const response = NextResponse.redirect(new URL(decodeState(state), req.url));
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
