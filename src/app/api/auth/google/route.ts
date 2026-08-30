import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";

export const dynamic = "force-dynamic";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_REDIRECT_URI = process.env.APP_URL ?? "";

export async function GET() {
  if (!GOOGLE_CLIENT_ID) {
    return jsonError(
      "Google sign-in is not configured. Set GOOGLE_CLIENT_ID in your environment.",
      501
    );
  }

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: `${GOOGLE_REDIRECT_URI}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account",
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
