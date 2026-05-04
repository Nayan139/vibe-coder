import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callAI } from "@/lib/ai-client";

const SYSTEM_PROMPT = `You are a precise code modification AI.
The user will describe a UI or code change they want to make.
You will return ONLY a valid JSON object where:
- Keys are file paths relative to the repo root
- Values are the COMPLETE new file content (not just the changed part)

Rules:
- Return ONLY valid JSON. No explanation, no markdown, no code blocks.
- Only include files that actually need to change.
- Preserve all existing functionality unless asked to change it.
- Keep the same coding style and patterns as the original.

Example output format:
{"src/app/page.tsx": "complete file content here", "src/components/hero.tsx": "complete file content here"}`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { prompt: string; fileContents: Record<string, string>; projectContext?: string; sessionId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { prompt, fileContents, projectContext, sessionId } = body;

  if (!prompt || !fileContents) {
    return NextResponse.json({ error: "prompt and fileContents are required" }, { status: 400 });
  }

  const context = projectContext ?? "Unknown project";
  const isLargeRequest = Object.keys(fileContents).length > 5;

  const userMessage = `Project context: ${context}

Files available (showing relevant ones):
${Object.entries(fileContents)
  .map(([path, content]) => `=== ${path} ===\n${content}`)
  .join("\n\n")}

User request: ${prompt}

Return the modified files as JSON.`;

  try {
    const text = await callAI(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      { model: isLargeRequest ? "agent" : "primary" }
    );

    // Strip markdown fences if AI wrapped in them
    let clean = text.trim();
    const fenceMatch = clean.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) clean = fenceMatch[1].trim();

    const changes = JSON.parse(clean);

    // Save chat messages to Supabase if sessionId provided
    if (sessionId) {
      await supabase.from("chat_messages").insert([
        { session_id: sessionId, role: "user", content: prompt },
        {
          session_id: sessionId,
          role: "assistant",
          content: `I've made the following changes:\n${Object.keys(changes)
            .map((f) => `- ${f}`)
            .join("\n")}`,
        },
      ]);

      await supabase
        .from("ai_sessions")
        .update({ status: "done", changes })
        .eq("id", sessionId)
        .eq("user_id", user.id);
    }

    return NextResponse.json({ success: true, changes });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI modification failed";
    console.error("AI modify error:", err);

    if (sessionId) {
      await supabase
        .from("ai_sessions")
        .update({ status: "error" })
        .eq("id", sessionId)
        .eq("user_id", user.id);
    }

    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
