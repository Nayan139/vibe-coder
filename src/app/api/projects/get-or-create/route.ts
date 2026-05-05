import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { connectionId: string; repoFullName: string; repoName: string; branch?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { connectionId, repoFullName, repoName, branch } = body;
  if (!connectionId || !repoFullName || !repoName) {
    return NextResponse.json(
      { error: "connectionId, repoFullName, and repoName are required" },
      { status: 400 }
    );
  }

  // Look for an existing project by connection + repo
  const { data: existing } = await supabase
    .from("projects")
    .select("id, run_command, install_command")
    .eq("connection_id", connectionId)
    .eq("repo_full_name", repoFullName)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    // Update selected branch if provided
    if (branch) {
      await supabase
        .from("projects")
        .update({ selected_branch: branch })
        .eq("id", existing.id)
        .eq("user_id", user.id);
    }
    return NextResponse.json({
      success: true,
      projectId: existing.id as string,
      runCommand: (existing.run_command as string | null) ?? null,
      installCommand: (existing.install_command as string | null) ?? null,
    });
  }

  // Create new project record
  const { data: newProject, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      connection_id: connectionId,
      repo_name: repoName,
      repo_full_name: repoFullName,
      selected_branch: branch ?? "main",
    })
    .select("id")
    .single();

  if (error) {
    console.error("projects/get-or-create error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    projectId: newProject.id as string,
    runCommand: null,
    installCommand: null,
  });
}
