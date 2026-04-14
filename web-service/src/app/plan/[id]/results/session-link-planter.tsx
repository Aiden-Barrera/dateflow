"use client";

import { useEffect } from "react";
import type { Role } from "../../../../lib/types/preference";
import { persistSessionLink } from "../../../../lib/session-link-storage";

type SessionLinkPlanterProps = {
  readonly sessionId: string;
  readonly role: Role | null;
};

export function SessionLinkPlanter({
  sessionId,
  role,
}: SessionLinkPlanterProps) {
  useEffect(() => {
    if (!role) {
      return;
    }

    persistSessionLink(window.localStorage, {
      sessionId,
      role,
    });
  }, [role, sessionId]);

  return null;
}
