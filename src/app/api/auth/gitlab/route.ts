import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAppUrl } from "@/lib/app-url";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const appUrl = getAppUrl(request);

  if (!user) {
    return NextResponse.redirect(new URL("/login", appUrl));
  }

  if (!process.env.GITLAB_CLIENT_ID) {
    return NextResponse.redirect(`${appUrl}/dashboard?error=gitlab_not_configured`);
  }

  const state = Buffer.from(user.id).toString("base64url");

  const params = new URLSearchParams({
    client_id: process.env.GITLAB_CLIENT_ID,
    redirect_uri: `${appUrl}/api/auth/gitlab/callback`,
    response_type: "code",
    scope: "api read_user read_repository write_repository",
    state,
  });

  return NextResponse.redirect(`https://gitlab.com/oauth/authorize?${params}`);
}
