import User from "@/lib/models/User";
import { connectDB } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";
import { getSessionUserId, hashToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { otp?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.");
  }

  const otp = body?.otp?.trim() ?? "";
  if (!/^[0-9]{6}$/.test(otp)) {
    return jsonError("Enter the 6-digit code from your email.");
  }

  try {
    await connectDB();

    const userId = await getSessionUserId();
    if (!userId) return jsonError("Sign in is required to verify an email.", 401);

    const user = await User.findById(userId);
    if (!user) return jsonError("User not found.", 404);
    if (user.verified) return jsonError("Your email is already verified.");
    if (!user.email || !user.emailOtpHash || !user.emailOtpExpires) {
      return jsonError("No verification code found. Request a new code first.");
    }

    if (user.emailOtpExpires.getTime() < Date.now()) {
      user.emailOtpHash = null;
      user.emailOtpExpires = null;
      await user.save();
      return jsonError("The code has expired. Request a new one.");
    }

    if (user.emailOtpHash !== hashToken(otp, user.id)) {
      return jsonError("The code is incorrect. Please try again.");
    }

    user.verified = true;
    user.emailOtpHash = null;
    user.emailOtpExpires = null;
    await user.save();

    return jsonOk({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        verified: true,
      },
    });
  } catch (err) {
    console.error("Verify email OTP error:", err);
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
