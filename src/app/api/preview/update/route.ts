import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { E2B_PREVIEW_PROJECT_ROOT } from "@/lib/e2b-preview-paths";
import { previewSandboxes } from "@/lib/e2b-preview-store";

type Body = {
  previewKey?: string;
  connectionId?: string;
  changes?: Record<string, string>;
};

function normalizeRelativePath(path: string): string {
  return path.replace(/^\//, "").replace(/\.\./g, "");
}

export async function POST(request: Request) {
  const { previewKey, connectionId, changes }: Body = await request.json();

  if (!previewKey || !connectionId || !changes || typeof changes !== "object") {
    return NextResponse.json(
      { success: false, error: "previewKey, connectionId, and changes are required" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data: connection } = await supabase
    .from("git_connections")
    .select("id")
    .eq("id", connectionId)
    .eq("user_id", user.id)
    .single();

  if (!connection) {
    return NextResponse.json({ success: false, error: "Connection not found" }, { status: 404 });
  }

  const entry = previewSandboxes.get(previewKey);
  if (!entry) {
    return NextResponse.json(
      { success: false, error: "Preview session not active. Start live preview again." },
      { status: 404 }
    );
  }

  if (entry.userId !== user.id) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    const { sandbox } = entry;
    for (const [rawPath, content] of Object.entries(changes)) {
      const rel = normalizeRelativePath(rawPath);
      if (!rel) continue;
      await sandbox.files.write(`${E2B_PREVIEW_PROJECT_ROOT}/${rel}`, content);
    }

    // Turbopack can occasionally hold onto stale SSR chunks in long-lived `next dev`
    // sessions. Clearing `.next` makes the preview server regenerate bundles.
    await sandbox.commands
      .run(`rm -rf ${E2B_PREVIEW_PROJECT_ROOT}/.next`, { timeoutMs: 30_000 })
      .catch(() => {});

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
