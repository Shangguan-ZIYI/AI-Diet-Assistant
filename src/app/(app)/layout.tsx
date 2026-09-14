import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BottomNav } from "@/components/layout/BottomNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Verify user actually exists (handles stale session after DB reset)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });

  if (!user) {
    redirect("/api/auth/signout");
  }

  // No longer force-redirect to AI survey.
  // The home page handles incomplete profiles with clear UI states.

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {children}
      <BottomNav />
    </div>
  );
}
