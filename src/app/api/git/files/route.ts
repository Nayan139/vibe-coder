import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const GITLAB_API = "https://gitlab.com/api/v4";

function buildGitLabProjectPath(repoFullName: string) {
  return encodeURIComponent(repoFullName);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const connectionId = searchParams.get("connectionId");
  const repo = searchParams.get("repo");
  const branch = searchParams.get("branch") ?? "main";
  const path = searchParams.get("path") ?? "";

  if (!connectionId || !repo) {
    return NextResponse.json({ error: "connectionId and repo are required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: connection } = await supabase
    .from("git_connections")
    .select("provider, access_token")
    .eq("id", connectionId)
    .eq("user_id", user.id)
    .single();

  if (!connection) return NextResponse.json({ error: "Connection not found" }, { status: 404 });

  try {
    if (connection.provider === "github") {
      const [owner, repoName] = repo.split("/");
      const url = `https://api.github.com/repos/${owner}/${repoName}/contents/${path}?ref=${branch}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${connection.access_token}`,
          "User-Agent": "VibeCode",
          Accept: "application/vnd.github+json",
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? `GitHub API error: ${res.status}`);
      }

      const data = await res.json();
      return NextResponse.json(data);
    }

    if (connection.provider === "gitlab") {
      const project = buildGitLabProjectPath(repo);
      const encodedPath = encodeURIComponent(path);
      const ref = encodeURIComponent(branch);
      const url = path
        ? `${GITLAB_API}/projects/${project}/repository/tree?path=${encodedPath}&ref=${ref}&per_page=100`
        : `${GITLAB_API}/projects/${project}/repository/tree?ref=${ref}&per_page=100`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${connection.access_token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const message =
          typeof err === "object" && err !== null && "message" in err
            ? String((err as { message: unknown }).message)
            : `GitLab API error: ${res.status}`;
        throw new Error(message);
      }

      const entries = (await res.json()) as Array<{
        id: string;
        name: string;
        path: string;
        type: "tree" | "blob";
      }>;

      return NextResponse.json(
        entries.map((entry) => ({
          name: entry.name,
          path: entry.path,
          type: entry.type === "tree" ? "dir" : "file",
          sha: entry.id,
        }))
      );
    }

    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch files";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

// Fetch a single file's content (decoded from base64)
export async function POST(request: Request) {
  const { connectionId, repo, branch, filePath } = await request.json();

  if (!connectionId || !repo || !filePath) {
    return NextResponse.json({ error: "connectionId, repo, and filePath are required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: connection } = await supabase
    .from("git_connections")
    .select("provider, access_token")
    .eq("id", connectionId)
    .eq("user_id", user.id)
    .single();

  if (!connection) return NextResponse.json({ error: "Connection not found" }, { status: 404 });

  try {
    if (connection.provider === "github") {
      const [owner, repoName] = repo.split("/");
      const ref = branch ?? "main";
      const url = `https://api.github.com/repos/${owner}/${repoName}/contents/${filePath}?ref=${ref}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${connection.access_token}`,
          "User-Agent": "VibeCode",
          Accept: "application/vnd.github+json",
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 404) return NextResponse.json({ content: "", exists: false });
        throw new Error(err.message ?? `GitHub API error: ${res.status}`);
      }

      const data = await res.json();
      if (data.encoding === "base64") {
        const content = Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf-8");
        return NextResponse.json({ content, sha: data.sha, exists: true });
      }

      return NextResponse.json({ content: data.content, sha: data.sha, exists: true });
    }

    if (connection.provider === "gitlab") {
      const project = buildGitLabProjectPath(repo);
      const pathEnc = encodeURIComponent(filePath);
      const ref = encodeURIComponent(branch ?? "main");
      const url = `${GITLAB_API}/projects/${project}/repository/files/${pathEnc}?ref=${ref}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${connection.access_token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 404) return NextResponse.json({ content: "", exists: false });
        const message =
          typeof err === "object" && err !== null && "message" in err
            ? String((err as { message: unknown }).message)
            : `GitLab API error: ${res.status}`;
        throw new Error(message);
      }

      const data = (await res.json()) as { content?: string; blob_id?: string; encoding?: string };
      const rawContent = data.content ?? "";
      const decoded =
        data.encoding === "base64"
          ? Buffer.from(rawContent.replace(/\n/g, ""), "base64").toString("utf-8")
          : rawContent;

      return NextResponse.json({ content: decoded, sha: data.blob_id, exists: true });
    }

    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch file content";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
