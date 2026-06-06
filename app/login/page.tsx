import { redirect } from "next/navigation";
import { BRAND } from "@/config/brand";
import { getUserId } from "@/modules/auth/queries";
import { AuthForm } from "@/modules/auth/components/AuthForm";

export default async function LoginPage() {
  // Already signed in? Skip the form.
  if (await getUserId()) redirect("/");

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <div className="mb-8">
        <h1 className="text-4xl font-semibold lowercase tracking-tight text-accent">
          {BRAND.name}
        </h1>
        <p className="mt-1 text-muted">{BRAND.tagline}</p>
      </div>
      <AuthForm />
    </main>
  );
}
