/** Tiny className combiner (avoids a clsx dependency for v1). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Estimated 1RM via the Epley formula. Returns null if inputs are missing. */
export function estimate1RM(weight: number | null, reps: number | null): number | null {
  if (!weight || !reps || reps <= 0) return null;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

/** Volume for a single set (weight * reps). */
export function setVolume(weight: number | null, reps: number | null): number {
  if (!weight || !reps) return 0;
  return weight * reps;
}

export function formatWeight(weight: number | null, unit: string): string {
  if (weight === null || weight === undefined) return "–";
  return `${weight}${unit}`;
}

/** YYYY-MM-DD for the local day of a timestamp. */
export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function startOfTodayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

const KG_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
const LB_PLATES = [45, 35, 25, 10, 5, 2.5];

/**
 * Plates per side for a barbell load ("how do I load this?").
 * Returns null when the weight is below the bar or doesn't apply.
 */
export function platesPerSide(total: number, unit: string): string | null {
  const bar = unit === "lb" ? 45 : 20;
  if (!Number.isFinite(total) || total < bar) return null;
  let perSide = (total - bar) / 2;
  if (perSide === 0) return "empty bar";
  const plates = unit === "lb" ? LB_PLATES : KG_PLATES;
  const out: string[] = [];
  for (const p of plates) {
    let n = 0;
    while (perSide >= p - 1e-9) {
      perSide -= p;
      n++;
    }
    if (n > 0) out.push(n > 1 ? `${p}×${n}` : `${p}`);
  }
  if (out.length === 0 || perSide > 0.01) return null; // not loadable exactly
  return out.join(" + ") + " / side";
}

/** True if the media URL looks like a video (by extension). */
export function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /\.(mp4|mov|webm|m4v|ogv)(\?|#|$)/i.test(url);
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}
