import Anthropic from "@anthropic-ai/sdk";

/** Macros read off a nutrition label, plus a short plan-fit verdict. */
export interface ScannedNutrition {
  name: string;
  serving: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  confidence: "high" | "medium" | "low";
  /** One short sentence: does this fit what's left in the day's plan? */
  verdict: string;
}

export interface PlanContext {
  remainingCalories: number | null;
  remainingProtein: number | null;
  calorieTarget: number | null;
  proteinTarget: number | null;
}

type ImageMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

/**
 * Reads a photo of a nutrition label with Claude vision and returns structured
 * macros (per serving) plus a plan-fit verdict. SERVER ONLY — the key never
 * reaches the client (spec §2).
 */
export class NutritionVisionProvider {
  private client: Anthropic;

  constructor(apiKey = process.env.ANTHROPIC_API_KEY) {
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    this.client = new Anthropic({ apiKey });
  }

  async scan(
    imageBase64: string,
    mediaType: ImageMediaType,
    plan: PlanContext,
  ): Promise<ScannedNutrition> {
    const tool: Anthropic.Tool = {
      name: "record_nutrition",
      description: "Record the nutrition facts read from the label photo.",
      input_schema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Best guess of the food/product name." },
          serving: { type: "string", description: "Serving size shown, e.g. '1 bar (40g)'." },
          calories: { type: ["number", "null"], description: "kcal per serving." },
          protein_g: { type: ["number", "null"] },
          carbs_g: { type: ["number", "null"] },
          fat_g: { type: ["number", "null"] },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          verdict: {
            type: "string",
            description:
              "One short, friendly sentence on whether this fits the remaining daily plan.",
          },
        },
        required: ["name", "serving", "calories", "protein_g", "confidence", "verdict"],
      },
    };

    const planLine =
      plan.calorieTarget || plan.proteinTarget
        ? `The user's plan today: ${plan.remainingCalories ?? "?"} kcal and ${plan.remainingProtein ?? "?"}g protein remaining (targets: ${plan.calorieTarget ?? "none"} kcal, ${plan.proteinTarget ?? "none"}g protein). In 'verdict', say in one sentence whether one serving fits what's left.`
        : `The user has no calorie/protein goal set. In 'verdict', give a one-sentence neutral note about the item's macros.`;

    const message = await this.client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 700,
      tools: [tool],
      tool_choice: { type: "tool", name: "record_nutrition" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: imageBase64 },
            },
            {
              type: "text",
              text: `Read the nutrition facts panel in this photo. Report the values PER SERVING (not per container). If a number is unreadable, use null and lower the confidence. ${planLine}`,
            },
          ],
        },
      ],
    });

    const toolUse = message.content.find(
      (c): c is Anthropic.ToolUseBlock => c.type === "tool_use",
    );
    if (!toolUse) throw new Error("Could not read the label");
    const out = toolUse.input as Partial<ScannedNutrition>;
    return {
      name: out.name?.trim() || "Scanned item",
      serving: out.serving?.trim() || "1 serving",
      calories: numOrNull(out.calories),
      protein_g: numOrNull(out.protein_g),
      carbs_g: numOrNull(out.carbs_g),
      fat_g: numOrNull(out.fat_g),
      confidence: out.confidence ?? "low",
      verdict: out.verdict?.trim() || "",
    };
  }
}

function numOrNull(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : null;
}
