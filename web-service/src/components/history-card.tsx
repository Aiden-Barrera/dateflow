import Image from "next/image";
import Link from "next/link";
import type { HistorySession } from "../lib/services/session-history-service";
import { getHistoryRoleLabel } from "../app/history/history-page-state";

type HistoryCardProps = {
  readonly session: HistorySession;
};

export function HistoryCard({ session }: HistoryCardProps) {
  const title = session.matchedVenue?.name ?? "Expired plan";
  const body =
    session.matchedVenue?.address ?? "No match was saved from this round.";

  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/90 shadow-[0_18px_40px_rgba(45,42,38,0.08)] transition-all duration-200 hover:shadow-[0_24px_48px_rgba(45,42,38,0.12)] motion-safe:hover:-translate-y-0.5">
      <div className="grid gap-0 sm:grid-cols-[180px_1fr]">
        <div className="relative min-h-[160px] bg-[linear-gradient(135deg,var(--color-secondary-muted),var(--color-primary-muted))]">
          {session.matchedVenue?.photoUrl ? (
            <Image
              src={session.matchedVenue.photoUrl}
              alt={session.matchedVenue.name}
              fill
              unoptimized
              className="object-cover"
              sizes="180px"
            />
          ) : (
            <div className="flex h-full items-end p-4">
              <span className="rounded-full border border-white/60 bg-white/20 px-3 py-1 text-caption font-medium text-white backdrop-blur">
                No saved photo
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center gap-2 text-caption text-text-secondary">
            <span className="rounded-full border border-muted bg-bg px-3 py-1.5">
              {getHistoryRoleLabel(session.role)}
            </span>
            <span className="rounded-full border border-muted bg-bg px-3 py-1.5 capitalize">
              {session.status}
            </span>
          </div>

          <div>
            <h2 className="text-h2 font-semibold text-text">{title}</h2>
            <p className="mt-2 text-body text-text-secondary">{body}</p>
          </div>

          <div className="mt-auto flex items-center justify-between gap-3">
            <p className="text-caption text-text-secondary">
              {new Date(session.createdAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <Link
              href={
                session.status === "matched"
                  ? `/plan/${session.sessionId}/results`
                  : `/plan/${session.sessionId}`
              }
              className="cursor-pointer rounded-full border border-muted bg-bg px-4 py-2 text-caption font-semibold text-text transition-colors duration-200 hover:border-text-secondary hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              View result
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
