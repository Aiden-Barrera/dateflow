import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AuthSheet } from "../auth-sheet";

describe("AuthSheet", () => {
  it("renders the register mode with email, password, and Google actions", () => {
    const html = renderToStaticMarkup(
      <AuthSheet
        open
        mode="register"
        draft={{ mode: "register", email: "", password: "" }}
        errorMessage={null}
        submitting={false}
        onClose={() => undefined}
        onDraftChange={() => undefined}
        onModeChange={() => undefined}
        onSubmit={() => undefined}
        onGoogle={() => undefined}
      />,
    );

    expect(html).toContain("Save this date");
    expect(html).toContain("Continue with Google");
    expect(html).toContain("Create account");
    expect(html).toContain('type="email"');
    expect(html).toContain('type="password"');
  });

  it("renders the login mode with the returning-user CTA", () => {
    const html = renderToStaticMarkup(
      <AuthSheet
        open
        mode="login"
        draft={{ mode: "login", email: "", password: "" }}
        errorMessage="Invalid credentials"
        submitting={false}
        onClose={() => undefined}
        onDraftChange={() => undefined}
        onModeChange={() => undefined}
        onSubmit={() => undefined}
        onGoogle={() => undefined}
      />,
    );

    expect(html).toContain("Welcome back");
    expect(html).toContain("Log in");
    expect(html).toContain("Invalid credentials");
  });
});
