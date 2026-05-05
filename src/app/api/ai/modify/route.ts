import { NextResponse } from "next/server";
import prettier from "prettier";
import { createClient } from "@/lib/supabase/server";
import { callAI } from "@/lib/ai-client";

export const runtime = "nodejs";
// Keep this long-running AI endpoint within Vercel Hobby limits.
export const maxDuration = 300;

const SYSTEM_PROMPT = `You are a precise code modification AI.
The user will describe a UI or code change they want to make.
You will return ONLY a valid JSON object where:
- Keys are file paths for EXISTING files to modify (e.g. "src/app/page.tsx")
- For NEW files, prefix the key with "CREATE:" (e.g. "CREATE:src/utils/api.ts")
- Values are the COMPLETE new file content (not just the changed part)

Rules:
- Return ONLY valid JSON. No explanation, no markdown, no code blocks.
- Only include files that actually need to change or be created.
- Preserve all existing functionality unless asked to change it.
- Keep the same coding style and patterns as the original.
- Never create or modify .env/.env.* files. Environment variables are managed in project settings.

Example output format:
{"src/app/page.tsx": "complete file content here", "CREATE:src/utils/api.ts": "export const api = {};"}`;

function isEnvPath(filePath: string): boolean {
  const base = filePath.split("/").pop() ?? filePath;
  return base === ".env" || base.startsWith(".env.") || base.endsWith(".env");
}

function processAIChanges(changes: Record<string, string>): {
  modifiedFiles: Record<string, string>;
  createdFiles: Record<string, string>;
} {
  const modifiedFiles: Record<string, string> = {};
  const createdFiles: Record<string, string> = {};
  for (const [key, content] of Object.entries(changes)) {
    if (key.startsWith("CREATE:")) {
      createdFiles[key.replace("CREATE:", "")] = content;
    } else {
      modifiedFiles[key] = content;
    }
  }
  return { modifiedFiles, createdFiles };
}

async function formatFile(filePath: string, content: string): Promise<string> {
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
              : null;

    if (!parser) return content;

    return await prettier.format(content, {
      parser,
      semi: true,
      singleQuote: true,
      tabWidth: 2,
      trailingComma: "es5",
      printWidth: 80,
    });
  } catch {
    return content;
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    prompt: string;
    fileContents: Record<string, string>;
    projectContext?: string;
    sessionId?: string;
    projectId?: string;
    selectedFiles?: string[];
    overrideProvider?: string;
    overrideModel?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { prompt, fileContents, projectContext, sessionId, projectId, selectedFiles, overrideProvider, overrideModel } = body;

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
      {
        model: isLargeRequest ? "agent" : "primary",
        overrideProvider,
        overrideModel,
      }
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

    // Separate CREATE: prefixed (new files) from modified files
    const { modifiedFiles, createdFiles } = processAIChanges(changeMap);

    // Format modified files with Prettier; skip .env files
    const formattedModified: Record<string, string> = {};
    for (const [filePath, content] of Object.entries(modifiedFiles)) {
      formattedModified[filePath] = await formatFile(filePath, content);
    }

    // Filter out env-file edits/creates: env vars are DB-managed only.
    const safeModified = Object.fromEntries(
      Object.entries(formattedModified).filter(([filePath]) => !isEnvPath(filePath))
    );
    const safeCreated = Object.fromEntries(
      Object.entries(createdFiles).filter(([filePath]) => !isEnvPath(filePath))
    );

    // Combine: modified (formatted) + created (raw)
    const allChanges: Record<string, string> = { ...safeModified, ...safeCreated };
    if (Object.keys(allChanges).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "AI returned only environment-file changes. Env creation/edit from chatbot is disabled. Please manage env vars in project settings.",
        },
        { status: 422 }
      );
    }

    const assistantSummary = `I've made the following changes:\n${Object.keys(safeModified)
      .map((f) => `• ${f}`)
      .join("\n")}${
      Object.keys(safeCreated).length > 0
        ? `\n\nNew files created:\n${Object.keys(safeCreated)
            .map((f) => `• ${f} (NEW)`)
            .join("\n")}`
        : ""
    }\n\nCheck the diff preview on the right and click "Apply Changes" to proceed.`;

    let resolvedSessionId: string | undefined;

    if (sessionId) {
      // Save chat messages with snapshot of what changed this turn
      await supabase.from("chat_messages").insert([
        {
          session_id: sessionId,
          role: "user",
          content: prompt,
          selected_files: selectedFiles ?? null,
        },
        {
          session_id: sessionId,
          role: "assistant",
          content: assistantSummary,
          changes_snapshot: allChanges,
        },
      ]);

      // Fetch existing accumulated_changes to merge
      const { data: existingSession } = await supabase
        .from("ai_sessions")
        .select("accumulated_changes")
        .eq("id", sessionId)
        .eq("user_id", user.id)
        .single();

      const existingAccumulated =
        existingSession?.accumulated_changes &&
        typeof existingSession.accumulated_changes === "object"
          ? (existingSession.accumulated_changes as Record<string, string>)
          : {};

      const mergedAccumulated = { ...existingAccumulated, ...allChanges };

      const { error: updErr } = await supabase
        .from("ai_sessions")
        .update({
          status: "active",
          changes: allChanges,
          accumulated_changes: mergedAccumulated,
          prompt,
          llm_provider: overrideProvider ?? null,
          llm_model: overrideModel ?? null,
        })
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
          status: "active",
          changes: allChanges,
          accumulated_changes: allChanges,
          project_id: projectId ?? null,
          llm_provider: overrideProvider ?? null,
          llm_model: overrideModel ?? null,
        })
        .select("id")
        .single();

      if (insErr) {
        console.error("ai_sessions insert:", insErr);
      } else if (newSession?.id) {
        resolvedSessionId = newSession.id;
        await supabase.from("chat_messages").insert([
          {
            session_id: newSession.id,
            role: "user",
            content: prompt,
            selected_files: selectedFiles ?? null,
          },
          {
            session_id: newSession.id,
            role: "assistant",
            content: assistantSummary,
            changes_snapshot: allChanges,
          },
        ]);
      }
    }

    // Persist newly created files to the created_files table (best-effort)
    if (resolvedSessionId && Object.keys(safeCreated).length > 0) {
      const rows = Object.entries(safeCreated).map(([filePath, content]) => ({
        session_id: resolvedSessionId,
        project_id: projectId ?? null,
        file_path: filePath,
        content,
        is_env_file: false,
        committed: false,
      }));
      const { error: cfErr } = await supabase.from("created_files").insert(rows);
      if (cfErr) console.error("created_files insert:", cfErr.message);
    }

    return NextResponse.json({
      success: true,
      changes: allChanges,
      modifiedFiles: safeModified,
      createdFiles: safeCreated,
      sessionId: resolvedSessionId,
    });
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
