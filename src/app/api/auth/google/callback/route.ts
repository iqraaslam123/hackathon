import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import User from "@/lib/models/User";
import { connectDB } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";
import { setSessionCookie, signSessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

function redirectHost(request: NextRequest): string {
  return new URL(request.url).origin;
}

export async function GET(request: NextRequest) {
  const rate = rateLimit(request, { limit: 10, windowMs: 60 * 1000 });
  if (!rate.ok) {
    return NextResponse.redirect(
      new URL("/login?error=too_many_attempts", request.url)
    );
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=google_auth_failed", request.url)
    );
  }

  try {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return NextResponse.redirect(
        new URL("/login?error=google_not_configured", request.url)
      );
    }

    const redirectUri = `${redirectHost(request)}/api/auth/google/callback`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const idToken = tokenData.id_token as string | undefined;

    if (!accessToken) {
      return NextResponse.redirect(
        new URL("/login?error=google_auth_failed", request.url)
      );
    }

    let profile: {
      sub: string;
      email: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    } = {
      sub: "",
      email: "",
    };

    if (idToken) {
      const payload = idToken.split(".")[1];
      if (payload) {
        const json = Buffer.from(
          payload.replace(/-/g, "+").replace(/_/g, "/"),
          "base64"
        ).toString("utf8");
        profile = { ...profile, ...JSON.parse(json) };
      }
    } else {
      const infoRes = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (infoRes.ok) {
        profile = { ...profile, ...(await infoRes.json()) };
      }
    }

    if (!profile.sub || !profile.email) {
      return NextResponse.redirect(
        new URL("/login?error=google_auth_failed", request.url)
      );
    }

    await connectDB();

    let user = await User.findOne({ googleId: profile.sub });

    if (!user) {
      user = await User.findOne({ email: profile.email.toLowerCase() });
    }

    if (!user) {
      user = await User.create({
        name: profile.name || profile.email.split("@")[0],
        username: profile.email.split("@")[0],
        email: profile.email.toLowerCase(),
        googleId: profile.sub,
        provider: "google",
        verified: profile.email_verified ?? true,
      });
    } else {
      if (!user.googleId) {
        user.googleId = profile.sub;
        user.provider = "google";
        user.verified = true;
      }
      await user.save();
    }

    const token = signSessionToken(user.id);
    await setSessionCookie(token);

    return NextResponse.redirect(
      new URL("/dashboard", request.url)
    );
  } catch (err) {
    console.error("Google callback error:", err);
    return NextResponse.redirect(
      new URL("/login?error=google_auth_failed", request.url)
    );
  }
}
