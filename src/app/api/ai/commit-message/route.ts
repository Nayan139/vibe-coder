import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callAI } from "@/lib/ai-client";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { changes: Record<string, string>; userPrompt: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { changes, userPrompt } = body;
  if (!changes || typeof changes !== "object" || !userPrompt) {
    return NextResponse.json({ error: "changes and userPrompt are required" }, { status: 400 });
  }

  const fileList = Object.keys(changes).join(", ");

  try {
    const message = await callAI(
      [
        {
          role: "user",
          content: `Write a concise git commit message (max 72 chars, conventional commits format) for these changes.
User asked: "${userPrompt}"
Files changed: ${fileList}
Return ONLY the commit message text, nothing else.`,
        },
      ],
      { model: "fast" }
    );

    return NextResponse.json({ message: message.trim() || "feat: AI-powered changes" });
  } catch (err) {
    console.error("Commit message error:", err);
    return NextResponse.json({ message: "feat: AI-powered changes" });
  }
}
