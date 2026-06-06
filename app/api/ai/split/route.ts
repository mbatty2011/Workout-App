import { NextResponse } from "next/server";
import { FEATURES } from "@/config/features";
import { createClient } from "@/lib/supabase/server";
import { getPopularContext } from "@/modules/ai/queries";
import { AnthropicSplitProvider } from "@/modules/ai/adapters/anthropic";
import type { SplitRequest } from "@/modules/ai/types";

/**
 * Server route that generates a split. The Anthropic key stays server-side
 * (spec §2). The AI only *suggests* — saving happens client-side after the user
 * confirms (spec §5.7 guardrail).
 */
export async function POST(request: Request) {
  if (!FEATURES.aiSplitHelper) {
    return NextResponse.json({ error: "Feature disabled" }, { status: 404 });
  }

  // Require an authenticated user.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: SplitRequest;
  try {
    body = (await request.json()) as SplitRequest;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!body.daysPerWeek || body.daysPerWeek < 1 || body.daysPerWeek > 7) {
    return NextResponse.json({ error: "daysPerWeek must be 1–7" }, { status: 400 });
  }

  try {
    const popular = await getPopularContext();
    const provider = new AnthropicSplitProvider();
    const split = await provider.generateSplit(body, popular);
    return NextResponse.json({ split });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI request failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
