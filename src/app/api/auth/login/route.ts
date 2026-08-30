import bcrypt from "bcryptjs";
import User from "@/lib/models/User";
import { connectDB } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";
import { rateLimit } from "@/lib/rateLimit";
import { setSessionCookie, signSessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rate = rateLimit(request, { limit: 10, windowMs: 60 * 1000 });
  if (!rate.ok) {
    return jsonError("Too many login attempts. Please try again later.", 429, {
      retryAfter: rate.retryAfter,
    });
  }

  let body: { identifier?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.");
  }

  const { identifier, password } = body;

  if (!identifier || !identifier.trim())
    return jsonError("Email or username is required.");
  if (!password || !password.trim())
    return jsonError("Password is required.");

  try {
    await connectDB();

    const id = identifier.trim().toLowerCase();
    const user = await User.findOne({
      $or: [{ email: id }, { username: id }],
    });

    if (!user || !user.passwordHash) {
      return jsonError("Invalid credentials.", 401);
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return jsonError("Invalid credentials.", 401);
    }

    const token = signSessionToken(user.id);
    await setSessionCookie(token);

    return jsonOk({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role ?? "customer",
        verified: user.verified ?? false,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
