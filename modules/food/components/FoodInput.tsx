"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CameraIcon, SearchIcon } from "@/components/icons";
import { FoodScan } from "@/modules/food/components/FoodScan";
import { FoodSearch } from "@/modules/food/components/FoodSearch";

/** Two ways to add food: snap a label (default) or search a database. */
export function FoodInput() {
  const [tab, setTab] = useState<"scan" | "search">("scan");
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-surface p-1">
        <Tab active={tab === "scan"} onClick={() => setTab("scan")}>
          <CameraIcon className="h-4 w-4" /> Scan label
        </Tab>
        <Tab active={tab === "search"} onClick={() => setTab("search")}>
          <SearchIcon className="h-4 w-4" /> Search
        </Tab>
      </div>
      {tab === "scan" ? <FoodScan /> : <FoodSearch />}
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors",
        active ? "bg-accent text-accent-text" : "text-muted",
      )}
    >
      {children}
    </button>
  );
}
