import bcrypt from "bcryptjs";
import User from "@/lib/models/User";
import { connectDB } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";
import { rateLimit } from "@/lib/rateLimit";
import {
  hashToken,
  setSessionCookie,
  signSessionToken,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rate = rateLimit(request, { limit: 5, windowMs: 60 * 1000 });
  if (!rate.ok) {
    return jsonError("Too many attempts. Please try again later.", 429, {
      retryAfter: rate.retryAfter,
    });
  }

  let body: { token?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.");
  }

  const token = body.token?.trim() ?? "";
  const password = body.password ?? "";

  if (!token) return jsonError("Reset token is required.");
  if (!password || password.length < 8)
    return jsonError("Password must be at least 8 characters long.");

  try {
    await connectDB();

    const users = await User.find({
      resetTokenHash: { $ne: null },
      resetTokenExpires: { $ne: null },
    });

    const user = users.find((u) => {
      if (!u.resetTokenHash || !u.resetTokenExpires) return false;
      const salt = u.id;
      return (
        u.resetTokenHash === hashToken(token, salt) &&
        u.resetTokenExpires!.getTime() > Date.now()
      );
    });

    if (!user) {
      return jsonError(
        "This reset link is invalid or has expired. Please request a new one.",
        400
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    user.passwordHash = passwordHash;
    user.resetTokenHash = null;
    user.resetTokenExpires = null;
    await user.save();

    const sessionToken = signSessionToken(user.id);
    await setSessionCookie(sessionToken);

    return jsonOk({ message: "Password reset successfully. You are now logged in." });
  } catch (err) {
    console.error("Reset password error:", err);
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
