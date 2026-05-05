import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    e2bConfigured: Boolean(process.env.E2B_API_KEY?.trim()),
  });
}
