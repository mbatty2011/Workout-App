import { redirect } from "next/navigation";
import { BRAND } from "@/config/brand";
import { getCurrentProfile, getUserId } from "@/modules/auth/queries";
import { OnboardingForm } from "@/modules/auth/components/OnboardingForm";

export default async function OnboardingPage() {
  if (!(await getUserId())) redirect("/login");
  // Already onboarded -> home.
  if (await getCurrentProfile()) redirect("/");

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold">Welcome to {BRAND.name}</h1>
      <p className="mb-6 mt-1 text-muted">
        Pick a username and your units. You can change these later.
      </p>
      <OnboardingForm />
    </main>
  );
}
