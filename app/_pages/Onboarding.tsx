"use client";

import { useState } from "react";
import { useLocation } from "@/app/lib/wouter";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { toast } from "sonner";
import { trpc } from "@/app/lib/trpc";
import { useAuth } from "@/app/_core/hooks/useAuth";
import { Users, Briefcase, ArrowRight } from "lucide-react";

const ROLES = [
  {
    id: "recruiter" as const,
    label: "Recruiter/HR",
    icon: Users,
    desc: "Create assessment campaigns, manage candidates, and view score reports.",
    color: "border-[#c9a84c]/50 bg-[#c9a84c]/5",
    iconColor: "text-[#c9a84c]",
    iconBg: "bg-[#c9a84c]/10",
  },
  {
    id: "candidate" as const,
    label: "Candidate",
    icon: Briefcase,
    desc: "Complete AI fluency assessments and view your performance reports.",
    color: "border-[#555]/50 bg-[#555]/5",
    iconColor: "text-[#aaa]",
    iconBg: "bg-[#333]/30",
  },
];

export default function Onboarding() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [selectedRole, setSelectedRole] = useState<"recruiter" | "candidate" | null>(null);
  const [organization, setOrganization] = useState("");

  const completeOnboarding = trpc.auth.completeOnboarding.useMutation({
    onSuccess: () => {
      toast.success("Welcome to Pine Finance!");
      if (selectedRole === "recruiter") navigate("/dashboard/recruiter");
      else navigate("/dashboard/candidate");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen bg-[#060606] flex items-center justify-center relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #c9a84c, transparent 70%)" }} />

      <div className="relative z-10 w-full max-w-2xl px-4">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-12 justify-center">
          <div className="w-8 h-8 rounded-sm bg-[#c9a84c] flex items-center justify-center">
            <span className="text-black font-black text-sm">P</span>
          </div>
          <span className="font-bold text-white tracking-widest text-sm uppercase">Pine Finance</span>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-black text-white uppercase tracking-tight mb-2">
            Welcome, {user?.name?.split(" ")[0] ?? "there"}
          </h1>
          <p className="text-[#666] text-sm">How will you be using Pine Finance?</p>
        </div>

        <div className="space-y-3 mb-8">
          {ROLES.map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role.id)}
              className={`w-full p-5 rounded-xl border text-left transition-all ${
                selectedRole === role.id ? role.color : "border-[#1a1a1a] bg-[#0a0a0a] hover:border-[#333]"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  selectedRole === role.id ? role.iconBg : "bg-[#111]"
                }`}>
                  <role.icon className={`w-5 h-5 ${selectedRole === role.id ? role.iconColor : "text-[#444]"}`} />
                </div>
                <div>
                  <div className={`font-bold text-sm uppercase tracking-wider ${selectedRole === role.id ? "text-white" : "text-[#666]"}`}>
                    {role.label}
                  </div>
                  <div className="text-[#555] text-xs mt-0.5">{role.desc}</div>
                </div>
                {selectedRole === role.id && (
                  <div className="ml-auto w-5 h-5 rounded-full bg-[#c9a84c] flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="mb-8">
          <Label className="text-[#888] text-xs mb-2 block tracking-wider uppercase">Organization (optional)</Label>
          <Input
            placeholder="Goldman Sachs, Citadel, etc."
            className="bg-[#0a0a0a] border-[#1a1a1a] text-white placeholder:text-[#444] focus:border-[#c9a84c]/50"
            value={organization}
            onChange={e => setOrganization(e.target.value)}
          />
        </div>

        <Button
          className="w-full bg-[#c9a84c] hover:bg-[#b8943e] text-black font-bold text-sm tracking-widest uppercase py-6 group disabled:opacity-40"
          disabled={!selectedRole || completeOnboarding.isPending}
          onClick={() => selectedRole && completeOnboarding.mutate({ role: selectedRole, organization })}
        >
          {completeOnboarding.isPending ? "Setting up..." : "Continue to Dashboard"}
          <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </div>
  );
}
