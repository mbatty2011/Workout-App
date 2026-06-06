"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Unit } from "@/lib/database.types";

/** Email magic-link / password sign in + sign up. */
export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  redirect("/");
}

export async function signUpWithPassword(formData: FormData) {
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };
  // After sign-up the user still needs to set username/units.
  redirect("/onboarding");
}

/** Update editable profile fields + preferences (spec §5.1). */
export async function updateProfileSettings(input: {
  display_name: string;
  bio: string;
  unit: Unit;
  is_private: boolean;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: input.display_name.trim() || null,
      bio: input.bio.trim() || null,
      unit: input.unit,
      is_private: input.is_private,
    })
    .eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return {};
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * First-login onboarding: force a username + unit preference (spec §5.1).
 * Creates the profile row. If a minor flag is set, the account is private by
 * default and follow-approval is required (spec §7).
 */
export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const username = String(formData.get("username")).trim().toLowerCase();
  const unit = (String(formData.get("unit")) as Unit) || "kg";
  const isMinor = formData.get("is_minor") === "on";

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return { error: "Username must be 3–20 chars: letters, numbers, underscore." };
  }

  const { error } = await supabase.from("profiles").insert({
    id: user.id,
    username,
    display_name: username,
    unit,
    is_minor: isMinor,
    is_private: isMinor, // minors default to private
  });

  if (error) {
    if (error.code === "23505") return { error: "That username is taken." };
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/");
}
