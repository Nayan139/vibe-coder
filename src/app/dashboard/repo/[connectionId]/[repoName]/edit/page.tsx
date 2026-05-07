import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditClient } from "./edit-client";

interface PageProps {
  params: Promise<{ connectionId: string; repoName: string }>;
  searchParams: Promise<{ branch?: string; install?: string; start?: string; projectId?: string }>;
}

export default async function EditPage({ params, searchParams }: Readonly<PageProps>) {
  const { connectionId, repoName } = await params;
  const sp = await searchParams;
  const { branch, install, start } = sp;
  const projectId = sp.projectId;
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
      projectId={projectId ?? undefined}
    />
  );
}
