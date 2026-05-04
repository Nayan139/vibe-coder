import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardSidebar } from "./sidebar";
import { ConnectionToast } from "./connection-toast";

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: connections } = await supabase
    .from("git_connections")
    .select("id, provider, username, avatar_url")
    .eq("user_id", user.id);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <DashboardSidebar user={user} connections={connections ?? []} />
      <main className="flex-1 min-w-0 overflow-auto">
        <Suspense>
          <ConnectionToast />
        </Suspense>
        {children}
      </main>
    </div>
  );
}
