import { redirect } from "next/navigation";
import User from "@/lib/models/User";
import { connectDB } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { AgentDashboard } from "@/components/dashboard/AgentDashboard";

export const dynamic = "force-dynamic";

export default async function AgentDashboardPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  await connectDB();
  const user = await User.findById(userId).lean();
  if (!user) redirect("/login");

  if ((user.role ?? "customer") !== "agent") {
    redirect(user.role === "admin" ? "/dashboard/admin" : "/dashboard/customer");
  }

  return (
    <AgentDashboard
      user={{
        id: user._id.toString(),
        name: user.name,
        email: user.email ?? null,
      }}
    />
  );
}