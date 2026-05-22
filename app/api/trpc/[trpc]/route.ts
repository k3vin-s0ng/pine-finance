import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/app/server/routers";
import { createContext } from "@/app/server/_core/context";

const handler = async (req: Request) => {
  try {
    return await fetchRequestHandler({
      endpoint: "/api/trpc",
      req,
      router: appRouter,
      createContext,
      onError({ error, path, type }) {
        console.error("[tRPC] Request failed", {
          path,
          type,
          code: error.code,
          message: error.message,
          cause: error.cause instanceof Error ? error.cause.message : String(error.cause ?? ""),
          stack: error.stack,
        });
      },
    });
  } catch (error) {
    console.error("[tRPC] Handler crashed", error);

    return Response.json(
      {
        error: {
          message: error instanceof Error ? error.message : "tRPC handler crashed",
          code: "INTERNAL_SERVER_ERROR",
        },
      },
      { status: 500 },
    );
  }
};

export { handler as GET, handler as POST };
