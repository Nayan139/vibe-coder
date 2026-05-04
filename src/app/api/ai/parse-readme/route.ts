import { NextResponse } from "next/server";
import { callAI } from "@/lib/ai-client";

export async function POST(request: Request) {
  let readmeContent: string;
  try {
    ({ readmeContent } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!readmeContent || typeof readmeContent !== "string") {
    return NextResponse.json({ error: "readmeContent is required" }, { status: 400 });
  }

  try {
    const text = await callAI(
      [
        {
          role: "system",
          content:
            'You are a developer assistant. Extract setup commands from README files. Return ONLY valid JSON with no explanation, no markdown fences:\n{"install": "npm install", "start": "npm run dev", "notes": "any important setup notes"}',
        },
        {
          role: "user",
          content: `Extract the install and start commands from this README:\n\n${readmeContent.slice(0, 8000)}`,
        },
      ],
      { model: "primary" }
    );

    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return NextResponse.json({
        install: "npm install",
        start: "npm run dev",
        notes: "Could not parse README automatically.",
      });
    }
    const o = parsed as Record<string, unknown>;
    return NextResponse.json({
      install: typeof o.install === "string" ? o.install : "npm install",
      start: typeof o.start === "string" ? o.start : "npm run dev",
      notes: typeof o.notes === "string" ? o.notes : "",
    });
  } catch (err) {
    console.error("README parse error:", err);
    // Return sensible defaults rather than a hard failure
    return NextResponse.json({
      install: "npm install",
      start: "npm run dev",
      notes: "Could not parse README automatically.",
    });
  }
}
