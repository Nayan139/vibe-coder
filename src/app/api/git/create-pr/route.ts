import { NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import { createClient } from "@/lib/supabase/server";
import { callAI } from "@/lib/ai-client";

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
    userPrompt: string;
    sessionId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { connectionId, repoFullName, baseBranch, newBranch, changes, userPrompt, sessionId } = body;

  if (!connectionId || !repoFullName || !baseBranch || !newBranch || !changes || !userPrompt) {
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
    return NextResponse.json({ error: "Only GitHub PRs are currently supported" }, { status: 400 });
  }

  const octokit = new Octokit({ auth: connection.access_token });
  const [owner, repo] = repoFullName.split("/");

  try {
    const prDescription = await generatePRDescription(changes, userPrompt);
    const prTitle = `AI Changes: ${userPrompt.slice(0, 60)}${userPrompt.length > 60 ? "..." : ""}`;

    const { data: pr } = await octokit.pulls.create({
      owner,
      repo,
      title: prTitle,
      body: prDescription,
      head: newBranch,
      base: baseBranch,
    });

    if (sessionId) {
      await supabase
        .from("ai_sessions")
        .update({ pr_url: pr.html_url, pr_title: pr.title })
        .eq("id", sessionId)
        .eq("user_id", user.id);
    }

    return NextResponse.json({
      success: true,
      prUrl: pr.html_url,
      prNumber: pr.number,
      prTitle: pr.title,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "PR creation failed";
    console.error("Create PR error:", err);
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}

async function generatePRDescription(changes: Record<string, string>, userPrompt: string): Promise<string> {
  const fileList = Object.keys(changes)
    .map((f) => `- ${f}`)
    .join("\n");

  try {
    return await callAI(
      [
        {
          role: "user",
          content: `Write a professional GitHub PR description in markdown for these AI-generated changes.

User's request: "${userPrompt}"
Files changed:
${fileList}

Include these sections:
## Summary
## Changes Made
## Testing Notes

Keep it professional and concise.`,
        },
      ],
      { model: "fast" }
    );
  } catch {
    return `## Summary\n${userPrompt}\n\n## Changes Made\n${fileList}\n\n## Testing Notes\nPlease review and test the changes before merging.`;
  }
}
