import { NextResponse } from "next/server";
import prettier from "prettier";
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

    const changes = JSON.parse(clean) as unknown;
    if (
      typeof changes !== "object" ||
      changes === null ||
      Array.isArray(changes) ||
      Object.keys(changes as object).length === 0
    ) {
      return NextResponse.json(
        { success: false, error: "AI returned an empty or invalid changes object." },
        { status: 502 }
      );
    }

    const changeMap = changes as Record<string, string>;
    for (const v of Object.values(changeMap)) {
      if (typeof v !== "string") {
        return NextResponse.json(
          { success: false, error: "AI returned non-string file contents." },
          { status: 502 }
        );
      }
    }

    const formattedChanges: Record<string, string> = {};
    for (const [filePath, content] of Object.entries(changeMap)) {
      try {
        const parser =
          filePath.endsWith(".tsx") || filePath.endsWith(".jsx")
            ? "babel"
            : filePath.endsWith(".ts")
              ? "typescript"
              : filePath.endsWith(".css")
                ? "css"
                : filePath.endsWith(".json")
                  ? "json"
                  : "babel";

        formattedChanges[filePath] = await prettier.format(content as string, {
          parser,
          semi: true,
          singleQuote: true,
          tabWidth: 2,
          trailingComma: "es5",
          printWidth: 80,
        });
      } catch {
        formattedChanges[filePath] = content as string;
      }
    }

    const assistantSummary = `I've made the following changes:\n${Object.keys(formattedChanges)
      .map((f) => `- ${f}`)
      .join("\n")}`;

    let resolvedSessionId: string | undefined;

    if (sessionId) {
      await supabase.from("chat_messages").insert([
        { session_id: sessionId, role: "user", content: prompt },
        { session_id: sessionId, role: "assistant", content: assistantSummary },
      ]);

      const { error: updErr } = await supabase
        .from("ai_sessions")
        .update({ status: "done", changes: formattedChanges, prompt })
        .eq("id", sessionId)
        .eq("user_id", user.id);

      if (updErr) console.error("ai_sessions update:", updErr);
      else resolvedSessionId = sessionId;
    } else {
      const { data: newSession, error: insErr } = await supabase
        .from("ai_sessions")
        .insert({
          user_id: user.id,
          prompt,
          status: "done",
          changes: formattedChanges,
          project_id: null,
        })
        .select("id")
        .single();

      if (insErr) {
        console.error("ai_sessions insert:", insErr);
      } else if (newSession?.id) {
        resolvedSessionId = newSession.id;
        await supabase.from("chat_messages").insert([
          { session_id: newSession.id, role: "user", content: prompt },
          { session_id: newSession.id, role: "assistant", content: assistantSummary },
        ]);
      }
    }

    return NextResponse.json({ success: true, changes: formattedChanges, sessionId: resolvedSessionId });
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
