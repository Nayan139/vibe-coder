import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL!));
  }

  if (!process.env.GITLAB_CLIENT_ID) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=gitlab_not_configured`);
  }

  const state = Buffer.from(user.id).toString("base64url");

  const params = new URLSearchParams({
    client_id: process.env.GITLAB_CLIENT_ID,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/gitlab/callback`,
    response_type: "code",
    scope: "api read_user read_repository write_repository",
    state,
  });

  return NextResponse.redirect(`https://gitlab.com/oauth/authorize?${params}`);
}
