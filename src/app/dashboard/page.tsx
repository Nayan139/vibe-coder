import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: connections, error } = await supabase
    .from("git_connections")
    .select("id, provider, username, avatar_url")
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to fetch git connections:", error);
  }

  return <DashboardClient connections={connections ?? []} />;
}
