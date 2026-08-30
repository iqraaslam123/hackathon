import { redirect } from "next/navigation";
import User from "@/lib/models/User";
import { connectDB } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  await connectDB();
  const user = await User.findById(userId).lean();
  if (!user) redirect("/login");

  const role = user.role ?? "customer";

  if (role === "admin") redirect("/dashboard/admin");
  if (role === "agent") redirect("/dashboard/agent");
  redirect("/dashboard/customer");
}