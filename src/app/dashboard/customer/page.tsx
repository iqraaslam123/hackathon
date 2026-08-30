import { redirect } from "next/navigation";
import User from "@/lib/models/User";
import { connectDB } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { CustomerDashboard } from "@/components/dashboard/CustomerDashboard";

export const dynamic = "force-dynamic";

export default async function CustomerDashboardPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  await connectDB();
  const user = await User.findById(userId).lean();
  if (!user) redirect("/login");

  if ((user.role ?? "customer") !== "customer") {
    redirect(user.role === "agent" ? "/dashboard/agent" : "/dashboard/admin");
  }

  return (
    <CustomerDashboard
      user={{
        name: user.name,
        email: user.email ?? null,
      }}
    />
  );
}