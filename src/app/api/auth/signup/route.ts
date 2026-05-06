import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    const msg = error.message?.toLowerCase() ?? "";
    if (msg.includes("already registered") || msg.includes("already been registered")) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ userId: data.user.id }, { status: 201 });
}
