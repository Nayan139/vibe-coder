import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RepoDetailClient } from "./repo-detail-client";

interface PageProps {
  params: Promise<{ connectionId: string; repoName: string }>;
}

export default async function RepoDetailPage({ params }: PageProps) {
  const { connectionId, repoName } = await params;
  const decodedRepo = decodeURIComponent(repoName);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: connection } = await supabase
    .from("git_connections")
    .select("id, provider, username")
    .eq("id", connectionId)
    .eq("user_id", user.id)
    .single();

  if (!connection) redirect("/dashboard");

  return (
    <RepoDetailClient
      connectionId={connectionId}
      repoFullName={decodedRepo}
      provider={connection.provider}
      username={connection.username ?? ""}
    />
  );
}
