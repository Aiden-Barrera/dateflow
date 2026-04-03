"use client";

type LoadingOrnamentVariant =
  | "venue"
  | "demo-deck"
  | "partner-preferences"
  | "partner-round"
  | "session-check";

export function LoadingOrnament({
  variant,
}: {
  readonly variant: LoadingOrnamentVariant;
}) {
  if (variant === "demo-deck") {
    return <DemoDeckLoader />;
  }

  if (variant === "partner-preferences") {
    return <PartnerPreferencesLoader />;
  }

  if (variant === "partner-round") {
    return <PartnerRoundLoader />;
  }

  if (variant === "session-check") {
    return <SessionCheckLoader />;
  }

  return <VenueGenerationLoader />;
}

function VenueGenerationLoader() {
  return (
    <div className="relative flex h-44 items-center justify-center" aria-hidden="true">
      <div
        className="absolute inset-x-8 top-10 h-24 rounded-[2rem] opacity-70 blur-2xl"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,126,107,0.2), rgba(120,214,201,0.16))",
        }}
      />
      <ShortlistCard
        className="-translate-x-10 translate-y-4 motion-safe:animate-[shortlistCardLeft_2.8s_ease-in-out_infinite] motion-reduce:animate-none"
        accent="var(--color-primary-muted)"
        title="Fair commute"
        tone="coral"
      />
      <ShortlistCard
        className="z-10 motion-safe:animate-[shortlistCardCenter_2.8s_ease-in-out_infinite] motion-reduce:animate-none"
        accent="var(--color-secondary-muted)"
        title="Good vibe"
        tone="teal"
      />
      <ShortlistCard
        className="translate-x-10 translate-y-4 motion-safe:animate-[shortlistCardRight_2.8s_ease-in-out_infinite] motion-reduce:animate-none"
        accent="rgba(255,255,255,0.92)"
        title="Top pick"
        tone="neutral"
      />
      <style jsx>{`
        @keyframes shortlistCardLeft {
          0%, 100% { transform: translateX(-40px) translateY(12px) rotate(-7deg); opacity: 0.7; }
          50% { transform: translateX(-56px) translateY(-4px) rotate(-11deg); opacity: 1; }
        }
        @keyframes shortlistCardCenter {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-12px) scale(1.04); }
        }
        @keyframes shortlistCardRight {
          0%, 100% { transform: translateX(40px) translateY(12px) rotate(7deg); opacity: 0.72; }
          50% { transform: translateX(56px) translateY(-4px) rotate(11deg); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function DemoDeckLoader() {
  return (
    <div className="relative flex h-44 items-center justify-center" aria-hidden="true">
      <div
        className="absolute inset-x-8 top-8 h-28 rounded-[2rem] opacity-70 blur-2xl"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,126,107,0.22), rgba(120,214,201,0.18))",
        }}
      />
      <DemoCard
        className="-rotate-12 motion-safe:animate-[demoCardLeft_2.6s_ease-in-out_infinite] motion-reduce:animate-none"
        accent="var(--color-primary-muted)"
        label="Food"
      />
      <DemoCard
        className="z-10 motion-safe:animate-[demoCardCenter_2.6s_ease-in-out_infinite] motion-reduce:animate-none"
        accent="var(--color-secondary-muted)"
        label="Drinks"
      />
      <DemoCard
        className="rotate-12 motion-safe:animate-[demoCardRight_2.6s_ease-in-out_infinite] motion-reduce:animate-none"
        accent="rgba(255,255,255,0.88)"
        label="Activity"
      />
      <style jsx>{`
        @keyframes demoCardLeft {
          0%, 100% { transform: translateX(-36px) translateY(12px) rotate(-12deg); }
          50% { transform: translateX(-56px) translateY(-2px) rotate(-16deg); }
        }
        @keyframes demoCardCenter {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-10px) scale(1.04); }
        }
        @keyframes demoCardRight {
          0%, 100% { transform: translateX(36px) translateY(12px) rotate(12deg); }
          50% { transform: translateX(56px) translateY(-2px) rotate(16deg); }
        }
      `}</style>
    </div>
  );
}

function PartnerPreferencesLoader() {
  return (
    <div className="relative flex h-40 w-40 items-center justify-center" aria-hidden="true">
      <div
        className="absolute inset-8 rounded-full opacity-75 blur-2xl"
        style={{
          background:
            "radial-gradient(circle, rgba(255,126,107,0.25) 0%, rgba(255,126,107,0.06) 70%, transparent 100%)",
        }}
      />
      <div className="absolute bottom-8 left-11 flex h-9 w-9 items-center justify-center rounded-full bg-white/92 text-primary shadow-[0_16px_30px_rgba(45,42,38,0.12)] motion-safe:animate-[floatHeart_2.4s_ease-in-out_infinite] motion-reduce:animate-none">
        <HeartIcon className="h-4 w-4" />
      </div>
      <div className="absolute bottom-12 right-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/88 text-secondary shadow-[0_14px_24px_rgba(45,42,38,0.1)] motion-safe:animate-[floatDot_2s_ease-in-out_infinite] motion-reduce:animate-none">
        <div className="h-2.5 w-2.5 rounded-full bg-secondary" />
      </div>
      <div className="absolute inset-[2.6rem] flex items-center justify-center rounded-full bg-white/92 shadow-[0_18px_34px_rgba(45,42,38,0.12)]">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-muted text-primary motion-safe:animate-pulse motion-reduce:animate-none">
          <HeartIcon className="h-6 w-6" />
        </div>
      </div>
      <style jsx>{`
        @keyframes floatHeart {
          0%, 100% { transform: translateY(10px) scale(0.98); }
          50% { transform: translateY(-8px) scale(1.06); }
        }
        @keyframes floatDot {
          0%, 100% { transform: translateY(-4px); }
          50% { transform: translateY(10px); }
        }
      `}</style>
    </div>
  );
}

function PartnerRoundLoader() {
  return (
    <div className="relative flex h-40 w-40 items-center justify-center" aria-hidden="true">
      <div
        className="absolute inset-10 rounded-full opacity-75 blur-2xl"
        style={{
          background:
            "radial-gradient(circle, rgba(255,126,107,0.22) 0%, rgba(120,214,201,0.08) 68%, transparent 100%)",
        }}
      />
      <div className="absolute inset-[2.55rem] flex items-center justify-center rounded-full bg-white/92 shadow-[0_18px_38px_rgba(45,42,38,0.14)]">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-muted text-primary">
          <HeartIcon className="h-6 w-6" />
        </div>
      </div>
      <div
        className="absolute inset-0 motion-safe:animate-spin motion-reduce:animate-none"
        style={{ animationDuration: "9s" }}
      >
        <div className="absolute left-1/2 top-1 h-7 w-7 -translate-x-1/2 rounded-full bg-white/92 shadow-[0_14px_28px_rgba(45,42,38,0.12)]">
          <div className="flex h-full items-center justify-center text-primary">
            <HeartIcon className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
      <div
        className="absolute inset-[0.85rem] motion-safe:animate-spin motion-reduce:animate-none"
        style={{ animationDirection: "reverse", animationDuration: "6.3s" }}
      >
        <div className="absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-secondary shadow-[0_0_0_8px_rgba(120,214,201,0.14)]" />
      </div>
    </div>
  );
}

function SessionCheckLoader() {
  return (
    <div className="relative flex h-36 w-36 items-center justify-center" aria-hidden="true">
      <div
        className="absolute inset-6 rounded-full opacity-70 blur-2xl"
        style={{
          background:
            "radial-gradient(circle, rgba(120,214,201,0.24) 0%, rgba(120,214,201,0.06) 72%, transparent 100%)",
        }}
      />
      <div className="flex items-end gap-2">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="w-3 rounded-full bg-secondary/80 motion-safe:animate-[signalRise_1.4s_ease-in-out_infinite] motion-reduce:animate-none"
            style={{
              height: `${26 + index * 10}px`,
              animationDelay: `${index * 0.16}s`,
            }}
          />
        ))}
      </div>
      <style jsx>{`
        @keyframes signalRise {
          0%, 100% { transform: scaleY(0.78); opacity: 0.45; }
          50% { transform: scaleY(1.06); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function DemoCard({
  className,
  accent,
  label,
}: {
  readonly className: string;
  readonly accent: string;
  readonly label: string;
}) {
  return (
    <div
      className={`absolute flex h-32 w-24 flex-col justify-between rounded-[1.6rem] border border-white/70 bg-white/92 p-3 shadow-[0_22px_40px_rgba(45,42,38,0.12)] ${className}`}
    >
      <div
        className="h-14 rounded-[1rem]"
        style={{ background: `linear-gradient(135deg, ${accent}, rgba(255,255,255,0.35))` }}
      />
      <div className="space-y-2">
        <div className="h-2 w-12 rounded-full bg-text/10" />
        <div className="h-2 w-16 rounded-full bg-text/10" />
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-text-secondary">
          {label}
        </p>
      </div>
    </div>
  );
}

function ShortlistCard({
  className,
  accent,
  title,
  tone,
}: {
  readonly className: string;
  readonly accent: string;
  readonly title: string;
  readonly tone: "coral" | "teal" | "neutral";
}) {
  const pillClassName =
    tone === "coral"
      ? "bg-primary-muted text-primary"
      : tone === "teal"
        ? "bg-secondary-muted text-secondary"
        : "bg-bg text-text-secondary";

  return (
    <div
      className={`absolute flex h-28 w-28 flex-col justify-between rounded-[1.6rem] border border-white/70 bg-white/94 p-3 shadow-[0_22px_40px_rgba(45,42,38,0.12)] ${className}`}
    >
      <div
        className="h-11 rounded-[1rem]"
        style={{ background: `linear-gradient(135deg, ${accent}, rgba(255,255,255,0.35))` }}
      />
      <div className="space-y-2">
        <div className={`inline-flex rounded-full px-2 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.12em] ${pillClassName}`}>
          {title}
        </div>
        <div className="h-2 w-14 rounded-full bg-text/10" />
      </div>
    </div>
  );
}

function HeartIcon({ className }: { readonly className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 21s-6.72-4.32-9.33-8.35C.96 10.01 1.53 6.5 4.43 4.84c2.35-1.35 4.85-.48 6.1 1.33 1.25-1.81 3.75-2.68 6.1-1.33 2.9 1.66 3.47 5.17 1.76 7.81C18.72 16.68 12 21 12 21Z" />
    </svg>
  );
}
