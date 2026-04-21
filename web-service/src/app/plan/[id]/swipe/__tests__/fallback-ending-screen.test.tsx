import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FallbackEndingScreen } from "../fallback-ending-screen";

describe("FallbackEndingScreen", () => {
  it("renders a deliberate no-match ending with the suggested fallback venue and actions", () => {
    const html = renderToStaticMarkup(
      <FallbackEndingScreen
        creatorName="Alex"
        venueName="Cafe Blue"
        venuePhotoUrl={null}
        venueCategoryLabel="Restaurant"
        initialRetryCategories={["RESTAURANT"]}
        initialRetryBudget="MODERATE"
        venueAddress="12 Main St, Austin, TX"
        explanation="Dateflow picked the spot that stayed strongest across both of your picks."
        onAccept={() => undefined}
        onRetry={() => undefined}
        onStartOver={() => undefined}
        submittingAction={null}
      />,
    );

    expect(html).toContain("No mutual match this time");
    expect(html).toContain("Cafe Blue");
    expect(html).toContain("Dateflow fallback pick");
    expect(html).toContain("Dateflow picked the spot that stayed strongest across both of your picks.");
    expect(html).toContain("Lock in this plan");
    expect(html).toContain("Try a new mix");
    expect(html).toContain("Start over");
    expect(html).not.toContain("still pending");
    expect(html).toContain("Alex");
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('role="radio"');
    expect(html).toContain('aria-checked="true"');
  });

  it("renders a partner-requested retry state with explicit confirmation copy", () => {
    const html = renderToStaticMarkup(
      <FallbackEndingScreen
        creatorName="Alex"
        venueName="Cafe Blue"
        venuePhotoUrl={null}
        venueCategoryLabel="Restaurant"
        initialRetryCategories={["BAR"]}
        initialRetryBudget="UPSCALE"
        venueAddress="12 Main St, Austin, TX"
        explanation="Dateflow picked the spot that stayed strongest across both of your picks."
        retryStep="partner_confirm"
        onAccept={() => undefined}
        onRetry={() => undefined}
        onStartOver={() => undefined}
        submittingAction={null}
      />,
    );

    expect(html).toContain("Your partner wants a new mix");
    expect(html).toContain("Keep your current vibes or tweak them below, then confirm the retry together.");
    expect(html).toContain("Confirm new mix");
    expect(html).not.toContain("Lock in this plan");
  });
});
