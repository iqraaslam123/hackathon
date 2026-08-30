import bcrypt from "bcryptjs";
import User from "@/lib/models/User";
import { connectDB } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";
import { getSessionUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  let body: {
    name?: string;
    username?: string;
    email?: string;
    currentPassword?: string;
    newPassword?: string;
  };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.");
  }

  try {
    await connectDB();

    const userId = await getSessionUserId();
    if (!userId) return jsonError("Not authenticated.", 401);

    const user = await User.findById(userId);
    if (!user) return jsonError("User not found.", 404);

    const name = body.name?.trim();
    const username = body.username?.trim().toLowerCase();
    const email = body.email?.trim().toLowerCase();

    if (name !== undefined) {
      if (!name) return jsonError("Name cannot be empty.");
      user.name = name;
    }

    if (username !== undefined) {
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username))
        return jsonError(
          "Username must be 3-20 characters and can only contain letters, numbers and underscores."
        );
      const taken = await User.findOne({
        username,
        _id: { $ne: user._id },
      });
      if (taken) return jsonError("This username is already taken.");
      user.username = username;
    }

    const isStandaloneEmailChange = email !== undefined && email !== user.email;
    if (email !== undefined) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return jsonError("A valid email is required.");
      const taken = await User.findOne({
        email,
        _id: { $ne: user._id },
      });
      if (taken) return jsonError("This email is already in use.");
      if (isStandaloneEmailChange) {
        user.email = email;
        user.verified = false;
        user.emailOtpHash = null;
        user.emailOtpExpires = null;
      }
    }

    const { currentPassword, newPassword } = body;
    if (newPassword) {
      if (!currentPassword)
        return jsonError("Enter your current password to set a new one.");
      if (newPassword.length < 8)
        return jsonError("New password must be at least 8 characters.");
      if (!user.passwordHash)
        return jsonError("Your account has no password to change.");
      const ok = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!ok) return jsonError("Current password is incorrect.");
      user.passwordHash = await bcrypt.hash(newPassword, 12);
    }

    await user.save();

    return jsonOk({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role ?? "customer",
        verified: user.verified,
        provider: user.provider,
      },
      needsEmailVerification: isStandaloneEmailChange && !user.verified,
    });
  } catch (err) {
    if (err && typeof err === "object" && (err as { code?: number }).code === 11000) {
      return jsonError("That email or username is already in use.");
    }
    console.error("Profile update error:", err);
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
