import User from "@/lib/models/User";
import { connectDB } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";
import { getSessionUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError("Not authenticated.", 401);
  }

  try {
    await connectDB();
    const user = await User.findById(userId).lean();

    if (!user) {
      return jsonError("User not found.", 404);
    }

    return jsonOk({
      user: {
        id: user._id.toString(),
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role ?? "customer",
        verified: user.verified ?? false,
        provider: user.provider,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("Me error:", err);
    return jsonError("Something went wrong.", 500);
  }
}
