// Purely presentational — no client state needed, renders on server.

/**
 * Card-shaped shimmer skeleton shown while the swipe deck is loading.
 *
 * Mirrors the proportions of the real venue card (aspect-[4/3] photo area
 * + info rows below) so the layout doesn't jump when the real card arrives.
 * The shimmer animation is CSS-only via `animate-pulse`. Users who have
 * enabled "Reduce Motion" in their OS settings see a static placeholder
 * instead of the pulsing animation via the `motion-reduce:animate-none` class.
 */
export function SwipeCardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading venue cards"
      className="w-full overflow-hidden rounded-[2rem] border border-white/20 bg-white shadow-[0_24px_80px_rgba(45,42,38,0.18)]"
    >
      {/* Photo area */}
      <div
        data-testid="skeleton-photo"
        className="aspect-[4/3] w-full animate-pulse bg-[#e8ddd5] motion-reduce:animate-none"
      />

      {/* Info rows */}
      <div className="space-y-4 p-6">
        {/* Title row */}
        <div className="space-y-2">
          <div
            data-testid="skeleton-row"
            className="h-3 w-1/3 animate-pulse rounded-full bg-[#e8ddd5] motion-reduce:animate-none"
          />
          <div
            data-testid="skeleton-row"
            className="h-6 w-3/4 animate-pulse rounded-full bg-[#e8ddd5] motion-reduce:animate-none"
          />
          <div
            data-testid="skeleton-row"
            className="h-4 w-1/2 animate-pulse rounded-full bg-[#e8ddd5] motion-reduce:animate-none"
          />
        </div>

        {/* Pills row */}
        <div className="flex gap-2">
          {[64, 80, 56].map((w) => (
            <div
              key={w}
              className="h-7 animate-pulse rounded-full bg-[#e8ddd5] motion-reduce:animate-none"
              style={{ width: w }}
            />
          ))}
        </div>

        {/* Why-picked block */}
        <div className="space-y-2 rounded-[1.25rem] bg-[#fdf0f4] p-4">
          <div className="h-3 w-1/4 animate-pulse rounded-full bg-[#e8c8d2] motion-reduce:animate-none" />
          <div className="h-4 w-full animate-pulse rounded-full bg-[#e8c8d2] motion-reduce:animate-none" />
          <div className="h-4 w-4/5 animate-pulse rounded-full bg-[#e8c8d2] motion-reduce:animate-none" />
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <div className="h-14 animate-pulse rounded-2xl bg-[#f0e4e0] motion-reduce:animate-none" />
          <div className="h-14 animate-pulse rounded-2xl bg-[#e0f0ea] motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  );
}
