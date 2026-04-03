import { notFound, redirect } from "next/navigation";
import { SwipeFlow } from "./swipe-flow";
import { getSession } from "../../../../lib/services/session-service";
import type { Role } from "../../../../lib/types/preference";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ role?: string; demo?: string }>;
};

export default async function SwipePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { role, demo } = await searchParams;
  const session = await getSession(id);

  if (!session) {
    notFound();
  }

  if (session.status === "matched") {
    redirect(`/plan/${id}/results`);
  }

  const resolvedRole: Role = role === "a" ? "a" : "b";

  return (
    <SwipeFlow
      sessionId={id}
      creatorName={session.creatorDisplayName}
      role={resolvedRole}
      demoMode={demo === "1"}
    />
  );
}
