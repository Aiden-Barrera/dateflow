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

// Role tones — raspberry (hot) and warm terracotta (bridges with brown).
const RASPBERRY_SOFT = "rgba(255,61,127,0.32)";
const WARM_SOFT = "rgba(232,160,138,0.22)";

function VenueGenerationLoader() {
  return (
    <div className="relative flex h-44 items-center justify-center" aria-hidden="true">
      <div
        className="absolute inset-x-8 top-10 h-24 rounded-[2rem] opacity-80 blur-2xl"
        style={{
          background: `linear-gradient(135deg, ${RASPBERRY_SOFT}, ${WARM_SOFT})`,
        }}
      />
      <ShortlistCard
        className="-translate-x-10 translate-y-4 motion-safe:animate-[shortlistCardLeft_2.8s_ease-in-out_infinite] motion-reduce:animate-none"
        accent={RASPBERRY_SOFT}
        title="Fair commute"
        tone="raspberry"
      />
      <ShortlistCard
        className="z-10 motion-safe:animate-[shortlistCardCenter_2.8s_ease-in-out_infinite] motion-reduce:animate-none"
        accent={WARM_SOFT}
        title="Good vibe"
        tone="warm"
      />
      <ShortlistCard
        className="translate-x-10 translate-y-4 motion-safe:animate-[shortlistCardRight_2.8s_ease-in-out_infinite] motion-reduce:animate-none"
        accent="rgba(255,255,255,0.85)"
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
        className="absolute inset-x-8 top-8 h-28 rounded-[2rem] opacity-80 blur-2xl"
        style={{
          background: `linear-gradient(135deg, ${RASPBERRY_SOFT}, ${WARM_SOFT})`,
        }}
      />
      <DemoCard
        className="-rotate-12 motion-safe:animate-[demoCardLeft_2.6s_ease-in-out_infinite] motion-reduce:animate-none"
        accent={RASPBERRY_SOFT}
        label="Food"
      />
      <DemoCard
        className="z-10 motion-safe:animate-[demoCardCenter_2.6s_ease-in-out_infinite] motion-reduce:animate-none"
        accent={WARM_SOFT}
        label="Drinks"
      />
      <DemoCard
        className="rotate-12 motion-safe:animate-[demoCardRight_2.6s_ease-in-out_infinite] motion-reduce:animate-none"
        accent="rgba(255,255,255,0.82)"
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
        className="absolute inset-8 rounded-full opacity-80 blur-2xl"
        style={{
          background:
            "radial-gradient(circle, rgba(255,61,127,0.38) 0%, rgba(255,61,127,0.08) 70%, transparent 100%)",
        }}
      />
      <div className="absolute bottom-8 left-11 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#8a2346] shadow-[0_16px_30px_rgba(0,0,0,0.4)] motion-safe:animate-[floatHeart_2.4s_ease-in-out_infinite] motion-reduce:animate-none">
        <HeartIcon className="h-4 w-4" />
      </div>
      <div className="absolute bottom-12 right-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#b22233] shadow-[0_14px_24px_rgba(0,0,0,0.35)] motion-safe:animate-[floatDot_2s_ease-in-out_infinite] motion-reduce:animate-none">
        <PassIcon className="h-4 w-4" />
      </div>
      <div className="absolute inset-[2.6rem] flex items-center justify-center rounded-full bg-white/90 shadow-[0_18px_34px_rgba(0,0,0,0.4)]">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full text-[#8a2346] motion-safe:animate-pulse motion-reduce:animate-none"
          style={{ background: RASPBERRY_SOFT }}
        >
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
    <div className="relative flex h-56 w-56 items-center justify-center" aria-hidden="true">
      <div
        className="absolute inset-12 rounded-full opacity-80 blur-2xl"
        style={{
          background:
            "radial-gradient(circle, rgba(255,61,127,0.32) 0%, rgba(232,160,138,0.1) 68%, transparent 100%)",
        }}
      />
      <div className="absolute inset-[4.25rem] flex items-center justify-center rounded-full bg-white/90 shadow-[0_18px_38px_rgba(0,0,0,0.42)]">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full text-[#8a2346]"
          style={{ background: RASPBERRY_SOFT }}
        >
          <HeartIcon className="h-6 w-6" />
        </div>
      </div>
      <div
        className="absolute inset-0 motion-safe:animate-spin motion-reduce:animate-none"
        style={{ animationDuration: "9s" }}
      >
        <div className="absolute left-1/2 top-0 h-8 w-8 -translate-x-1/2 rounded-full bg-white/90 shadow-[0_14px_28px_rgba(0,0,0,0.4)]">
          <div className="flex h-full items-center justify-center text-[#8a2346]">
            <HeartIcon className="h-4 w-4" />
          </div>
        </div>
      </div>
      <div
        className="absolute inset-0 motion-safe:animate-spin motion-reduce:animate-none"
        style={{ animationDirection: "reverse", animationDuration: "6.3s" }}
      >
        <div className="absolute right-0 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#b22233] shadow-[0_12px_24px_rgba(0,0,0,0.4)]">
          <PassIcon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function SessionCheckLoader() {
  return (
    <div className="relative flex h-36 w-36 items-center justify-center" aria-hidden="true">
      <div
        className="absolute inset-6 rounded-full opacity-75 blur-2xl"
        style={{
          background:
            "radial-gradient(circle, rgba(255,61,127,0.32) 0%, rgba(255,61,127,0.06) 72%, transparent 100%)",
        }}
      />
      <div className="flex items-end gap-2">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="w-3 rounded-full bg-white/80 motion-safe:animate-[signalRise_1.4s_ease-in-out_infinite] motion-reduce:animate-none"
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
      className={`absolute flex h-32 w-24 flex-col justify-between rounded-[1.6rem] border border-white/20 bg-white/[0.08] p-3 shadow-[0_22px_40px_rgba(0,0,0,0.4)] backdrop-blur-sm ${className}`}
    >
      <div
        className="h-14 rounded-[1rem]"
        style={{ background: `linear-gradient(135deg, ${accent}, rgba(255,255,255,0.25))` }}
      />
      <div className="space-y-2">
        <div className="h-2 w-12 rounded-full bg-white/25" />
        <div className="h-2 w-16 rounded-full bg-white/25" />
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-white/70">
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
  readonly tone: "raspberry" | "warm" | "neutral";
}) {
  const pillClassName =
    tone === "raspberry"
      ? "bg-white/15 text-white"
      : tone === "warm"
        ? "bg-white/12 text-[#f5d5c5]"
        : "bg-white/10 text-white/80";

  return (
    <div
      className={`absolute flex h-28 w-28 flex-col justify-between rounded-[1.6rem] border border-white/20 bg-white/[0.08] p-3 shadow-[0_22px_40px_rgba(0,0,0,0.4)] backdrop-blur-sm ${className}`}
    >
      <div
        className="h-11 rounded-[1rem]"
        style={{ background: `linear-gradient(135deg, ${accent}, rgba(255,255,255,0.22))` }}
      />
      <div className="space-y-2">
        <div className={`inline-flex rounded-full px-2 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.12em] ${pillClassName}`}>
          {title}
        </div>
        <div className="h-2 w-14 rounded-full bg-white/25" />
      </div>
    </div>
  );
}

function HeartIcon({ className }: { readonly className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20.5c-.5 0-.98-.19-1.35-.53-2.5-2.3-4.6-4.2-6.07-6.08C3.14 12.04 2.5 10.4 2.5 8.75c0-2.9 2.24-5.25 5-5.25 1.77 0 3.38.92 4.25 2.33.87-1.41 2.48-2.33 4.25-2.33 2.76 0 5 2.35 5 5.25 0 1.65-.64 3.29-2.08 5.14-1.47 1.88-3.57 3.78-6.07 6.08-.37.34-.85.53-1.35.53Z" />
    </svg>
  );
}

function PassIcon({ className }: { readonly className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9.25" />
      <path d="M8.5 8.5 15.5 15.5" />
      <path d="M15.5 8.5 8.5 15.5" />
    </svg>
  );
}

