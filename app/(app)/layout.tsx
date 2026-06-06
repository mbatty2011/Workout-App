import { redirect } from "next/navigation";
import { getCurrentProfile, getUserId } from "@/modules/auth/queries";
import { BottomNav } from "@/components/BottomNav";

/**
 * Authenticated shell. Guarantees the user is signed in (middleware also
 * enforces this) and has completed onboarding before any feature renders.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await getUserId())) redirect("/login");
  if (!(await getCurrentProfile())) redirect("/onboarding");

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <div className="flex-1 px-4 pb-6 pt-6">{children}</div>
      <BottomNav />
    </div>
  );
}
