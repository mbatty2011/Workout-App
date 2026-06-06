/** Dark full-bleed placeholder matching the reels feed. */
export default function FeedLoading() {
  return (
    <div className="-mx-4 -mb-6 -mt-6 flex h-[calc(100svh-3.75rem)] items-center justify-center bg-black">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
    </div>
  );
}
