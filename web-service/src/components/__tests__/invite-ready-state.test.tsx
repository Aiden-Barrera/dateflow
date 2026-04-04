import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InviteReadyState } from "../person-a-flow";

describe("InviteReadyState", () => {
  it("renders a production-ready waiting state with share and re-entry actions", () => {
    const html = renderToStaticMarkup(
      <InviteReadyState
        sessionId="session-1"
        shareUrl="https://dateflow.app/plan/session-1"
        copyState="idle"
        errorMessage={null}
        onCopyInvite={() => undefined}
      />,
    );

    expect(html).toContain("Invite sent");
    expect(html).toContain(
      "Share this link with your date, then come back here once they join.",
    );
    expect(html).toContain("https://dateflow.app/plan/session-1");
    expect(html).toContain("Copy invite link");
    expect(html).toContain("Open live session");
    expect(html).not.toContain("Person B can jump in now");
    expect(html).not.toContain("Run full demo as Person B");
    expect(html).not.toContain("?demo=1");
  });

  it("promotes re-entry once the session is ready or matched", () => {
    const readyHtml = renderToStaticMarkup(
      <InviteReadyState
        sessionId="session-1"
        shareUrl="https://dateflow.app/plan/session-1"
        sessionStatus="ready_to_swipe"
        copyState="idle"
        errorMessage={null}
        onCopyInvite={() => undefined}
      />,
    );
    const matchedHtml = renderToStaticMarkup(
      <InviteReadyState
        sessionId="session-1"
        shareUrl="https://dateflow.app/plan/session-1"
        sessionStatus="matched"
        copyState="idle"
        errorMessage={null}
        onCopyInvite={() => undefined}
      />,
    );

    expect(readyHtml).toContain("Continue to your swipe deck");
    expect(readyHtml).toContain('href="/plan/session-1"');
    expect(matchedHtml).toContain("View your result");
    expect(matchedHtml).toContain('href="/plan/session-1"');
  });
});
