import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAppUrl } from "@/lib/app-url";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const appUrl = getAppUrl(request);

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/dashboard?error=missing_params`);
  }

  let userId: string;
  try {
    userId = Buffer.from(state, "base64url").toString();
    if (!userId) throw new Error("empty");
  } catch {
    return NextResponse.redirect(`${appUrl}/dashboard?error=invalid_state`);
  }

  const tokenParams = new URLSearchParams({
    client_id: process.env.GITLAB_CLIENT_ID ?? "",
    client_secret: process.env.GITLAB_CLIENT_SECRET ?? "",
    code,
    grant_type: "authorization_code",
    redirect_uri: `${appUrl}/api/auth/gitlab/callback`,
  });

  const tokenRes = await fetch("https://gitlab.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenParams.toString(),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${appUrl}/dashboard?error=token_exchange_failed`);
  }

  const { access_token: accessToken } = await tokenRes.json();

  if (!accessToken) {
    return NextResponse.redirect(`${appUrl}/dashboard?error=no_access_token`);
  }

  const userRes = await fetch("https://gitlab.com/api/v4/user", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!userRes.ok) {
    return NextResponse.redirect(`${appUrl}/dashboard?error=gitlab_user_fetch_failed`);
  }

  const gitlabUser = await userRes.json();

  const supabase = createServiceClient();
  await supabase.from("git_connections").delete().eq("user_id", userId).eq("provider", "gitlab");

  const { error } = await supabase.from("git_connections").insert({
    user_id: userId,
    provider: "gitlab",
    access_token: accessToken,
    username: gitlabUser.username,
    avatar_url: gitlabUser.avatar_url,
  });

  if (error) {
    console.error("Failed to save GitLab connection:", error);
    return NextResponse.redirect(`${appUrl}/dashboard?error=db_save_failed`);
  }

  return NextResponse.redirect(`${appUrl}/dashboard?connected=gitlab`);
}
