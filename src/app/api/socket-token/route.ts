import { jsonError, jsonOk } from "@/lib/api";
import { getSessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Returns the raw session JWT so the browser can authenticate its
 * Socket.IO connection (the cookie itself is httpOnly, so browsers can't
 * read it for a cross-origin websocket).
 */
export async function GET() {
  const token = await getSessionToken();
  if (!token) return jsonError("Not authenticated.", 401);
  return jsonOk({ token });
}