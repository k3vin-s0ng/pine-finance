import { COOKIE_NAME, ONE_YEAR_MS } from "@/app/shared/const";
import { ForbiddenError } from "@/app/shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "@/app/lib/schema";
import * as db from "@/app/lib/db";
import { ENV } from "./env";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export type SessionPayload = {
  openId: string;
  name: string;
  email?: string | null;
};

class SDKServer {
  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) return new Map<string, string>();
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  private getCookieHeader(req: Request): string | undefined {
    return req.headers.get("cookie") ?? undefined;
  }

  private getSessionSecret() {
    const secret = ENV.cookieSecret;
    if (!secret) {
      throw new Error("JWT_SECRET is not configured");
    }
    return new TextEncoder().encode(secret);
  }

  async createSessionToken(
    openId: string,
    options: { expiresInMs?: number; name?: string; email?: string | null } = {},
  ): Promise<string> {
    return this.signSession(
      {
        openId,
        name: options.name || "",
        email: options.email ?? null,
      },
      options,
    );
  }

  async signSession(
    payload: SessionPayload,
    options: { expiresInMs?: number } = {},
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
    const secretKey = this.getSessionSecret();

    return new SignJWT({
      openId: payload.openId,
      name: payload.name,
      email: payload.email ?? null,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  async verifySession(
    cookieValue: string | undefined | null,
  ): Promise<{ openId: string; name: string; email?: string | null } | null> {
    if (!cookieValue) return null;

    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"],
      });
      const { openId, name, email } = payload as Record<string, unknown>;

      if (!isNonEmptyString(openId)) return null;

      return {
        openId,
        name: typeof name === "string" ? name : "",
        email: typeof email === "string" ? email : null,
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }

  async authenticateRequest(req: Request): Promise<User> {
    const cookies = this.parseCookies(this.getCookieHeader(req));
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);

    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }

    const signedInAt = new Date();
    let user = await db.getUserByOpenId(session.openId);

    if (!user) {
      await db.upsertUser({
        openId: session.openId,
        name: session.name || null,
        email: session.email ?? null,
        loginMethod: "google",
        lastSignedIn: signedInAt,
      });
      user = await db.getUserByOpenId(session.openId);
    } else {
      await db.upsertUser({
        openId: user.openId,
        lastSignedIn: signedInAt,
      });
    }

    if (!user) {
      throw ForbiddenError("User not found");
    }

    return user;
  }
}

export const sdk = new SDKServer();
