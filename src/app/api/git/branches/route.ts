import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const connectionId = searchParams.get("connectionId");
  const repoFullName = searchParams.get("repo");

  if (!connectionId || !repoFullName) {
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
      const [owner, repo] = repoFullName.split("/");
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/branches?per_page=100`,
        {
          headers: {
            Authorization: `Bearer ${connection.access_token}`,
            "User-Agent": "VibeCode",
          },
        }
      );
      if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
      const branches = await res.json();
      return NextResponse.json(branches.map((b: { name: string }) => b.name));
    }

    if (connection.provider === "gitlab") {
      const encoded = encodeURIComponent(repoFullName);
      const res = await fetch(
        `https://gitlab.com/api/v4/projects/${encoded}/repository/branches?per_page=100`,
        { headers: { Authorization: `Bearer ${connection.access_token}` } }
      );
      if (!res.ok) throw new Error(`GitLab API error: ${res.status}`);
      const branches = await res.json();
      return NextResponse.json(branches.map((b: { name: string }) => b.name));
    }

    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch branches";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
