import { redirect } from "next/navigation";
import { FEATURES } from "@/config/features";
import {
  getTodaysFoodLogs,
  computeTotals,
  MEALS,
} from "@/modules/food/queries";
import { getGoalsWithProgress } from "@/modules/goals/queries";
import { FoodSearch } from "@/modules/food/components/FoodSearch";
import { DeleteLogButton } from "@/modules/food/components/DeleteLogButton";
import { Card, PageHeader, Stat } from "@/components/ui";

export default async function FoodPage() {
  if (!FEATURES.foodTracker) redirect("/");

  const logs = await getTodaysFoodLogs();
  const totals = computeTotals(logs);
  const goals = FEATURES.weightGoals ? await getGoalsWithProgress() : [];
  const calorieGoal = goals.find((g) => g.goal.type === "calorie");
  const proteinGoal = goals.find((g) => g.goal.type === "protein");

  return (
    <div className="space-y-5">
      <PageHeader title="Food" subtitle="Calories + protein, the two that matter." />

      <div className="grid grid-cols-2 gap-2">
        <Stat
          label={calorieGoal ? `Calories / ${calorieGoal.target}` : "Calories"}
          value={`${Math.round(totals.calories)}`}
        />
        <Stat
          label={proteinGoal ? `Protein / ${proteinGoal.target}g` : "Protein"}
          value={`${Math.round(totals.protein)}g`}
        />
      </div>
      <p className="text-center text-xs text-muted">
        Secondary: {Math.round(totals.carbs)}g carbs · {Math.round(totals.fat)}g fat
      </p>

      <Card>
        <FoodSearch />
      </Card>

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
