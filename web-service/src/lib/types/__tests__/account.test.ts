import { describe, expect, it } from "vitest";
import {
  toAccount,
  toSessionAccount,
  type AccountRow,
  type SessionAccountRow,
} from "../account";

describe("account types", () => {
  it("maps an account row into the app account shape", () => {
    const row: AccountRow = {
      id: "account-1",
      email: "alex@example.com",
      created_at: "2026-04-13T18:45:00Z",
    };

    const account = toAccount(row);

    expect(account).toEqual({
      id: "account-1",
      email: "alex@example.com",
      createdAt: new Date("2026-04-13T18:45:00.000Z"),
    });
  });

  it("maps a session_accounts row into the app join-record shape", () => {
    const row: SessionAccountRow = {
      session_id: "session-1",
      account_id: "account-1",
      role: "b",
      linked_at: "2026-04-13T18:50:00Z",
    };

    const sessionAccount = toSessionAccount(row);

    expect(sessionAccount).toEqual({
      sessionId: "session-1",
      accountId: "account-1",
      role: "b",
      linkedAt: new Date("2026-04-13T18:50:00.000Z"),
    });
  });
});
