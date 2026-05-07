import { NextResponse } from "next/server";
import prettier from "prettier";
import { createClient } from "@/lib/supabase/server";
import { callAI } from "@/lib/ai-client";

const SKIP_SEGMENTS = new Set([
  "node_modules", ".git", ".next", "dist", "build", "coverage",
  ".cache", "__pycache__", ".venv", "vendor", "out", ".turbo", ".vercel",
]);
const MAX_FILES_TO_READ = 8;
const MAX_FILE_CHARS = 8000;
const MAX_TREE_FILES = 150;

interface GitTreeItem {
  path?: string;
  type?: string;
}

function shouldSkip(filePath: string): boolean {
  return filePath.split("/").some((seg) => SKIP_SEGMENTS.has(seg));
}

async function fetchFlatTree(
  owner: string,
  repo: string,
  branch: string,
  token: string
): Promise<string[]> {
  const branchRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "VibeCode",
        Accept: "application/vnd.github+json",
      },
    }
  );
  if (!branchRes.ok) throw new Error(`GitHub branch fetch failed: ${branchRes.status}`);

  const branchData = await branchRes.json() as {
    commit: { commit: { tree: { sha: string } } };
  };
  const treeSha = branchData.commit.commit.tree.sha;

  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "VibeCode",
        Accept: "application/vnd.github+json",
      },
    }
  );
  if (!treeRes.ok) throw new Error(`GitHub tree fetch failed: ${treeRes.status}`);

  const treeData = await treeRes.json() as { tree?: GitTreeItem[] };
  return (treeData.tree ?? [])
    .filter((item) => item.type === "blob" && !!item.path && !shouldSkip(item.path!))
    .map((item) => item.path as string)
    .slice(0, MAX_TREE_FILES);
}

async function fetchFileContent(
  owner: string,
  repo: string,
  branch: string,
  filePath: string,
  token: string
): Promise<string> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${encodeURIComponent(branch)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "VibeCode",
          Accept: "application/vnd.github+json",
        },
      }
    );
    if (!res.ok) return "";
    const data = await res.json() as { encoding?: string; content?: string };
    if (data.encoding === "base64" && data.content) {
      return Buffer.from(data.content.replace(/\n/g, ""), "base64")
        .toString("utf-8")
        .slice(0, MAX_FILE_CHARS);
    }
    return (data.content ?? "").slice(0, MAX_FILE_CHARS);
  } catch {
    return "";
  }
}

function parsePlanResponse(text: string, validPaths: string[]): string[] {
  try {
    let clean = text.trim();
    const fence = clean.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) clean = fence[1].trim();
    const parsed = JSON.parse(clean) as unknown;
    if (Array.isArray(parsed)) {
      return (parsed as unknown[])
        .filter((p): p is string => typeof p === "string" && validPaths.includes(p))
        .slice(0, MAX_FILES_TO_READ);
    }
  } catch {
    // fallback: scan text for any valid path strings
    return validPaths.filter((p) => text.includes(p)).slice(0, MAX_FILES_TO_READ);
  }
  return [];
}

async function formatFile(filePath: string, content: string): Promise<string> {
  try {
    const parser = filePath.endsWith(".tsx") || filePath.endsWith(".jsx")
      ? "babel"
      : filePath.endsWith(".ts") ? "typescript"
      : filePath.endsWith(".css") ? "css"
      : filePath.endsWith(".json") ? "json"
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

function splitChanges(raw: Record<string, string>): {
  modifiedFiles: Record<string, string>;
  createdFiles: Record<string, string>;
} {
  const modifiedFiles: Record<string, string> = {};
  const createdFiles: Record<string, string> = {};
  for (const [key, content] of Object.entries(raw)) {
    if (key.startsWith("CREATE:")) {
      createdFiles[key.replace("CREATE:", "")] = content;
    } else {
      modifiedFiles[key] = content;
    }
  }
  return { modifiedFiles, createdFiles };
}

function isEnvPath(filePath: string): boolean {
  const base = filePath.split("/").pop() ?? filePath;
  return base === ".env" || base.startsWith(".env.") || base.endsWith(".env");
}

const MODIFY_PROMPT = `You are a precise code modification AI.
Return ONLY a valid JSON object where:
- Keys are file paths for EXISTING files to modify (e.g. "src/app/page.tsx")
- For NEW files, prefix with "CREATE:" (e.g. "CREATE:src/utils/newFile.ts")
- Values are the COMPLETE new file content

Rules:
- Return ONLY valid JSON. No explanation, no markdown, no code blocks.
- Only include files that need to change or be created.
- Preserve existing functionality unless asked to change it.
- Keep the same coding style as the original.
- Never create or modify .env/.env.* files. Environment variables are managed in project settings.`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    prompt: string;
    connectionId: string;
    repoFullName: string;
    branch: string;
    projectContext?: string;
    sessionId?: string;
    projectId?: string;
    accumulatedChanges?: Record<string, string>;
    overrideProvider?: string;
    overrideModel?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    prompt, connectionId, repoFullName, branch,
    projectContext, sessionId, projectId,
    accumulatedChanges,
    overrideProvider, overrideModel,
  } = body;

  if (!prompt || !connectionId || !repoFullName || !branch) {
    return NextResponse.json(
      { error: "prompt, connectionId, repoFullName, and branch are required" },
      { status: 400 }
    );
  }

  const { data: connection } = await supabase
    .from("git_connections")
    .select("provider, access_token")
    .eq("id", connectionId)
    .eq("user_id", user.id)
    .single();

  if (!connection) return NextResponse.json({ error: "Git connection not found" }, { status: 404 });
  if (connection.provider !== "github") {
    return NextResponse.json(
      { error: "Whole-project AI mode is only supported for GitHub repositories. Please select files manually for GitLab repos." },
      { status: 400 }
    );
  }

  const [owner, repo] = repoFullName.split("/");
  const token = connection.access_token as string;

  try {
    // ── Pass 1: fetch tree + AI selects relevant files ────────────────────────
    const allFiles = await fetchFlatTree(owner, repo, branch, token);

    if (allFiles.length === 0) {
      return NextResponse.json({ error: "Could not retrieve repository file tree." }, { status: 502 });
    }

    const planText = await callAI(
      [
        {
          role: "system",
          content: `Given a file tree and a user request, return ONLY a JSON array of up to ${MAX_FILES_TO_READ} file paths most relevant to fulfilling the request.
Return ONLY the JSON array. Example: ["src/app/page.tsx", "package.json"]`,
        },
        {
          role: "user",
          content: `File tree:\n${allFiles.join("\n")}\n\nUser request: ${prompt}\n\nWhich files do you need?`,
        },
      ],
      { model: "fast", overrideProvider, overrideModel }
    );

    let filesToRead = parsePlanResponse(planText, allFiles);

    // Fallback: pick common entry-point files when AI planning returns nothing
    if (filesToRead.length === 0) {
      const common = ["package.json", "page.tsx", "layout.tsx", "index.tsx", "app.tsx", "index.ts", "main.ts", "main.tsx"];
      filesToRead = allFiles
        .filter((p) => common.some((n) => p === n || p.endsWith(`/${n}`)))
        .slice(0, 5);
    }

    if (filesToRead.length === 0) {
      return NextResponse.json(
        { success: false, error: "Could not identify relevant files. Please click files in the file tree to add context manually." },
        { status: 422 }
      );
    }

    // ── Fetch file contents in parallel ──────────────────────────────────────
    const fetchedFiles: Record<string, string> = {};
    await Promise.all(
      filesToRead.map(async (filePath) => {
        const content = await fetchFileContent(owner, repo, branch, filePath, token);
        if (content) fetchedFiles[filePath] = content;
      })
    );

    if (Object.keys(fetchedFiles).length === 0) {
      return NextResponse.json({ error: "Could not fetch file contents from repository." }, { status: 502 });
    }

    // Phase 5 Step 6: always prefer the latest local accumulated session state
    // so prompts build on prior applied changes (including created files).
    if (accumulatedChanges && typeof accumulatedChanges === "object") {
      for (const [filePath, content] of Object.entries(accumulatedChanges)) {
        if (typeof content === "string") {
          fetchedFiles[filePath] = content;
        }
      }
    }

    // ── Pass 2: AI code modification ──────────────────────────────────────────
    const context = projectContext ?? `Repo: ${repoFullName}, Branch: ${branch}`;
    const isLarge = Object.keys(fetchedFiles).length > 5;

    const userMsg = `Project context: ${context}

Files:
${Object.entries(fetchedFiles).map(([p, c]) => `=== ${p} ===\n${c}`).join("\n\n")}

User request: ${prompt}

Return modified files as JSON.`;

    const modifyText = await callAI(
      [
        { role: "system", content: MODIFY_PROMPT },
        { role: "user", content: userMsg },
      ],
      { model: isLarge ? "agent" : "primary", overrideProvider, overrideModel }
    );

    let clean = modifyText.trim();
    const fence = clean.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) clean = fence[1].trim();

    const rawChanges = JSON.parse(clean) as unknown;
    if (
      typeof rawChanges !== "object" || rawChanges === null ||
      Array.isArray(rawChanges) || Object.keys(rawChanges as object).length === 0
    ) {
      return NextResponse.json({ success: false, error: "AI returned an empty or invalid response." }, { status: 502 });
    }
    const changeMap = rawChanges as Record<string, string>;
    for (const v of Object.values(changeMap)) {
      if (typeof v !== "string") {
        return NextResponse.json({ success: false, error: "AI returned non-string file contents." }, { status: 502 });
      }
    }

    const { modifiedFiles, createdFiles } = splitChanges(changeMap);

    const formatted: Record<string, string> = {};
    for (const [fp, content] of Object.entries(modifiedFiles)) {
      formatted[fp] = await formatFile(fp, content);
    }

    const safeModified = Object.fromEntries(
      Object.entries(formatted).filter(([filePath]) => !isEnvPath(filePath))
    );
    const safeCreated = Object.fromEntries(
      Object.entries(createdFiles).filter(([filePath]) => !isEnvPath(filePath))
    );
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

    // ── Persist to Supabase ───────────────────────────────────────────────────
    let resolvedSessionId: string | undefined;

    if (sessionId) {
      const { data: existing } = await supabase
        .from("ai_sessions")
        .select("accumulated_changes")
        .eq("id", sessionId)
        .eq("user_id", user.id)
        .single();

      const prevAccum =
        existing?.accumulated_changes && typeof existing.accumulated_changes === "object"
          ? (existing.accumulated_changes as Record<string, string>)
          : {};

      await supabase
        .from("ai_sessions")
        .update({
          status: "active",
          changes: allChanges,
          accumulated_changes: { ...prevAccum, ...allChanges },
          prompt,
          llm_provider: overrideProvider ?? null,
          llm_model: overrideModel ?? null,
        })
        .eq("id", sessionId)
        .eq("user_id", user.id);

      resolvedSessionId = sessionId;
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

      if (!insErr && newSession?.id) {
        resolvedSessionId = newSession.id;
      }
    }

    if (resolvedSessionId && Object.keys(safeCreated).length > 0) {
      await supabase.from("created_files").insert(
        Object.entries(safeCreated).map(([fp, content]) => ({
          session_id: resolvedSessionId,
          project_id: projectId ?? null,
          file_path: fp,
          content,
          is_env_file: false,
          committed: false,
        }))
      );
    }

    return NextResponse.json({
      success: true,
      changes: allChanges,
      modifiedFiles: safeModified,
      createdFiles: safeCreated,
      fetchedFiles,
      filesAnalyzed: filesToRead,
      sessionId: resolvedSessionId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Whole-project AI analysis failed";
    console.error("whole-project route error:", err);
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
