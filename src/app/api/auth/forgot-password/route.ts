import User from "@/lib/models/User";
import { connectDB } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";
import { rateLimit } from "@/lib/rateLimit";
import { sendEmail } from "@/lib/email";
import {
  expiresInMinutes,
  generateResetToken,
  hashToken,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

async function sendResetEmail(email: string, token: string): Promise<void> {
  const base = process.env.APP_URL ?? "";
  const link = `${base}/forgot-password?token=${token}`;
  const appName = process.env.APP_NAME || "Auth";
  console.log(`[RESET] ${email} -> ${link}`);
  await sendEmail({
    to: email,
    subject: `Reset your ${appName} password`,
    text: `You requested a password reset for ${appName}. Click this link to reset your password:\n\n${link}\n\nThis link expires in 30 minutes. If you didn't request this, you can ignore this email.`,
  });
}

export async function POST(request: Request) {
  const rate = rateLimit(request, { limit: 5, windowMs: 10 * 60 * 1000 });
  if (!rate.ok) {
    return jsonError("Too many requests. Please wait a while.", 429, {
      retryAfter: rate.retryAfter,
    });
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.");
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonError("A valid email is required.");
  }

  try {
    await connectDB();
    const user = await User.findOne({ email });

    // Always respond the same way to avoid user enumeration.
    if (user) {
      const token = generateResetToken();
      const salt = user.id;
      user.resetTokenHash = hashToken(token, salt);
      user.resetTokenExpires = expiresInMinutes(30);
      await user.save();
      await sendResetEmail(email, token);
    }

    return jsonOk({
      message:
        "If an account exists for that email, a password reset link has been sent. Check the server console for the development link.",
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
