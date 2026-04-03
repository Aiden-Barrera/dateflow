import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMatchResult } from "../../../../../lib/services/result-service";
import { getSession } from "../../../../../lib/services/session-service";
import { ResultScreen } from "./result-screen";

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

  return {
    title: `${session.creatorDisplayName} matched on ${matchResult.venue.name}`,
    description: "See your matched venue, Get directions, and add it to your calendar.",
    openGraph: {
      title: `${session.creatorDisplayName} matched on ${matchResult.venue.name}`,
      description:
        "See your matched venue, Get directions, and add it to your calendar.",
      siteName: "Dateflow",
      type: "website",
      images: matchResult.venue.photoUrl
        ? [
            {
              url: matchResult.venue.photoUrl,
              alt: matchResult.venue.name,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${session.creatorDisplayName} matched on ${matchResult.venue.name}`,
      description:
        "See your matched venue, Get directions, and add it to your calendar.",
      images: matchResult.venue.photoUrl ? [matchResult.venue.photoUrl] : undefined,
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

  return (
    <ResultScreen
      creatorName={session.creatorDisplayName}
      matchResult={matchResult}
    />
  );
}
