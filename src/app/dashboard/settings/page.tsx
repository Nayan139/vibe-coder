import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: connections, error } = await supabase
    .from("git_connections")
    .select("id, provider, username, avatar_url")
    .eq("user_id", user.id)
    .in("provider", ["github", "gitlab"]);

  if (error) {
    console.error("Failed to fetch connections for settings:", error);
  }

  return <SettingsClient connections={connections ?? []} />;
}
