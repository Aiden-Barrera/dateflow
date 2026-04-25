import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getMatchResult } from "../../../../lib/services/result-service";
import { getSession } from "../../../../lib/services/session-service";
import { getBothPreferences } from "../../../../lib/services/preference-service";
import { resolveSchedule } from "../../../../lib/services/schedule-intersection";
import {
  getBoundSessionRole,
  getSessionRoleCookieName,
} from "../../../../lib/session-role-access";
import { ResultScreen } from "./result-screen";
import { SessionLinkPlanter } from "./session-link-planter";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const [session, matchResult] = await Promise.all([
    getSession(id),
    getMatchResult(id).catch(() => null),
  ]);

  if (!session || !matchResult) {
    return {
      title: "Dateflow result",
      description: "See your matched venue and lock in the plan.",
    };
  }

  const galleryImages =
    matchResult.venue.photoUrls.length > 0
      ? matchResult.venue.photoUrls
      : matchResult.venue.photoUrl
        ? [matchResult.venue.photoUrl]
        : [];
  const socialImages = galleryImages.slice(0, 3);

  return {
    title: `${session.creatorDisplayName} matched on ${matchResult.venue.name}`,
    description: "See your matched venue, Get directions, and add it to your calendar.",
    openGraph: {
      title: `${session.creatorDisplayName} matched on ${matchResult.venue.name}`,
      description:
        "See your matched venue, Get directions, and add it to your calendar.",
      siteName: "Dateflow",
      type: "website",
      images:
        socialImages.length > 0
          ? socialImages.map((url) => ({
              url,
              alt: matchResult.venue.name,
            }))
          : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${session.creatorDisplayName} matched on ${matchResult.venue.name}`,
      description:
        "See your matched venue, Get directions, and add it to your calendar.",
      images: socialImages.length > 0 ? [...socialImages] : undefined,
    },
  };
}

export default async function ResultPage({ params }: PageProps) {
  const { id } = await params;
  const [session, matchResult] = await Promise.all([
    getSession(id),
    getMatchResult(id).catch(() => null),
  ]);

  if (!session || !matchResult) {
    notFound();
  }

  const cookieStore = await cookies();
  const viewerRole = getBoundSessionRole(
    id,
    cookieStore.get(getSessionRoleCookieName(id))?.value,
  );
  const matchedWithName =
    viewerRole === "a"
      ? session.inviteeDisplayName
      : session.creatorDisplayName;

  // Compute intersected days for the static-venue date picker (Case B).
  // Silently fall back to empty array if preferences aren't available.
  const intersectedDays = await getBothPreferences(id)
    .then(([prefA, prefB]) => resolveSchedule(prefA, prefB).intersectedDays)
    .catch(() => [] as const);

  return (
    <>
      <SessionLinkPlanter sessionId={id} role={viewerRole} />
      <ResultScreen
        matchedWithName={matchedWithName}
        matchResult={matchResult}
        viewerRole={viewerRole}
        intersectedDays={intersectedDays}
      />
    </>
  );
}
