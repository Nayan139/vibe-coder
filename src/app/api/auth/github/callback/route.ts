import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

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

  // Exchange code for GitHub access token
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  if (!tokenRes.ok) {
    console.error("GitHub token exchange failed:", await tokenRes.text());
    return NextResponse.redirect(`${appUrl}/dashboard?error=token_exchange_failed`);
  }

  const tokenData = await tokenRes.json();
  const accessToken: string = tokenData.access_token;

  if (!accessToken || tokenData.error) {
    console.error("GitHub token error:", tokenData.error_description ?? tokenData.error);
    return NextResponse.redirect(`${appUrl}/dashboard?error=no_access_token`);
  }

  // Fetch GitHub user profile
  const userRes = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": "VibeCode" },
  });

  if (!userRes.ok) {
    return NextResponse.redirect(`${appUrl}/dashboard?error=github_user_fetch_failed`);
  }

  const githubUser = await userRes.json();

  // Save connection to Supabase using service role (bypasses RLS)
  const supabase = createServiceClient();

  // Delete any existing GitHub connection for this user before inserting
  await supabase
    .from("git_connections")
    .delete()
    .eq("user_id", userId)
    .eq("provider", "github");

  const { error } = await supabase.from("git_connections").insert({
    user_id: userId,
    provider: "github",
    access_token: accessToken,
    username: githubUser.login,
    avatar_url: githubUser.avatar_url,
  });

  if (error) {
    console.error("Failed to save GitHub connection:", error);
    return NextResponse.redirect(`${appUrl}/dashboard?error=db_save_failed`);
  }

  return NextResponse.redirect(`${appUrl}/dashboard?connected=github`);
}
