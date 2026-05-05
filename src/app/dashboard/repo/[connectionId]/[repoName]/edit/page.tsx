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

  let initialSessionId: string | null = null;
  let initialAccumulatedChanges: Record<string, string> = {};
  let initialLastPrompt = "";
  let initialLlmProvider: string | null = null;
  let initialLlmModel: string | null = null;
  let initialMessages: Array<{
    role: "user" | "assistant";
    content: string;
    changesSnapshot?: Record<string, string>;
  }> = [];

  if (projectId) {
    const { data: latestSession } = await supabase
      .from("ai_sessions")
      .select("id, prompt, accumulated_changes, llm_provider, llm_model")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestSession?.id) {
      initialSessionId = latestSession.id;
      initialLastPrompt = latestSession.prompt ?? "";
      initialLlmProvider = latestSession.llm_provider ?? null;
      initialLlmModel = latestSession.llm_model ?? null;
      if (
        latestSession.accumulated_changes &&
        typeof latestSession.accumulated_changes === "object"
      ) {
        initialAccumulatedChanges =
          latestSession.accumulated_changes as Record<string, string>;
      }

      const { data: chatRows } = await supabase
        .from("chat_messages")
        .select("role, content, changes_snapshot")
        .eq("session_id", latestSession.id)
        .order("created_at", { ascending: true });

      initialMessages = (chatRows ?? [])
        .filter((row) => row.role === "user" || row.role === "assistant")
        .map((row) => ({
          role: row.role as "user" | "assistant",
          content: row.content ?? "",
          changesSnapshot:
            row.changes_snapshot && typeof row.changes_snapshot === "object"
              ? (row.changes_snapshot as Record<string, string>)
              : undefined,
        }));
    }
  }

  return (
    <EditClient
      connectionId={connectionId}
      repoFullName={decodedRepo}
      branch={selectedBranch}
      provider={connection.provider}
      installCommand={install ?? "npm install"}
      startCommand={start ?? "npm run dev"}
      projectId={projectId ?? undefined}
      initialSessionId={initialSessionId}
      initialMessages={initialMessages}
      initialAccumulatedChanges={initialAccumulatedChanges}
      initialLastPrompt={initialLastPrompt}
      initialLlmProvider={initialLlmProvider}
      initialLlmModel={initialLlmModel}
    />
  );
}
