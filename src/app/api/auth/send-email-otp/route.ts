import User from "@/lib/models/User";
import { connectDB } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";
import { rateLimit } from "@/lib/rateLimit";
import { emailServiceConfigured, sendEmail } from "@/lib/email";
import {
  expiresInMinutes,
  generateOtp,
  getSessionUserId,
  hashToken,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rate = rateLimit(request, { limit: 5, windowMs: 60 * 1000 });
  if (!rate.ok) {
    return jsonError("Too many requests. Please wait a moment.", 429, {
      retryAfter: rate.retryAfter,
    });
  }

  let email: string | undefined;
  try {
    const body = (await request.json()) as { email?: string };
    email = body?.email?.trim().toLowerCase();
  } catch {
    // ignore, fall back to session
  }

  try {
    await connectDB();

    let user = null;

    if (email) {
      user = await User.findOne({ email });
      if (!user) return jsonError("No account found with that email.");
    } else {
      const userId = await getSessionUserId();
      if (!userId) return jsonError("Sign in is required to verify an email.");
      user = await User.findById(userId);
    }

    if (!user) return jsonError("User not found.", 404);
    if (user.verified) return jsonError("Your email is already verified.");
    if (!user.email) return jsonError("This account has no email to verify.");

    const otp = generateOtp();
    user.emailOtpHash = hashToken(otp, user.id);
    user.emailOtpExpires = expiresInMinutes(10);
    await user.save();

    const appName = process.env.APP_NAME || "Auth";
    await sendEmail({
      to: user.email,
      subject: `Your ${appName} verification code`,
      text: `Your ${appName} verification code is ${otp}. It expires in 10 minutes.`,
    });

    return jsonOk({
      email: user.email,
      devOtp: emailServiceConfigured() ? undefined : otp,
      expiresInMinutes: 10,
    });
  } catch (err) {
    console.error("Send email OTP error:", err);
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
