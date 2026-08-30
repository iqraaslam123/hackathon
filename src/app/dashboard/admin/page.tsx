import { redirect } from "next/navigation";
import User from "@/lib/models/User";
import { connectDB } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  await connectDB();
  const user = await User.findById(userId).lean();
  if (!user) redirect("/login");

  if ((user.role ?? "customer") !== "admin") {
    redirect(user.role === "agent" ? "/dashboard/agent" : "/dashboard/customer");
  }

  return (
    <AdminDashboard
      user={{
        name: user.name,
        email: user.email ?? null,
      }}
    />
  );
}