import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

// GET — list all vars for this project (secret values masked to '••••••••')
export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("project_env_vars")
    .select("id, key, value, is_secret, updated_at")
    .eq("project_id", id)
    .eq("user_id", user.id)
    .order("key");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const masked = (data ?? []).map((v) => ({
    ...v,
    value: v.is_secret ? "••••••••" : v.value,
  }));

  return NextResponse.json({ vars: masked });
}

// POST — upsert a variable
export async function POST(req: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { key?: string; value?: string; is_secret?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { key, value, is_secret } = body;
  if (!key || typeof key !== "string" || !/^[A-Za-z0-9_]+$/.test(key)) {
    return NextResponse.json(
      { error: "Key must contain only letters, numbers, and underscores" },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("project_env_vars").upsert(
    {
      project_id: id,
      user_id: user.id,
      key: key.toUpperCase().trim(),
      value: value ?? "",
      is_secret: is_secret ?? false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "project_id,key" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE — remove a variable by key
export async function DELETE(req: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { key?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { key } = body;
  if (!key) return NextResponse.json({ error: "key is required" }, { status: 400 });

  const { error } = await supabase
    .from("project_env_vars")
    .delete()
    .eq("project_id", id)
    .eq("user_id", user.id)
    .eq("key", key);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
