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
        venueCategory="RESTAURANT"
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
  });
});
