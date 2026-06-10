import type { SVGProps } from "react";

/**
 * Clean line icons (24×24, currentColor stroke). Replaces emoji throughout so
 * the UI reads as a crafted product rather than a template.
 */
function Svg(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    />
  );
}

export function HomeIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...p}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
    </Svg>
  );
}

export function SplitsIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...p}>
      <rect x="3" y="4" width="18" height="5" rx="1.5" />
      <rect x="3" y="11" width="18" height="5" rx="1.5" />
      <path d="M7 19h10" />
    </Svg>
  );
}

export function DumbbellIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...p}>
      <path d="M6.5 6.5 17.5 17.5" />
      <path d="M3.5 8.5 5.5 6.5l2 2-2 2z" transform="rotate(45 5.5 8.5)" />
      <rect x="2" y="8" width="3.2" height="8" rx="1" transform="rotate(45 3.6 12)" />
      <rect x="18.8" y="8" width="3.2" height="8" rx="1" transform="rotate(45 20.4 12)" />
    </Svg>
  );
}

export function FoodIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...p}>
      <path d="M4 3v7a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3" />
      <path d="M6 12v9" />
      <path d="M17 3c-1.7 0-3 2.2-3 5s1.3 4 3 4" />
      <path d="M17 3v18" />
    </Svg>
  );
}

export function FeedIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...p}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.5a3 3 0 0 1 0 5.8" />
      <path d="M17.5 20a5.5 5.5 0 0 0-2.7-4.7" />
    </Svg>
  );
}

export function UserIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </Svg>
  );
}

export function TimerIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 13V9" />
      <path d="M9 2h6" />
      <path d="m19 6 1.5-1.5" />
    </Svg>
  );
}

export function CheckIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...p}>
      <path d="M5 12.5 10 17l9-10" />
    </Svg>
  );
}

export function PlusIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...p}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function CameraIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...p}>
      <path d="M3 8a2 2 0 0 1 2-2h2l1.2-1.6a1 1 0 0 1 .8-.4h6a1 1 0 0 1 .8.4L19 6h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2z" transform="translate(0 1)" />
      <circle cx="12" cy="13" r="3.2" />
    </Svg>
  );
}

export function HeartIcon({ filled, ...p }: SVGProps<SVGSVGElement> & { filled?: boolean }) {
  return (
    <Svg fill={filled ? "currentColor" : "none"} {...p}>
      <path d="M12 20s-7-4.35-9.2-8.4C1.4 9.1 2.3 5.8 5.3 5c1.9-.5 3.7.4 4.7 1.9C11 5.4 12.8 4.5 14.7 5c3 .8 3.9 4.1 2.5 6.6C19 15.65 12 20 12 20Z" />
    </Svg>
  );
}

export function CommentIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...p}>
      <path d="M21 11.5a8 8 0 0 1-11.6 7.1L4 20l1.4-5.4A8 8 0 1 1 21 11.5Z" />
    </Svg>
  );
}

export function CloseIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...p}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  );
}

export function FlameIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...p}>
      <path d="M12 3c.8 2.6-.6 4-1.8 5.2C8.7 9.7 7 11.2 7 14a5 5 0 0 0 10 0c0-1.5-.6-2.6-1.3-3.6-.4 1-.9 1.6-1.7 2.1.4-2.9-.6-6.6-2-9.5Z" />
    </Svg>
  );
}

export function SparkIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...p}>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
      <path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
    </Svg>
  );
}

export function TrendIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...p}>
      <path d="M3 17l5.5-5.5 3.5 3.5L21 7" />
      <path d="M15 7h6v6" />
    </Svg>
  );
}

export function ScaleIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...p}>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M8.5 9a5.5 5.5 0 0 1 7 0l-1.8 2.5a2.6 2.6 0 0 0-3.4 0z" />
    </Svg>
  );
}

export function SearchIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Svg>
  );
}
