import { NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    connectionId: string;
    repoFullName: string;
    baseBranch: string;
    newBranch: string;
    changes: Record<string, string>;
    commitMessage: string;
    sessionId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { connectionId, repoFullName, baseBranch, newBranch, changes, commitMessage, sessionId } = body;

  if (!connectionId || !repoFullName || !baseBranch || !newBranch || !changes || !commitMessage) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data: connection } = await supabase
    .from("git_connections")
    .select("provider, access_token")
    .eq("id", connectionId)
    .eq("user_id", user.id)
    .single();

  if (!connection) return NextResponse.json({ error: "Connection not found" }, { status: 404 });

  if (connection.provider !== "github") {
    return NextResponse.json({ error: "Only GitHub push is currently supported" }, { status: 400 });
  }

  const octokit = new Octokit({ auth: connection.access_token });
  const [owner, repo] = repoFullName.split("/");

  try {
    // Step 1: Get the SHA of the base branch
    const { data: baseRef } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${baseBranch}`,
    });
    const baseSha = baseRef.object.sha;

    // Step 2: Create the new branch
    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${newBranch}`,
      sha: baseSha,
    });

    // Step 3: Push each changed file
    const pushedFiles: string[] = [];
    for (const [filePath, newContent] of Object.entries(changes)) {
      let fileSha: string | undefined;
      try {
        const { data: existing } = await octokit.repos.getContent({
          owner,
          repo,
          path: filePath,
          ref: newBranch,
        });
        if (!Array.isArray(existing)) fileSha = existing.sha;
      } catch {
        // File doesn't exist yet — that's fine
      }

      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: filePath,
        message: commitMessage,
        content: Buffer.from(newContent).toString("base64"),
        branch: newBranch,
        ...(fileSha ? { sha: fileSha } : {}),
      });
      pushedFiles.push(filePath);
    }

    // Update session if provided
    if (sessionId) {
      await supabase
        .from("ai_sessions")
        .update({ new_branch: newBranch })
        .eq("id", sessionId)
        .eq("user_id", user.id);
    }

    return NextResponse.json({ success: true, branch: newBranch, pushedFiles });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Push failed";
    console.error("Git push error:", err);
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
