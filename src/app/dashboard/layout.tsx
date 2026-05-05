import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardSidebar } from "./sidebar";
import { ConnectionToast } from "./connection-toast";
import { DashboardErrorBoundary } from "@/components/DashboardErrorBoundary";

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: connections } = await supabase
    .from("git_connections")
    .select("id, provider, username, avatar_url")
    .eq("user_id", user.id);

  return (
    <div className="flex min-h-screen bg-[radial-gradient(900px_circle_at_5%_10%,rgba(244,63,94,0.04),transparent_50%),linear-gradient(160deg,#fafafa_0%,#f4f4f5_100%)]">
      <DashboardSidebar user={user} connections={connections ?? []} />
      <main className="min-h-0 min-w-0 flex-1 overflow-auto">
        <Suspense>
          <ConnectionToast />
        </Suspense>
        <div className="mx-auto w-full max-w-[1320px] px-4 py-6 sm:px-6 lg:px-8">
          <DashboardErrorBoundary>{children}</DashboardErrorBoundary>
        </div>
      </main>
    </div>
  );
}
