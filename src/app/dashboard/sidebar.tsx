"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  FolderGit2,
  Settings,
  LogOut,
  Zap,
  Plus,
  User,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

function GithubIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface GitConnection {
  id: string;
  provider: "github" | "gitlab";
  username: string | null;
  avatar_url: string | null;
}

interface SidebarProps {
  user: SupabaseUser;
  connections: GitConnection[];
}

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/projects", label: "My Projects", icon: FolderGit2, exact: false },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, exact: false },
];

export function DashboardSidebar({ user, connections }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Signed out successfully.");
    router.push("/");
    router.refresh();
  }

  const githubConnection = connections.find((c) => c.provider === "github");
  const gitlabConnection = connections.find((c) => c.provider === "gitlab");

  return (
    <aside
      className={`sticky top-0 flex h-screen shrink-0 flex-col border-r border-slate-200 bg-white/95 backdrop-blur-xl transition-all duration-300 ${
        collapsed ? "w-17" : "w-64"
      }`}
    >
      {/* Logo */}
      <div className="border-b border-slate-100 px-4 py-4">
        <Link href="/dashboard" className={`flex min-w-0 items-center gap-2.5 ${collapsed ? "justify-center" : ""}`}>
          <div className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-linear-to-br from-rose-500 to-amber-400 shadow-sm shadow-rose-200 transition-all duration-200 hover:scale-105 hover:shadow-rose-300">
            <Zap className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <span className="truncate text-base font-bold tracking-tight text-slate-900">VibeCode</span>
          )}
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {NAV_LINKS.map((link) => {
          const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "relative flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                collapsed ? "justify-center" : "gap-3",
                active
                  ? "bg-rose-50 text-rose-600"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
              title={collapsed ? link.label : undefined}
            >
              {active && !collapsed && (
                <span className="absolute left-0 top-1/2 h-5 w-0.75 -translate-y-1/2 rounded-r-full bg-rose-500" />
              )}
              <link.icon className="h-4 w-4 shrink-0" />
              {!collapsed && link.label}
            </Link>
          );
        })}

        <Separator className="my-3" />

        <div className="px-1 py-1">
          {!collapsed && (
            <p className="mb-2.5 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Git Accounts
            </p>
          )}

          {githubConnection ? (
            <div className={`mb-2 flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 ${collapsed ? "justify-center" : "gap-2.5"}`}>
              <GithubIcon className="h-4 w-4 shrink-0 text-slate-700" />
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-slate-700">
                    {githubConnection.username ?? "GitHub"}
                  </p>
                  <Badge className="mt-0.5 h-4 border-0 bg-emerald-100 px-1.5 py-0 text-[10px] text-emerald-700">
                    Connected
                  </Badge>
                </div>
              )}
            </div>
          ) : (
            <a href="/api/auth/github" className="mb-2 block">
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "w-full cursor-pointer border-dashed text-slate-500 transition-colors hover:border-rose-300 hover:text-rose-600",
                  collapsed ? "justify-center px-0" : "justify-start gap-2"
                )}
                title={collapsed ? "Connect GitHub" : undefined}
              >
                <Plus className="h-3.5 w-3.5" />
                {!collapsed && "Connect GitHub"}
              </Button>
            </a>
          )}

          {gitlabConnection ? (
            <div className={`flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 ${collapsed ? "justify-center" : "gap-2.5"}`}>
              <svg className="h-4 w-4 shrink-0 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 01-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 014.82 2a.43.43 0 01.58 0 .42.42 0 01.11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0118.6 2a.43.43 0 01.58 0 .42.42 0 01.11.18l2.44 7.51L23 13.45a.84.84 0 01-.35.94z" />
              </svg>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-slate-700">
                    {gitlabConnection.username ?? "GitLab"}
                  </p>
                  <Badge className="mt-0.5 h-4 border-0 bg-emerald-100 px-1.5 py-0 text-[10px] text-emerald-700">
                    Connected
                  </Badge>
                </div>
              )}
            </div>
          ) : (
            <a href="/api/auth/gitlab">
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "w-full cursor-pointer border-dashed text-slate-500 transition-colors hover:border-orange-300 hover:text-orange-600",
                  collapsed ? "justify-center px-0" : "justify-start gap-2"
                )}
                title={collapsed ? "Connect GitLab" : undefined}
              >
                <Plus className="h-3.5 w-3.5" />
                {!collapsed && "Connect GitLab"}
              </Button>
            </a>
          )}
        </div>
      </nav>

      {/* User */}
      <div className="space-y-1.5 border-t border-slate-100 px-3 py-3">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className={cn(
            "flex h-8 w-full cursor-pointer items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700",
            collapsed ? "justify-center" : "justify-start gap-2 px-2.5"
          )}
          title={collapsed ? "Expand panel" : "Collapse panel"}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          {!collapsed && <span className="text-xs font-medium">Collapse</span>}
        </button>
        <div className={`flex items-center rounded-lg bg-slate-50 px-2.5 py-2 ${collapsed ? "justify-center" : "gap-3"}`}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-rose-400 to-amber-400 shadow-sm shadow-rose-100">
            <User className="h-3.5 w-3.5 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-700">{user.email}</p>
              <p className="text-xs text-slate-400">Free plan</p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className={cn(
            "w-full cursor-pointer text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600",
            collapsed ? "justify-center px-0" : "justify-start gap-2"
          )}
          title={collapsed ? "Sign out" : undefined}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && "Sign out"}
        </Button>
      </div>
    </aside>
  );
}
