import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "@/app/lib/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: Request;
  responseHeaders: Headers;
  user: User | null;
};

export async function createContext(
  opts: FetchCreateContextFnOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    responseHeaders: opts.resHeaders,
    user,
  };
}
