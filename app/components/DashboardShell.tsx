"use client";

import { ReactNode, useState } from "react";
import { Link, useLocation } from "@/app/lib/wouter";
import { useAuth } from "@/app/_core/hooks/useAuth";
import { Button } from "@/app/components/ui/button";
import {
  LayoutDashboard, Users, FileText, LogOut,
  ChevronLeft, Menu, Target
} from "lucide-react";

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
}

const RECRUITER_NAV: NavItem[] = [
  { icon: LayoutDashboard, label: "Overview", href: "/dashboard/recruiter" },
  { icon: Target, label: "Campaigns", href: "/dashboard/recruiter/campaigns" },
  { icon: Users, label: "Candidates", href: "/dashboard/recruiter/candidates" },
  { icon: FileText, label: "Reports", href: "/dashboard/recruiter/reports" },
];

const CANDIDATE_NAV: NavItem[] = [
  { icon: LayoutDashboard, label: "My Assessments", href: "/dashboard/candidate" },
  { icon: FileText, label: "My Reports", href: "/dashboard/candidate/reports" },
];

function getNavItems(role: string | undefined): NavItem[] {
  if (role === "recruiter" || role === "admin") return RECRUITER_NAV;
  if (role === "candidate") return CANDIDATE_NAV;
  return RECRUITER_NAV;
}

function getRoleLabel(role: string | undefined): string {
  if (role === "recruiter" || role === "admin") return "Recruiter/HR";
  if (role === "candidate") return "Candidate";
  return "User";
}

export default function DashboardShell({ children, title, subtitle, actions }: { children: ReactNode; title?: string; subtitle?: string; actions?: ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navItems = getNavItems(user?.role);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#1a1a1a]">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-sm bg-[#c9a84c] flex items-center justify-center">
            <span className="text-black font-black text-xs">P</span>
          </div>
          <span className="font-bold text-white tracking-widest text-xs uppercase">Pine Finance</span>
        </Link>
      </div>

      {/* Role badge */}
      <div className="px-5 py-4 border-b border-[#1a1a1a]">
        <div className="text-[#555] text-[10px] font-bold tracking-widest uppercase mb-1">Signed in as</div>
        <div className="text-white text-sm font-semibold truncate">{user?.name ?? "User"}</div>
        <div className="text-[#c9a84c] text-[10px] font-bold tracking-widest uppercase mt-0.5">{getRoleLabel(user?.role)}</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/dashboard/recruiter" && item.href !== "/dashboard/candidate" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all cursor-pointer ${
                isActive
                  ? "bg-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/20"
                  : "text-[#666] hover:text-[#aaa] hover:bg-[#111]"
              }`}>
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium text-xs tracking-wide uppercase">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-[#1a1a1a] space-y-1">
        <Link href="/">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#555] hover:text-[#aaa] hover:bg-[#111] transition-all cursor-pointer">
            <ChevronLeft className="w-4 h-4" />
            <span className="font-medium text-xs tracking-wide uppercase">Back to Site</span>
          </div>
        </Link>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#555] hover:text-red-400 hover:bg-red-400/5 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span className="font-medium text-xs tracking-wide uppercase">Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#060606] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-56 flex-col bg-[#080808] border-r border-[#1a1a1a] fixed top-0 left-0 bottom-0 z-40">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/80" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-56 bg-[#080808] border-r border-[#1a1a1a]">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 lg:ml-56 min-h-screen flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-[#060606]/90 backdrop-blur-sm border-b border-[#1a1a1a] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-[#666] hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              {title && <h1 className="text-white font-bold text-sm uppercase tracking-widest">{title}</h1>}
              {subtitle && <p className="text-[#555] text-xs mt-0.5">{subtitle}</p>}
            </div>
            {actions && <div className="ml-4">{actions}</div>}
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <div className="text-white text-xs font-semibold">{user?.name}</div>
              <div className="text-[#c9a84c] text-[10px] font-bold tracking-widest uppercase">{getRoleLabel(user?.role)}</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#c9a84c]/20 border border-[#c9a84c]/30 flex items-center justify-center">
              <span className="text-[#c9a84c] text-xs font-bold">{user?.name?.[0] ?? "U"}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
