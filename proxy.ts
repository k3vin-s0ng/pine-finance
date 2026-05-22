import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const normalizedPathname = pathname.toLowerCase();

  if (
    pathname !== normalizedPathname &&
    (normalizedPathname === "/onboarding" ||
      normalizedPathname.startsWith("/dashboard"))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = normalizedPathname;
    console.info("[auth-debug] proxy-case-redirect", {
      from: pathname,
      to: `${url.pathname}${url.search}`,
      host: request.nextUrl.host,
    });
    return NextResponse.redirect(url);
  }

  if (normalizedPathname === "/onboarding" || normalizedPathname.startsWith("/dashboard")) {
    console.info("[auth-debug] proxy-pass-through", {
      pathname,
      host: request.nextUrl.host,
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
