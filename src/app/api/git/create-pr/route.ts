import { NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import { RequestError } from "@octokit/request-error";
import { createClient } from "@/lib/supabase/server";
import { callAI } from "@/lib/ai-client";

const GITLAB_API = "https://gitlab.com/api/v4";

function formatGithubError(err: unknown): string {
  if (err instanceof RequestError) {
    const msg =
      typeof err.response?.data === "object" &&
      err.response?.data !== null &&
      "message" in err.response.data
        ? String((err.response.data as { message: unknown }).message)
        : err.message;
    if (err.status === 404) return `GitHub: not found — ${msg}`;
    if (err.status === 403) return `GitHub: permission denied — ${msg}`;
    if (err.status === 422) {
      if (/A pull request already exists/i.test(msg)) {
        return "A pull request for this branch already exists. Open it on GitHub or use a new branch.";
      }
      return `GitHub: ${msg}`;
    }
    return `GitHub (${err.status}): ${msg}`;
  }
  return err instanceof Error ? err.message : "PR creation failed";
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

  if (!connectionId || !repoFullName || !baseBranch || !newBranch || !userPrompt) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!changes || typeof changes !== "object" || Object.keys(changes).length === 0) {
    return NextResponse.json({ error: "No changes metadata for PR description." }, { status: 400 });
  }

  const { data: connection } = await supabase
    .from("git_connections")
    .select("provider, access_token")
    .eq("id", connectionId)
    .eq("user_id", user.id)
    .single();

  if (!connection) return NextResponse.json({ error: "Connection not found" }, { status: 404 });

  const prDescription = await generatePRDescription(changes, userPrompt);
  const prTitle = `AI Changes: ${userPrompt.slice(0, 60)}${userPrompt.length > 60 ? "..." : ""}`;
  const headBranch = newBranch.trim();

  try {
    if (connection.provider === "github") {
      const octokit = new Octokit({ auth: connection.access_token });
      const [owner, repo] = repoFullName.split("/");
      if (!owner || !repo) {
        return NextResponse.json({ error: "Invalid repoFullName (expected owner/repo)." }, { status: 400 });
      }

      const { data: pr } = await octokit.pulls.create({
        owner,
        repo,
        title: prTitle,
        body: prDescription,
        head: headBranch,
        base: baseBranch,
      });

      if (sessionId) {
        const { error: sessErr } = await supabase
          .from("ai_sessions")
          .update({ pr_url: pr.html_url, pr_title: pr.title })
          .eq("id", sessionId)
          .eq("user_id", user.id);
        if (sessErr) console.error("ai_sessions PR update:", sessErr);
      }

      return NextResponse.json({
        success: true,
        prUrl: pr.html_url,
        prNumber: pr.number,
        prTitle: pr.title,
        provider: "github",
      });
    }

    if (connection.provider === "gitlab") {
      const projectEnc = encodeURIComponent(repoFullName);
      const res = await fetch(`${GITLAB_API}/projects/${projectEnc}/merge_requests`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${connection.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source_branch: headBranch,
          target_branch: baseBranch,
          title: prTitle,
          description: prDescription,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        iid?: number;
        web_url?: string;
        title?: string;
        message?: unknown;
        error?: string;
      };

      if (!res.ok) {
        const msg = data.message ? JSON.stringify(data.message) : data.error ?? `HTTP ${res.status}`;
        if (res.status === 409 || /already exists/i.test(String(msg))) {
          return NextResponse.json(
            {
              success: false,
              error: "A merge request for this branch may already exist. Check GitLab or use a new branch.",
            },
            { status: 409 }
          );
        }
        throw new Error(`GitLab: ${msg}`);
      }

      const mrUrl = data.web_url ?? "";
      const mrNumber = data.iid ?? 0;
      const mrTitle = data.title ?? prTitle;

      if (sessionId && mrUrl) {
        const { error: sessErr } = await supabase
          .from("ai_sessions")
          .update({ pr_url: mrUrl, pr_title: mrTitle })
          .eq("id", sessionId)
          .eq("user_id", user.id);
        if (sessErr) console.error("ai_sessions MR update:", sessErr);
      }

      return NextResponse.json({
        success: true,
        prUrl: mrUrl,
        prNumber: mrNumber,
        prTitle: mrTitle,
        provider: "gitlab",
      });
    }

    return NextResponse.json({ error: "Unknown Git provider." }, { status: 400 });
  } catch (err) {
    const message =
      connection.provider === "github" ? formatGithubError(err) : err instanceof Error ? err.message : "PR creation failed";
    console.error("Create PR error:", err);
    const status = err instanceof RequestError && err.status ? err.status : 502;
    return NextResponse.json({ success: false, error: message }, { status: status >= 400 && status < 600 ? status : 502 });
  }
}
