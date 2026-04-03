import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { SwipeFlow } from "./swipe-flow";
import { getSession } from "../../../../lib/services/session-service";
import {
  getSessionRoleCookieName,
  normalizeSessionRole,
} from "../../../../lib/session-role-access";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ role?: string; demo?: string }>;
};

export default async function SwipePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { demo } = await searchParams;
  const session = await getSession(id);

  if (!session) {
    notFound();
  }

  if (session.status === "matched") {
    redirect(`/plan/${id}/results`);
  }

  const cookieStore = await cookies();
  const resolvedRole = normalizeSessionRole(
    cookieStore.get(getSessionRoleCookieName(id))?.value,
  );

  if (!resolvedRole) {
    redirect(`/plan/${id}${demo === "1" ? "?demo=1" : ""}`);
  }

  return (
    <SwipeFlow
      sessionId={id}
      creatorName={session.creatorDisplayName}
      role={resolvedRole}
      demoMode={demo === "1"}
    />
  );
}
