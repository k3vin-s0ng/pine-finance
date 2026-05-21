import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/onboarding") {
    return NextResponse.redirect(new URL("/Onboarding", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/onboarding"],
};
