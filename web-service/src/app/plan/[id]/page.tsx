import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getSession } from "../../../lib/services/session-service";
import { isExpired } from "../../../lib/services/session-helpers";
import {
  getSessionRoleCookieName,
  normalizeSessionRole,
} from "../../../lib/session-role-access";
import { PlanFlow } from "./plan-flow";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ demo?: string }>;
};

/**
 * Dynamic OG meta tags for share link previews.
 *
 * When Person A texts this link to Person B, the messaging app
 * (iMessage, WhatsApp, Instagram DMs) shows a personalized preview:
 * "{Name} wants to plan a date with you"
 *
 * Both generateMetadata and PlanPage load the session on the server
 * to render personalized content for the recipient.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const session = await getSession(id);

  if (!session) {
    return {
      title: "Dateflow",
      description: "Plan your perfect first date together.",
    };
  }

  const name = session.creatorDisplayName;
  const title = `${name} wants to plan a date with you`;
  const description =
    "Add your preferences — it takes 60 seconds. No account needed.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: "Dateflow",
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

/**
 * /plan/[id] — Person B's entry point.
 *
 * This is a server component: it fetches the session on the server
 * (secure, fast, no client-side API call), then hands the data to
 * PlanFlow — a client component that manages the multi-screen flow.
 */
export default async function PlanPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { demo } = await searchParams;

  const session = await getSession(id);

  if (!session) {
    notFound();
  }

  if (session.status === "expired" || isExpired(session)) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6 text-center">
        <h1 className="text-h1 font-semibold text-text">
          This session has expired
        </h1>
        <p className="mt-3 text-body text-text-secondary">
          Date planning sessions expire after 48 hours.
          Ask your partner to create a new one.
        </p>
      </div>
    );
  }

  if (session.status === "matched") {
    redirect(`/plan/${session.id}/results`);
  }

  if (session.status === "ready_to_swipe") {
    const cookieStore = await cookies();
    const boundRole = normalizeSessionRole(
      cookieStore.get(getSessionRoleCookieName(session.id))?.value,
    );

    if (boundRole) {
      redirect(`/plan/${session.id}/swipe${demo === "1" ? "?demo=1" : ""}`);
    }

    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6 text-center">
        <h1 className="text-h1 font-semibold text-text">
          This swipe deck is tied to another browser
        </h1>
        <p className="mt-3 max-w-xl text-body text-text-secondary">
          Reopen the original browser that joined this session to keep swiping.
          If you need a fresh invite, start a new session.
        </p>
      </div>
    );
  }

  return (
    <PlanFlow
      sessionId={session.id}
      creatorName={session.creatorDisplayName}
      demoMode={demo === "1"}
      initialStep={
        session.status === "both_ready" || session.status === "generating"
          ? "loading"
          : "hook"
      }
    />
  );
}
