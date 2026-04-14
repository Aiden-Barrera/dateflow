import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  beginAppleOAuth,
  beginGoogleOAuth,
  getAccountByAccessToken,
  login,
  register,
} from "../account-service";

const mockAuthSignUp = vi.fn();
const mockAuthSignInWithPassword = vi.fn();
const mockAuthSignInWithOAuth = vi.fn();
const mockAuthGetUser = vi.fn();
const mockAnonFromSingle = vi.fn();
const mockAnonFromEq = vi.fn(() => ({ single: mockAnonFromSingle }));
const mockAnonFromSelect = vi.fn(() => ({ eq: mockAnonFromEq }));
const mockAnonFrom = vi.fn(() => ({ select: mockAnonFromSelect }));

const mockServerInsertSingle = vi.fn();
const mockServerInsertSelect = vi.fn(() => ({ single: mockServerInsertSingle }));
const mockServerInsert = vi.fn(() => ({ select: mockServerInsertSelect }));
const mockServerFrom = vi.fn(() => ({ insert: mockServerInsert }));

vi.mock("../../supabase", () => ({
  getSupabaseClient: () => ({
    auth: {
      signUp: (...args: unknown[]) => mockAuthSignUp(...args),
      signInWithPassword: (...args: unknown[]) =>
        mockAuthSignInWithPassword(...args),
      signInWithOAuth: (...args: unknown[]) => mockAuthSignInWithOAuth(...args),
      getUser: (...args: unknown[]) => mockAuthGetUser(...args),
    },
    from: (...args: unknown[]) => mockAnonFrom(...args),
  }),
}));

vi.mock("../../supabase-server", () => ({
  getSupabaseServerClient: () => ({
    from: (...args: unknown[]) => mockServerFrom(...args),
  }),
}));

describe("account-service register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthSignUp.mockResolvedValue({
      data: {
        user: { id: "account-1", email: "alex@example.com" },
        session: { access_token: "token-123" },
      },
      error: null,
    });
    mockServerInsertSingle.mockResolvedValue({
      data: {
        id: "account-1",
        email: "alex@example.com",
        created_at: "2026-04-13T20:00:00Z",
      },
      error: null,
    });
  });

  it("creates a Supabase auth user, persists the account row, and returns token plus account", async () => {
    const result = await register("alex@example.com", "supersecret");

    expect(mockAuthSignUp).toHaveBeenCalledWith({
      email: "alex@example.com",
      password: "supersecret",
    });
    expect(mockServerFrom).toHaveBeenCalledWith("accounts");
    expect(mockServerInsert).toHaveBeenCalledWith({
      id: "account-1",
      email: "alex@example.com",
    });
    expect(result).toEqual({
      token: "token-123",
      account: {
        id: "account-1",
        email: "alex@example.com",
        createdAt: new Date("2026-04-13T20:00:00.000Z"),
      },
    });
  });

  it("surfaces duplicate email as a conflict-friendly error", async () => {
    mockAuthSignUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "User already registered" },
    });

    await expect(register("alex@example.com", "supersecret")).rejects.toThrow(
      "Email already registered",
    );
  });

  it("falls back to password sign-in when sign-up returns a user without a session", async () => {
    mockAuthSignUp.mockResolvedValue({
      data: {
        user: { id: "account-1", email: "alex@example.com" },
        session: null,
      },
      error: null,
    });
    mockAuthSignInWithPassword.mockResolvedValue({
      data: {
        user: { id: "account-1", email: "alex@example.com" },
        session: { access_token: "token-789" },
      },
      error: null,
    });

    const result = await register("alex@example.com", "supersecret");

    expect(mockAuthSignInWithPassword).toHaveBeenCalledWith({
      email: "alex@example.com",
      password: "supersecret",
    });
    expect(result).toEqual({
      token: "token-789",
      account: {
        id: "account-1",
        email: "alex@example.com",
        createdAt: new Date("2026-04-13T20:00:00.000Z"),
      },
    });
  });

  it("surfaces a confirmation-required message when sign-up creates a user without a session and fallback sign-in is blocked", async () => {
    mockAuthSignUp.mockResolvedValue({
      data: {
        user: { id: "account-1", email: "alex@example.com" },
        session: null,
      },
      error: null,
    });
    mockAuthSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Email not confirmed" },
    });

    await expect(register("alex@example.com", "supersecret")).rejects.toThrow(
      "Check your email to confirm your account",
    );
  });
});

describe("account-service login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthSignInWithPassword.mockResolvedValue({
      data: {
        user: { id: "account-1", email: "alex@example.com" },
        session: { access_token: "token-456" },
      },
      error: null,
    });
    mockAnonFromSingle.mockResolvedValue({
      data: {
        id: "account-1",
        email: "alex@example.com",
        created_at: "2026-04-13T20:00:00Z",
      },
      error: null,
    });
  });

  it("authenticates and returns the linked account plus token", async () => {
    const result = await login("alex@example.com", "supersecret");

    expect(mockAuthSignInWithPassword).toHaveBeenCalledWith({
      email: "alex@example.com",
      password: "supersecret",
    });
    expect(mockAnonFrom).toHaveBeenCalledWith("accounts");
    expect(mockAnonFromEq).toHaveBeenCalledWith("id", "account-1");
    expect(result).toEqual({
      token: "token-456",
      account: {
        id: "account-1",
        email: "alex@example.com",
        createdAt: new Date("2026-04-13T20:00:00.000Z"),
      },
    });
  });

  it("maps invalid credentials into a stable auth error", async () => {
    mockAuthSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Invalid login credentials" },
    });

    await expect(login("alex@example.com", "wrongpass")).rejects.toThrow(
      "Invalid credentials",
    );
  });
});

describe("account-service beginGoogleOAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthSignInWithOAuth.mockResolvedValue({
      data: { url: "https://supabase.test/auth/v1/authorize?provider=google" },
      error: null,
    });
  });

  it("starts the Google OAuth flow and returns the redirect url", async () => {
    const url = await beginGoogleOAuth("http://localhost:3000/history");

    expect(mockAuthSignInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "http://localhost:3000/history",
      },
    });
    expect(url).toBe("https://supabase.test/auth/v1/authorize?provider=google");
  });
});

describe("account-service beginAppleOAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthSignInWithOAuth.mockResolvedValue({
      data: { url: "https://supabase.test/auth/v1/authorize?provider=apple" },
      error: null,
    });
  });

  it("starts the Apple OAuth flow and returns the redirect url", async () => {
    const url = await beginAppleOAuth("http://localhost:3000/history");

    expect(mockAuthSignInWithOAuth).toHaveBeenCalledWith({
      provider: "apple",
      options: {
        redirectTo: "http://localhost:3000/history",
      },
    });
    expect(url).toBe("https://supabase.test/auth/v1/authorize?provider=apple");
  });
});

describe("account-service getAccountByAccessToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: "account-1" } },
      error: null,
    });
    mockAnonFromSingle.mockResolvedValue({
      data: {
        id: "account-1",
        email: "alex@example.com",
        created_at: "2026-04-13T20:00:00Z",
      },
      error: null,
    });
  });

  it("hydrates the account row from a valid access token", async () => {
    const account = await getAccountByAccessToken("token-789");

    expect(mockAuthGetUser).toHaveBeenCalledWith("token-789");
    expect(mockAnonFrom).toHaveBeenCalledWith("accounts");
    expect(mockAnonFromEq).toHaveBeenCalledWith("id", "account-1");
    expect(account).toEqual({
      id: "account-1",
      email: "alex@example.com",
      createdAt: new Date("2026-04-13T20:00:00.000Z"),
    });
  });

  it("returns an invalid-token error when Supabase rejects the access token", async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "invalid jwt" },
    });

    await expect(getAccountByAccessToken("bad-token")).rejects.toThrow(
      "Invalid token",
    );
  });
});
