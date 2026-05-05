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
  Code2,
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
      className={`shrink-0 border-r border-gray-200 bg-white flex flex-col h-screen sticky top-0 transition-all ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Logo */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-violet-600 to-blue-500 flex items-center justify-center shrink-0">
              <Code2 className="w-4 h-4 text-white" />
            </div>
            {!collapsed && <span className="font-bold text-base tracking-tight truncate">VibeCode</span>}
          </Link>
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="h-7 w-7 rounded-md border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 flex items-center justify-center shrink-0"
            title={collapsed ? "Expand panel" : "Collapse panel"}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_LINKS.map((link) => {
          const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                collapsed ? "justify-center" : "gap-3",
                active
                  ? "bg-violet-50 text-violet-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
              title={collapsed ? link.label : undefined}
            >
              <link.icon className="w-4 h-4 shrink-0" />
              {!collapsed && link.label}
            </Link>
          );
        })}

        <Separator className="my-3" />

        {/* Git Accounts */}
        <div className="px-3 py-1">
          {!collapsed && (
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Git Accounts
            </p>
          )}

          {/* GitHub */}
          {githubConnection ? (
            <div className={`flex items-center py-2 px-2 rounded-lg bg-gray-50 mb-2 ${collapsed ? "justify-center" : "gap-2"}`}>
              <GithubIcon className="w-4 h-4 text-gray-700 shrink-0" />
              {!collapsed && (
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate">
                    {githubConnection.username ?? "GitHub"}
                  </p>
                  <Badge className="text-xs bg-green-100 text-green-700 border-0 px-1.5 py-0 h-4">
                    Connected
                  </Badge>
                </div>
              )}
            </div>
          ) : (
            <a href="/api/auth/github" className="block mb-2">
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "w-full text-gray-600 border-dashed",
                  collapsed ? "justify-center px-0" : "justify-start gap-2"
                )}
                title={collapsed ? "Connect GitHub" : undefined}
              >
                <Plus className="w-3.5 h-3.5" />
                {!collapsed && "Connect GitHub"}
              </Button>
            </a>
          )}

          {/* GitLab */}
          {gitlabConnection ? (
            <div className={`flex items-center py-2 px-2 rounded-lg bg-gray-50 ${collapsed ? "justify-center" : "gap-2"}`}>
              <svg className="w-4 h-4 text-orange-600 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 01-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 014.82 2a.43.43 0 01.58 0 .42.42 0 01.11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0118.6 2a.43.43 0 01.58 0 .42.42 0 01.11.18l2.44 7.51L23 13.45a.84.84 0 01-.35.94z" />
              </svg>
              {!collapsed && (
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate">
                    {gitlabConnection.username ?? "GitLab"}
                  </p>
                  <Badge className="text-xs bg-green-100 text-green-700 border-0 px-1.5 py-0 h-4">
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
                  "w-full text-gray-600 border-dashed",
                  collapsed ? "justify-center px-0" : "justify-start gap-2"
                )}
                title={collapsed ? "Connect GitLab" : undefined}
              >
                <Plus className="w-3.5 h-3.5" />
                {!collapsed && "Connect GitLab"}
              </Button>
            </a>
          )}
        </div>
      </nav>

      {/* User + sign out */}
      <div className="px-3 py-4 border-t border-gray-100 space-y-2">
        <div className={`flex items-center px-2 py-2 rounded-lg bg-gray-50 ${collapsed ? "justify-center" : "gap-3"}`}>
          <div className="w-8 h-8 rounded-full bg-linear-to-br from-violet-400 to-blue-400 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-700 truncate">{user.email}</p>
              <p className="text-xs text-gray-400">Free plan</p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className={cn(
            "w-full text-gray-500 hover:text-red-600 hover:bg-red-50",
            collapsed ? "justify-center px-0" : "justify-start gap-2"
          )}
          title={collapsed ? "Sign out" : undefined}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && "Sign out"}
        </Button>
      </div>
    </aside>
  );
}
