"use client";

import NextLink, { type LinkProps as NextLinkProps } from "next/link";
import { useParams as useNextParams, usePathname, useRouter } from "next/navigation";
import { useEffect, type AnchorHTMLAttributes, type ReactNode } from "react";

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> &
  NextLinkProps & {
    children: ReactNode;
  };

export function Link({ href, children, ...props }: LinkProps) {
  return (
    <NextLink href={href} {...props}>
      {children}
    </NextLink>
  );
}

export function useLocation(): [string, (to: string) => void] {
  const pathname = usePathname();
  const router = useRouter();
  return [pathname, (to: string) => router.push(to)];
}

export function useParams<T extends Record<string, string> = Record<string, string>>(): T {
  const params = useNextParams();
  return params as T;
}

export function Redirect({ to }: { to: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(to);
  }, [router, to]);

  return null;
}
