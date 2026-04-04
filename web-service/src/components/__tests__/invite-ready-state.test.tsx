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
    expect(html).not.toContain("<a href=\"/plan/session-1\" class=\"block\"><button");
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

  it("surfaces expired and generation failure states explicitly", () => {
    const failedHtml = renderToStaticMarkup(
      <InviteReadyState
        sessionId="session-1"
        shareUrl="https://dateflow.app/plan/session-1"
        sessionStatus="generation_failed"
        copyState="idle"
        errorMessage={null}
        onCopyInvite={() => undefined}
      />,
    );
    const expiredHtml = renderToStaticMarkup(
      <InviteReadyState
        sessionId="session-1"
        shareUrl="https://dateflow.app/plan/session-1"
        sessionStatus="expired"
        copyState="idle"
        errorMessage={null}
        onCopyInvite={() => undefined}
      />,
    );

    expect(failedHtml).toContain("Venue generation hit a snag.");
    expect(failedHtml).toContain("Open live session");
    expect(expiredHtml).toContain("This invite expired before the plan came together.");
    expect(expiredHtml).toContain("Start a new session");
    expect(expiredHtml).toContain('href="/"');
  });
});
