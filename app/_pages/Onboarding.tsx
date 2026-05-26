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
    color: "border-[#168a4a]/50 bg-[#168a4a]/5",
    iconColor: "text-[#168a4a]",
    iconBg: "bg-[#168a4a]/10",
  },
  {
    id: "candidate" as const,
    label: "Candidate",
    icon: Briefcase,
    desc: "Complete AI fluency assessments and view your performance reports.",
    color: "border-[#6f8274]/50 bg-[#6f8274]/5",
    iconColor: "text-[#2e4637]",
    iconBg: "bg-[#9db8a4]/30",
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
    <div className="min-h-screen bg-[#f8fbf8] flex items-center justify-center relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #168a4a, transparent 70%)" }} />

      <div className="relative z-10 w-full max-w-2xl px-4">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-12 justify-center">
          <div className="w-8 h-8 rounded-sm bg-[#168a4a] flex items-center justify-center">
            <span className="text-white font-black text-sm">P</span>
          </div>
          <span className="font-bold text-slate-950 tracking-widest text-sm uppercase">Pine Finance</span>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-black text-slate-950 uppercase tracking-tight mb-2">
            Welcome, {user?.name?.split(" ")[0] ?? "there"}
          </h1>
          <p className="text-[#52665a] text-sm">How will you be using Pine Finance?</p>
        </div>

        <div className="space-y-3 mb-8">
          {ROLES.map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role.id)}
              className={`w-full p-5 rounded-xl border text-left transition-all ${
                selectedRole === role.id ? role.color : "border-[#d9e7db] bg-[#fff] hover:border-[#9db8a4]"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  selectedRole === role.id ? role.iconBg : "bg-[#eef7ef]"
                }`}>
                  <role.icon className={`w-5 h-5 ${selectedRole === role.id ? role.iconColor : "text-[#8fa095]"}`} />
                </div>
                <div>
                  <div className={`font-bold text-sm uppercase tracking-wider ${selectedRole === role.id ? "text-slate-950" : "text-[#52665a]"}`}>
                    {role.label}
                  </div>
                  <div className="text-[#6f8274] text-xs mt-0.5">{role.desc}</div>
                </div>
                {selectedRole === role.id && (
                  <div className="ml-auto w-5 h-5 rounded-full bg-[#168a4a] flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="mb-8">
          <Label className="text-[#3f5847] text-xs mb-2 block tracking-wider uppercase">Organization (optional)</Label>
          <Input
            placeholder="Goldman Sachs, Citadel, etc."
            className="bg-[#fff] border-[#d9e7db] text-slate-950 placeholder:text-[#8fa095] focus:border-[#168a4a]/50"
            value={organization}
            onChange={e => setOrganization(e.target.value)}
          />
        </div>

        <Button
          className="w-full bg-[#168a4a] hover:bg-[#11743d] text-white font-bold text-sm tracking-widest uppercase py-6 group disabled:opacity-40"
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
