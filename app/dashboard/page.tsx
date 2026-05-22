"use client";

import { useAuth } from "@/app/_core/hooks/useAuth";
import { Redirect } from "@/app/lib/wouter";

function dashboardPath(role?: string | null) {
  if (role === "recruiter" || role === "admin") return "/dashboard/recruiter";
  if (role === "candidate") return "/dashboard/candidate";
  return "/onboarding";
}

export default function Page() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return <Redirect to={dashboardPath(user?.role)} />;
}
