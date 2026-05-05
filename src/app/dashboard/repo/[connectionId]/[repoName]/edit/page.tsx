import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditClient } from "./edit-client";

interface PageProps {
  params: Promise<{ connectionId: string; repoName: string }>;
  searchParams: Promise<{ branch?: string; install?: string; start?: string }>;
}

export default async function EditPage({ params, searchParams }: PageProps) {
  const { connectionId, repoName } = await params;
  const { branch, install, start } = await searchParams;
  const decodedRepo = decodeURIComponent(repoName);
  const selectedBranch = branch ? decodeURIComponent(branch) : "main";

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
    <EditClient
      connectionId={connectionId}
      repoFullName={decodedRepo}
      branch={selectedBranch}
      provider={connection.provider}
      installCommand={install ?? "npm install"}
      startCommand={start ?? "npm run dev"}
    />
  );
}
