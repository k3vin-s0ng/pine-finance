"use client";

import { useAuth } from "@/app/_core/hooks/useAuth";
import { Redirect } from "@/app/lib/wouter";

type Role = "recruiter" | "candidate" | "user" | "admin";

interface RoleGuardProps {
  /** Primary roles that are allowed to access this route. Admins always pass. */
  allowedRoles?: Role[];
  children: React.ReactNode;
}

/**
 * Returns the "home" dashboard path for a given role.
 * Used as the redirect target when access is denied.
 */
function getDashboardPath(role: Role | undefined): string {
  switch (role) {
    case "recruiter":
      return "/dashboard/recruiter";
    case "candidate":
      return "/dashboard/candidate";
    case "admin":
      return "/dashboard/recruiter";
    default:
      return "/onboarding";
  }
}

/**
 * RoleGuard wraps a route and redirects to the user's own dashboard
 * if they don't have the required role. Admins bypass all role checks.
 * While auth is loading it renders nothing to avoid a flash of redirect.
 */
export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user, loading } = useAuth();

  // Still fetching auth — render nothing to avoid a premature redirect
  if (loading) return null;

  // Not logged in at all — send to onboarding/login
  if (!user) return <Redirect to="/onboarding" />;

  // Admins bypass all role checks
  if (user.role === "admin") return <>{children}</>;

  // Check primary role
  if (allowedRoles && allowedRoles.length > 0) {
    const hasRole = allowedRoles.includes(user.role as Role);
    if (!hasRole) {
      return <Redirect to={getDashboardPath(user.role as Role)} />;
    }
  }

  return <>{children}</>;
}
