import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { sessionId: string; newChanges: Record<string, string> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { sessionId, newChanges } = body;
  if (!sessionId || !newChanges) {
    return NextResponse.json({ error: "sessionId and newChanges are required" }, { status: 400 });
  }

  // Fetch current accumulated changes
  const { data: existing } = await supabase
    .from("ai_sessions")
    .select("accumulated_changes")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  const existing_acc =
    existing?.accumulated_changes && typeof existing.accumulated_changes === "object"
      ? (existing.accumulated_changes as Record<string, string>)
      : {};

  const merged = { ...existing_acc, ...newChanges };

  const { error } = await supabase
    .from("ai_sessions")
    .update({ accumulated_changes: merged })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (error) {
    console.error("sessions/accumulate error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, accumulatedChanges: merged });
}
