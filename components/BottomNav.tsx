"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FEATURES } from "@/config/features";
import {
  HomeIcon,
  SplitsIcon,
  DumbbellIcon,
  FoodIcon,
  FeedIcon,
} from "@/components/icons";

type NavItem = {
  href: string;
  label: string;
  Icon: (p: { className?: string }) => React.ReactNode;
  show: boolean;
};

/**
 * Persistent bottom tab bar — the primary navigation on a phone.
 * Items hide themselves when their feature flag is off (spec §3).
 */
export function BottomNav() {
  const pathname = usePathname();

  const items: NavItem[] = [
    { href: "/", label: "Home", Icon: HomeIcon, show: true },
    { href: "/routines", label: "Splits", Icon: SplitsIcon, show: FEATURES.splitBuilder },
    { href: "/workout", label: "Log", Icon: DumbbellIcon, show: FEATURES.workoutLogging },
    { href: "/food", label: "Food", Icon: FoodIcon, show: FEATURES.foodTracker },
    { href: "/feed", label: "Feed", Icon: FeedIcon, show: FEATURES.socialFeed },
  ];

  const visible = items.filter((i) => i.show);

  return (
    <nav className="sticky bottom-0 z-30 border-t border-border bg-bg/80 backdrop-blur-lg">
      <ul
        className="mx-auto grid max-w-md"
        style={{ gridTemplateColumns: `repeat(${visible.length}, 1fr)` }}
      >
        {visible.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium tracking-wide transition-colors",
                  active ? "text-accent" : "text-muted hover:text-text",
                )}
              >
                <Icon className={cn("h-[22px] w-[22px]", active && "drop-shadow-[0_0_6px_var(--color-accent)]")} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
