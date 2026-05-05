import { NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import { RequestError } from "@octokit/request-error";
import { createClient } from "@/lib/supabase/server";

const GITLAB_API = "https://gitlab.com/api/v4";

function isEnvFile(filePath: string): boolean {
  const base = filePath.split("/").pop() ?? filePath;
  return base === ".env" || base.startsWith(".env.") || base.endsWith(".env");
}

/** Git branch/ref name rules (simplified): no spaces or dangerous chars; max length. */
function validateBranchName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Branch name cannot be empty.";
  if (trimmed.length > 240) return "Branch name is too long (max 240 characters).";
  if (trimmed.startsWith("/") || trimmed.endsWith("/") || trimmed.includes("..")) {
    return "Invalid branch name: no leading/trailing slashes or '..'.";
  }
  if (!/^[a-zA-Z0-9/_\-.]+$/.test(trimmed)) {
    return "Branch name may only contain letters, numbers, and ._/- characters.";
  }
  if (trimmed.endsWith(".lock") || trimmed.includes("@{")) return "Invalid branch name.";
  return null;
}

function formatGithubError(err: unknown): string {
  if (err instanceof RequestError) {
    const msg =
      typeof err.response?.data === "object" &&
      err.response?.data !== null &&
      "message" in err.response.data
        ? String((err.response.data as { message: unknown }).message)
        : err.message;
    if (err.status === 404) return `GitHub: branch or repository not found (${msg}).`;
    if (err.status === 403) return `GitHub: permission denied — ${msg}`;
    if (err.status === 422) {
      if (/already exists|Reference already exists/i.test(msg)) {
        return "A branch with this name already exists. Choose a different name.";
      }
      return `GitHub: ${msg}`;
    }
    return `GitHub (${err.status}): ${msg}`;
  }
  return err instanceof Error ? err.message : "Push failed";
}

async function gitlabJson<T>(
  token: string,
  path: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T | { message?: string; error?: string } }> {
  const res = await fetch(`${GITLAB_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const data = (await res.json().catch(() => ({}))) as T | { message?: string; error?: string };
  return { ok: res.ok, status: res.status, data };
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
    commitMessage: string;
    sessionId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { connectionId, repoFullName, baseBranch, newBranch, changes, commitMessage, sessionId } = body;

  if (!connectionId || !repoFullName || !baseBranch || !newBranch || !commitMessage) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!changes || typeof changes !== "object" || Object.keys(changes).length === 0) {
    return NextResponse.json({ error: "No file changes to push." }, { status: 400 });
  }

  const branchErr = validateBranchName(newBranch);
  if (branchErr) return NextResponse.json({ error: branchErr }, { status: 400 });

  const { data: connection } = await supabase
    .from("git_connections")
    .select("provider, access_token")
    .eq("id", connectionId)
    .eq("user_id", user.id)
    .single();

  if (!connection) return NextResponse.json({ error: "Connection not found" }, { status: 404 });

  const projectEnc = encodeURIComponent(repoFullName);

  try {
    const pushedFiles: string[] = [];

    if (connection.provider === "github") {
      const octokit = new Octokit({ auth: connection.access_token });
      const [owner, repo] = repoFullName.split("/");
      if (!owner || !repo) {
        return NextResponse.json({ error: "Invalid repoFullName (expected owner/repo)." }, { status: 400 });
      }

      const { data: baseRef } = await octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${baseBranch}`,
      });
      const baseSha = baseRef.object.sha;

      await octokit.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${newBranch.trim()}`,
        sha: baseSha,
      });

      for (const [filePath, newContent] of Object.entries(changes)) {
        if (typeof newContent !== "string") continue;
        if (isEnvFile(filePath)) continue; // never push .env files to git

        let fileSha: string | undefined;
        try {
          const { data: existing } = await octokit.repos.getContent({
            owner,
            repo,
            path: filePath,
            ref: newBranch.trim(),
          });
          if (!Array.isArray(existing)) fileSha = existing.sha;
        } catch {
          // new file
        }

        await octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: filePath,
          message: commitMessage,
          content: Buffer.from(newContent, "utf-8").toString("base64"),
          branch: newBranch.trim(),
          ...(fileSha ? { sha: fileSha } : {}),
        });
        pushedFiles.push(filePath);
      }
    } else if (connection.provider === "gitlab") {
      const token = connection.access_token;
      const branch = newBranch.trim();

      const createBranch = await gitlabJson<{ name?: string }>(token, `/projects/${projectEnc}/repository/branches`, {
        method: "POST",
        body: JSON.stringify({ branch, ref: baseBranch }),
      });

      if (!createBranch.ok) {
        const glMsg =
          typeof createBranch.data === "object" &&
          createBranch.data !== null &&
          "message" in createBranch.data
            ? JSON.stringify((createBranch.data as { message: unknown }).message)
            : `HTTP ${createBranch.status}`;
        if (createBranch.status === 400 && /already exists/i.test(glMsg)) {
          return NextResponse.json(
            { success: false, error: "A branch with this name already exists. Choose a different name." },
            { status: 409 }
          );
        }
        throw new Error(`GitLab: could not create branch — ${glMsg}`);
      }

      for (const [filePath, newContent] of Object.entries(changes)) {
        if (typeof newContent !== "string") continue;
        if (isEnvFile(filePath)) continue; // never push .env files to git

        const pathEnc = encodeURIComponent(filePath);
        const getFile = await gitlabJson<{ blob_id?: string }>(
          token,
          `/projects/${projectEnc}/repository/files/${pathEnc}?ref=${encodeURIComponent(branch)}`,
          { method: "GET" }
        );

        const bodyObj: Record<string, string> = {
          branch,
          content: newContent,
          commit_message: commitMessage,
          encoding: "text",
        };

        if (getFile.ok && getFile.data && typeof getFile.data === "object" && "blob_id" in getFile.data) {
          const sha = (getFile.data as { blob_id: string }).blob_id;
          bodyObj.sha = sha;
          const put = await gitlabJson<unknown>(token, `/projects/${projectEnc}/repository/files/${pathEnc}`, {
            method: "PUT",
            body: JSON.stringify(bodyObj),
          });
          if (!put.ok) {
            const msg =
              typeof put.data === "object" && put.data !== null && "message" in put.data
                ? JSON.stringify((put.data as { message: unknown }).message)
                : `HTTP ${put.status}`;
            throw new Error(`GitLab: failed to update ${filePath} — ${msg}`);
          }
        } else {
          const post = await gitlabJson<unknown>(token, `/projects/${projectEnc}/repository/files/${pathEnc}`, {
            method: "POST",
            body: JSON.stringify(bodyObj),
          });
          if (!post.ok) {
            const msg =
              typeof post.data === "object" && post.data !== null && "message" in post.data
                ? JSON.stringify((post.data as { message: unknown }).message)
                : `HTTP ${post.status}`;
            throw new Error(`GitLab: failed to create ${filePath} — ${msg}`);
          }
        }
        pushedFiles.push(filePath);
      }
    } else {
      return NextResponse.json({ error: "Unknown Git provider." }, { status: 400 });
    }

    if (sessionId) {
      const { error: sessErr } = await supabase
        .from("ai_sessions")
        .update({ new_branch: newBranch.trim() })
        .eq("id", sessionId)
        .eq("user_id", user.id);
      if (sessErr) console.error("ai_sessions new_branch update:", sessErr);
    }

    return NextResponse.json({ success: true, branch: newBranch.trim(), pushedFiles });
  } catch (err) {
    const message =
      connection.provider === "github" ? formatGithubError(err) : err instanceof Error ? err.message : "Push failed";
    console.error("Git push error:", err);
    const status =
      err instanceof RequestError && (err.status === 403 || err.status === 404)
        ? err.status
        : err instanceof RequestError && err.status === 422
          ? 409
          : 502;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
