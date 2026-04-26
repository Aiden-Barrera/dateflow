/**
 * Lightweight realtime broadcast for Person B's arrival.
 *
 * When Person B opens the share link, HookScreen broadcasts a
 * `partner_opened` event. WaitingForPartnerScreen subscribes and
 * immediately advances the "Partner joined" step — no DB write needed.
 *
 * Client-safe: no server imports.
 */

export const PARTNER_PRESENCE_EVENT = "partner_opened" as const;

export function getPartnerPresenceChannelName(sessionId: string): string {
  return `partner-presence:${sessionId}`;
}

export type PartnerOpenedEvent = {
  readonly type: typeof PARTNER_PRESENCE_EVENT;
};
