import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { projectId?: string; title?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const { data: session, error } = await supabase
    .from("ai_sessions")
    .insert({
      user_id: user.id,
      project_id: body.projectId ?? null,
      title: body.title ?? null,
      prompt: "",
      status: "active",
      accumulated_changes: {},
    })
    .select("id")
    .single();

  if (error) {
    console.error("sessions/new error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, sessionId: session.id });
}
