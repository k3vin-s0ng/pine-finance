import { useAuth } from "@/_core/hooks/useAuth";
import { Redirect } from "wouter";

type Role = "recruiter" | "candidate" | "manager" | "user" | "admin";
type FinanceRole = "executive" | "manager" | "analyst" | "compliance_lead" | null | undefined;

interface RoleGuardProps {
  /** Primary roles that are allowed to access this route. Admins always pass. */
  allowedRoles?: Role[];
  /**
   * Finance roles that are allowed (used for intelligence routes).
   * Admins always pass regardless of their financeRole.
   */
  allowedFinanceRoles?: FinanceRole[];
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
    case "manager":
      return "/dashboard/manager";
    case "admin":
      return "/dashboard/manager";
    default:
      return "/onboarding";
  }
}

/**
 * RoleGuard wraps a route and redirects to the user's own dashboard
 * if they don't have the required role. Admins bypass all role checks.
 * While auth is loading it renders nothing to avoid a flash of redirect.
 */
export function RoleGuard({ allowedRoles, allowedFinanceRoles, children }: RoleGuardProps) {
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

  // Check finance role (for intelligence platform routes)
  if (allowedFinanceRoles && allowedFinanceRoles.length > 0) {
    const hasFinanceRole = allowedFinanceRoles.includes(user.financeRole as FinanceRole);
    if (!hasFinanceRole) {
      return <Redirect to={getDashboardPath(user.role as Role)} />;
    }
  }

  return <>{children}</>;
}