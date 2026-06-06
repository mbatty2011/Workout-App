/**
 * Shown instantly on every tab navigation while the server renders the page,
 * so switching tabs feels immediate instead of frozen on the old screen.
 */
export default function Loading() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <div className="h-7 w-40 rounded-lg bg-surface" />
          <div className="h-3 w-24 rounded bg-surface" />
        </div>
        <div className="h-9 w-9 rounded-full bg-surface" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="h-16 rounded-xl bg-surface" />
        <div className="h-16 rounded-xl bg-surface" />
        <div className="h-16 rounded-xl bg-surface" />
      </div>
      <div className="h-28 rounded-2xl bg-surface" />
      <div className="h-20 rounded-2xl bg-surface" />
      <div className="h-20 rounded-2xl bg-surface" />
    </div>
  );
}
