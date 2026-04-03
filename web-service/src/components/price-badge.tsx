"use client";

type PriceBadgeProps = {
  readonly priceLevel: number;
};

export function PriceBadge({ priceLevel }: PriceBadgeProps) {
  const normalizedPrice = Math.max(1, Math.min(priceLevel, 4));

  return (
    <div className="relative min-w-[6.2rem] overflow-hidden rounded-[1.25rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.82))] px-3 py-3 text-right shadow-[0_14px_28px_rgba(45,42,38,0.1)]">
      <div
        className="pointer-events-none absolute inset-x-2 top-1 h-9 rounded-full opacity-70 blur-xl"
        style={{
          background:
            normalizedPrice >= 3
              ? "linear-gradient(135deg, rgba(224,116,104,0.2), rgba(91,154,139,0.16))"
              : "linear-gradient(135deg, rgba(91,154,139,0.14), rgba(224,116,104,0.14))",
        }}
        aria-hidden="true"
      />
      <div className="relative">
        <div className="text-[0.66rem] uppercase tracking-[0.18em] text-text-secondary">
          Price
        </div>
        <div className="mt-1 text-[1.45rem] font-semibold tracking-[-0.05em] text-primary">
          {toPriceLabel(normalizedPrice)}
        </div>
        <div className="mt-2 flex justify-end gap-1">
          {Array.from({ length: 4 }, (_, index) => (
            <span
              key={index}
              className={`h-1.5 w-4 rounded-full ${
                index < normalizedPrice
                  ? "bg-[linear-gradient(135deg,var(--color-primary),var(--color-secondary))]"
                  : "bg-muted/70"
              }`}
            />
          ))}
        </div>
        <div className="mt-2 text-[0.68rem] font-medium text-text-secondary">
          {getPriceTone(normalizedPrice)}
        </div>
      </div>
    </div>
  );
}

function toPriceLabel(priceLevel: number): string {
  return "$".repeat(Math.max(1, Math.min(priceLevel, 4)));
}

function getPriceTone(priceLevel: number): string {
  if (priceLevel === 1) {
    return "Easy spend";
  }

  if (priceLevel === 2) {
    return "Mid-range";
  }

  if (priceLevel === 3) {
    return "Upscale";
  }

  return "Special night";
}
