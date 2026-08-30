import User from "@/lib/models/User";
import { connectDB } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

export const ROLES = ["customer", "agent", "admin"] as const;

export type AuthRole = (typeof ROLES)[number];

export type AuthUser = {
  id: string;
  name: string;
  username?: string | null;
  email?: string | null;
  role: AuthRole;
  verified?: boolean;
};

/**
 * Resolves the currently authenticated user from the session cookie.
 * Returns null when the user is not logged in or no longer exists.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  await connectDB();
  const user = await User.findById(userId).lean();
  if (!user) return null;

  return {
    id: user._id.toString(),
    name: user.name,
    username: user.username ?? null,
    email: user.email ?? null,
    role: (ROLES as readonly string[]).includes(user.role)
      ? (user.role as AuthRole)
      : "customer",
    verified: user.verified ?? false,
  };
}

export function hasRole(
  user: Pick<AuthUser, "role"> | null | undefined,
  roles: AuthRole[]
): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}