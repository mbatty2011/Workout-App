"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FEATURES } from "@/config/features";

type NavItem = { href: string; label: string; icon: string; show: boolean };

/**
 * Persistent bottom tab bar — the primary navigation on a phone.
 * Items hide themselves when their feature flag is off (spec §3).
 */
export function BottomNav() {
  const pathname = usePathname();

  const items: NavItem[] = [
    { href: "/", label: "Home", icon: "🏠", show: true },
    { href: "/routines", label: "Splits", icon: "🗂️", show: FEATURES.splitBuilder },
    { href: "/workout", label: "Log", icon: "➕", show: FEATURES.workoutLogging },
    { href: "/food", label: "Food", icon: "🍽️", show: FEATURES.foodTracker },
    { href: "/feed", label: "Feed", icon: "👥", show: FEATURES.socialFeed },
  ];

  const visible = items.filter((i) => i.show);

  return (
    <nav className="sticky bottom-0 z-30 border-t border-border bg-bg/90 backdrop-blur">
      <ul
        className="mx-auto grid max-w-md"
        style={{ gridTemplateColumns: `repeat(${visible.length}, 1fr)` }}
      >
        {visible.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[11px]",
                  active ? "text-accent" : "text-muted",
                )}
              >
                <span className="text-lg leading-none">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
