import bcrypt from "bcryptjs";
import User from "@/lib/models/User";
import { connectDB } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";
import { rateLimit } from "@/lib/rateLimit";
import { emailServiceConfigured, sendEmail } from "@/lib/email";
import { ROLES } from "@/lib/authz";
import {
  expiresInMinutes,
  generateOtp,
  hashToken,
  setSessionCookie,
  signSessionToken,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

function isDuplicateError(err: unknown): boolean {
  if (err && typeof err === "object" && "code" in err) {
    return (err as { code?: number }).code === 11000;
  }
  return false;
}

export async function POST(request: Request) {
  const rate = rateLimit(request, { limit: 10, windowMs: 60 * 1000 });
  if (!rate.ok) {
    return jsonError("Too many attempts. Please try again later.", 429, {
      retryAfter: rate.retryAfter,
    });
  }

  let body: {
    name?: string;
    username?: string;
    email?: string;
    password?: string;
    role?: string;
  };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.");
  }

  const { name, username, email, password } = body;

  if (!name || !name.trim()) return jsonError("Name is required.");
  if (!username || !username.trim())
    return jsonError("Username is required.");
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username.trim()))
    return jsonError(
      "Username must be 3-20 characters and can only contain letters, numbers and underscores."
    );
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    return jsonError("A valid email is required.");
  if (!password || password.length < 8)
    return jsonError("Password must be at least 8 characters long.");

  // Demo mode: a signup may request a specific role, but only when not in
  // production (or when ALLOW_SELF_ROLE=true is explicitly set). This keeps
  // public signups safe in production while letting judges demo quickly.
  const allowSelfRole =
    process.env.NODE_ENV !== "production" ||
    process.env.ALLOW_SELF_ROLE === "true";

  let role: "customer" | "agent" | "admin" = "customer";
  if (body.role !== undefined) {
    if (
      typeof body.role !== "string" ||
      !(ROLES as readonly string[]).includes(body.role)
    ) {
      return jsonError("Invalid role.");
    }
    if (allowSelfRole) role = body.role as "customer" | "agent" | "admin";
  }

  try {
    await connectDB();

    const existing = await User.findOne({
      $or: [
        { username: username.trim().toLowerCase() },
        { email: email.trim().toLowerCase() },
      ],
    });

    if (existing) {
      return jsonError(
        existing.email === email.trim().toLowerCase()
          ? "An account with this email already exists."
          : "This username is already taken."
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      passwordHash,
      provider: "credentials",
      role,
      verified: false,
    });

    const otp = generateOtp();
    user.emailOtpHash = hashToken(otp, user.id);
    user.emailOtpExpires = expiresInMinutes(10);
    await user.save();

    const token = signSessionToken(user.id);
    await setSessionCookie(token);

    const appName = process.env.APP_NAME || "Auth";
    await sendEmail({
      to: user.email ?? email.trim().toLowerCase(),
      subject: `Your ${appName} verification code`,
      text: `Welcome to ${appName}! Your verification code is ${otp}. It expires in 10 minutes.`,
    });

    return jsonOk({
      needsVerification: true,
      devOtp: emailServiceConfigured() ? undefined : otp,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role ?? "customer",
        verified: false,
      },
    });
  } catch (err) {
    if (isDuplicateError(err)) {
      return jsonError("That email or username is already in use.");
    }
    console.error("Signup error:", err);
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
