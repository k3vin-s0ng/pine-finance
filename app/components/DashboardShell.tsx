"use client";

import { ReactNode, useState } from "react";
import { Link, useLocation } from "@/app/lib/wouter";
import { useAuth } from "@/app/_core/hooks/useAuth";
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

type SidebarContentProps = {
  navItems: NavItem[];
  location: string;
  userName: string;
  roleLabel: string;
  onLogout: () => void;
};

function SidebarContent({ navItems, location, userName, roleLabel, onLogout }: SidebarContentProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-[#d9e7db]">
        <Link href="/" className="flex items-center">
          <span className="font-black text-slate-950 tracking-widest text-lg uppercase">Pine</span>
        </Link>
      </div>

      <div className="px-5 py-4 border-b border-[#d9e7db]">
        <div className="text-[#6f8274] text-[10px] font-bold tracking-widest uppercase mb-1">Signed in as</div>
        <div className="text-slate-950 text-sm font-semibold truncate">{userName}</div>
        <div className="text-[#168a4a] text-[10px] font-bold tracking-widest uppercase mt-0.5">{roleLabel}</div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/dashboard/recruiter" && item.href !== "/dashboard/candidate" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all cursor-pointer ${
                isActive
                  ? "bg-[#168a4a]/10 text-[#168a4a] border border-[#168a4a]/20"
                  : "text-[#52665a] hover:text-[#2e4637] hover:bg-[#eef7ef]"
              }`}>
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium text-xs tracking-wide uppercase">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-[#d9e7db] space-y-1">
        <Link href="/">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#6f8274] hover:text-[#2e4637] hover:bg-[#eef7ef] transition-all cursor-pointer">
            <ChevronLeft className="w-4 h-4" />
            <span className="font-medium text-xs tracking-wide uppercase">Back to Site</span>
          </div>
        </Link>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#6f8274] hover:text-red-400 hover:bg-red-400/5 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span className="font-medium text-xs tracking-wide uppercase">Sign Out</span>
        </button>
      </div>
    </div>
  );
}

export default function DashboardShell({ children, title, subtitle, actions }: { children: ReactNode; title?: string; subtitle?: string; actions?: ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navItems = getNavItems(user?.role);
  const sidebarProps: SidebarContentProps = {
    navItems,
    location,
    userName: user?.name ?? "User",
    roleLabel: getRoleLabel(user?.role),
    onLogout: logout,
  };

  return (
    <div className="min-h-screen bg-[#f8fbf8] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-56 flex-col bg-[#f8fbf8] border-r border-[#d9e7db] fixed top-0 left-0 bottom-0 z-40">
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-green-950/40" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-56 bg-[#f8fbf8] border-r border-[#d9e7db]">
            <SidebarContent {...sidebarProps} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 lg:ml-56 min-h-screen flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-[#f8fbf8]/90 backdrop-blur-sm border-b border-[#d9e7db] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-[#52665a] hover:text-slate-950"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              {title && <h1 className="text-slate-950 font-bold text-sm uppercase tracking-widest">{title}</h1>}
              {subtitle && <p className="text-[#6f8274] text-xs mt-0.5">{subtitle}</p>}
            </div>
            {actions && <div className="ml-4">{actions}</div>}
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <div className="text-slate-950 text-xs font-semibold">{user?.name}</div>
              <div className="text-[#168a4a] text-[10px] font-bold tracking-widest uppercase">{getRoleLabel(user?.role)}</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#168a4a]/20 border border-[#168a4a]/30 flex items-center justify-center">
              <span className="text-[#168a4a] text-xs font-bold">{user?.name?.[0] ?? "U"}</span>
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
