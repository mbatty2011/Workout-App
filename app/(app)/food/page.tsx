import { redirect } from "next/navigation";
import { FEATURES } from "@/config/features";
import { getFoodLogsForDay, computeTotals } from "@/modules/food/queries";
import { getMacroPlanForDay } from "@/modules/goals/queries";
import { MEALS } from "@/modules/food/constants";
import { MealCard } from "@/modules/food/components/MealCard";
import { DayNav } from "@/modules/food/components/DayNav";
import { ShareMeals } from "@/modules/food/components/ShareMeals";
import { MacroPlan } from "@/modules/goals/components/MacroPlan";
import { Card, PageHeader, Stat } from "@/components/ui";

function todayStr() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

export default async function FoodPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  if (!FEATURES.foodTracker) redirect("/");
  const { date } = await searchParams;
  const today = todayStr();
  const dateStr = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : today;

  const logs = await getFoodLogsForDay(dateStr);
  const totals = computeTotals(logs);
  const plan = FEATURES.weightGoals
    ? await getMacroPlanForDay(dateStr)
    : { calories: null, protein: null, carbs: null, fat: null, hasPlan: false };

  return (
    <div className="space-y-4">
      <PageHeader title="Food" subtitle="Build meals from ingredients. Totals add up for you." />

      <DayNav dateStr={dateStr} today={today} />

      {/* Day totals — always visible so the day adds up automatically (#1) */}
      {plan.hasPlan ? (
        <MacroPlan plan={plan} />
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2">
            <Stat label="kcal" value={`${Math.round(totals.calories)}`} />
            <Stat label="protein" value={`${Math.round(totals.protein)}g`} />
            <Stat label="carbs" value={`${Math.round(totals.carbs)}g`} />
            <Stat label="fat" value={`${Math.round(totals.fat)}g`} />
          </div>
          {FEATURES.weightGoals && dateStr === today && <MacroPlan plan={plan} />}
        </>
      )}

      {/* Meals as ingredient containers */}
      {MEALS.map((meal) => (
        <MealCard
          key={meal}
          meal={meal}
          dateStr={dateStr}
          ingredients={logs.filter((l) => l.meal === meal)}
        />
      ))}

      {logs.length > 0 && FEATURES.socialFeed && <ShareMeals dateStr={dateStr} />}

      {logs.length === 0 && (
        <Card className="text-center text-sm text-muted">
          Nothing logged {dateStr === today ? "yet today" : "this day"}. Tap a meal&apos;s{" "}
          <span className="text-text">Add ingredient</span> to start.
        </Card>
      )}
    </div>
  );
}
