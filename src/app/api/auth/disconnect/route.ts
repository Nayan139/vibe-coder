import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SUPPORTED_PROVIDERS = new Set(["github", "gitlab"]);

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider");

  if (!provider || !SUPPORTED_PROVIDERS.has(provider)) {
    return NextResponse.json({ error: "Invalid provider." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { error } = await supabase
    .from("git_connections")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", provider);

  if (error) {
    console.error("Failed to disconnect provider:", error);
    return NextResponse.json({ error: "Failed to disconnect account." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
