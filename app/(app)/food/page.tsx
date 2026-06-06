import { redirect } from "next/navigation";
import { FEATURES } from "@/config/features";
import { getTodaysFoodLogs, MEALS } from "@/modules/food/queries";
import { getMacroPlan } from "@/modules/goals/queries";
import { FoodInput } from "@/modules/food/components/FoodInput";
import { DeleteLogButton } from "@/modules/food/components/DeleteLogButton";
import { MacroPlan } from "@/modules/goals/components/MacroPlan";
import { Card, PageHeader } from "@/components/ui";

export default async function FoodPage() {
  if (!FEATURES.foodTracker) redirect("/");

  const logs = await getTodaysFoodLogs();
  const macroPlan = FEATURES.weightGoals
    ? await getMacroPlan()
    : { calories: null, protein: null, carbs: null, fat: null, hasPlan: false };

  return (
    <div className="space-y-5">
      <PageHeader title="Food" subtitle="Track your diet against a plan." />

      {FEATURES.weightGoals && <MacroPlan plan={macroPlan} />}

      <FoodInput />

      {MEALS.map((meal) => {
        const mealLogs = logs.filter((l) => l.meal === meal);
        if (mealLogs.length === 0) return null;
        return (
          <section key={meal}>
            <h2 className="mb-2 text-sm font-medium capitalize text-muted">{meal}</h2>
            <div className="space-y-1">
              {mealLogs.map((log) => (
                <Card key={log.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{log.food?.name}</p>
                    <p className="tabular text-xs text-muted">
                      {log.servings} × · {Math.round((log.food?.calories ?? 0) * log.servings)} kcal ·{" "}
                      {Math.round((log.food?.protein_g ?? 0) * log.servings)}g protein
                    </p>
                  </div>
                  <DeleteLogButton id={log.id} />
                </Card>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
