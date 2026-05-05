import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { projectId: string; install: string; start: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { projectId, install, start } = body;
  if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });

  const { error } = await supabase
    .from("projects")
    .update({ install_command: install ?? null, run_command: start ?? null })
    .eq("id", projectId)
    .eq("user_id", user.id);

  if (error) {
    console.error("update-commands error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
