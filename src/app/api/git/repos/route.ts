import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const connectionId = searchParams.get("connectionId");

  if (!connectionId) {
    return NextResponse.json({ error: "connectionId is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch the connection — RLS ensures it belongs to the current user
  const { data: connection, error: connError } = await supabase
    .from("git_connections")
    .select("id, provider, access_token")
    .eq("id", connectionId)
    .eq("user_id", user.id)
    .single();

  if (connError || !connection) {
    return NextResponse.json({ error: "Git connection not found" }, { status: 404 });
  }

  try {
    if (connection.provider === "github") {
      return NextResponse.json(await fetchGitHubRepos(connection.access_token, connectionId));
    }
    if (connection.provider === "gitlab") {
      return NextResponse.json(await fetchGitLabRepos(connection.access_token, connectionId));
    }
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch repositories";
    console.error("Repo fetch error:", err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

async function fetchGitHubRepos(accessToken: string, connectionId: string) {
  const res = await fetch(
    "https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "VibeCode",
        Accept: "application/vnd.github+json",
      },
      next: { revalidate: 60 },
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? `GitHub API error: ${res.status}`);
  }

  const repos = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return repos.map((r: any) => ({
    id: r.id,
    name: r.name,
    full_name: r.full_name,
    description: r.description,
    private: r.private,
    language: r.language,
    stargazers_count: r.stargazers_count,
    forks_count: r.forks_count,
    updated_at: r.updated_at,
    html_url: r.html_url,
    connectionId,
  }));
}

async function fetchGitLabRepos(accessToken: string, connectionId: string) {
  const res = await fetch(
    "https://gitlab.com/api/v4/projects?membership=true&per_page=100&order_by=last_activity_at&owned=true",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      next: { revalidate: 60 },
    }
  );

  if (!res.ok) {
    throw new Error(`GitLab API error: ${res.status}`);
  }

  const projects = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return projects.map((p: any) => ({
    id: p.id,
    name: p.name,
    full_name: p.path_with_namespace,
    description: p.description,
    private: p.visibility !== "public",
    language: null,
    stargazers_count: p.star_count,
    forks_count: p.forks_count,
    updated_at: p.last_activity_at,
    html_url: p.web_url,
    connectionId,
  }));
}
