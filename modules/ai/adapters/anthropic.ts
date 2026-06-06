import Anthropic from "@anthropic-ai/sdk";
import type {
  AISplitProvider,
  GeneratedSplit,
  PopularContext,
  SplitRequest,
} from "@/modules/ai/types";

/**
 * Anthropic implementation of the AISplitProvider adapter. SERVER ONLY — the
 * key is never exposed to the client (spec §2). Uses a tool definition to force
 * a structured, parseable routine back.
 */
export class AnthropicSplitProvider implements AISplitProvider {
  private client: Anthropic;

  constructor(apiKey = process.env.ANTHROPIC_API_KEY) {
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    this.client = new Anthropic({ apiKey });
  }

  async generateSplit(
    request: SplitRequest,
    popular: PopularContext[],
  ): Promise<GeneratedSplit> {
    const popularList = popular
      .slice(0, 40)
      .map((p) => `${p.exercise_name} (${p.muscle_group}) — used ${p.usage_count}×`)
      .join("\n");

    const tool: Anthropic.Tool = {
      name: "propose_split",
      description: "Return a structured training split the user can save and edit.",
      input_schema: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          days: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                exercises: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      target_sets: { type: "integer" },
                      target_reps: { type: "integer" },
                    },
                    required: ["name", "target_sets", "target_reps"],
                  },
                },
              },
              required: ["name", "exercises"],
            },
          },
        },
        required: ["name", "description", "days"],
      },
    };

    const message = await this.client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      tools: [tool],
      tool_choice: { type: "tool", name: "propose_split" },
      messages: [
        {
          role: "user",
          content: `Design a ${request.daysPerWeek}-day training split.
Goal: ${request.goal}. Experience: ${request.experience}.
Available equipment: ${request.equipment.join(", ") || "full gym"}.

Ground your choices in what people actually use. Here are the most common
exercises across public routines (anonymized, aggregated). Prefer these where
they fit the goal and available equipment, but you may add standard staples:

${popularList || "(no aggregated data yet — use well-established staples)"}

Keep it realistic for the experience level. Use only exercises achievable with
the available equipment. Name each day by its focus (e.g. Push, Pull, Legs,
Upper, Lower).`,
        },
      ],
    });

    const toolUse = message.content.find(
      (c): c is Anthropic.ToolUseBlock => c.type === "tool_use",
    );
    if (!toolUse) throw new Error("AI did not return a structured split");
    return toolUse.input as GeneratedSplit;
  }
}
