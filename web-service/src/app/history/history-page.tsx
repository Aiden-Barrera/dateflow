"use client";

import { useEffect, useState } from "react";
import { Button } from "../../components/button";
import { HistoryCard } from "../../components/history-card";
import { Logo } from "../../components/logo";
import { fetchCurrentAccount } from "../../lib/auth-client";
import {
  getStoredAccountSummary,
  getStoredAuthToken,
  setStoredAccountSummary,
  setStoredAuthToken,
} from "../../lib/auth-token-storage";
import { fetchHistory } from "../../lib/history-client";
import type { SessionHistoryPage } from "../../lib/services/session-history-service";
import {
  extractOAuthAccessToken,
  getHistoryFilterLabel,
  shouldShowLoadMore,
} from "./history-page-state";

type HistoryPageProps = {
  readonly initialTokenState: "present" | "missing";
  readonly initialHistory: SessionHistoryPage | null;
  readonly initialAccountEmail?: string | null;
};

export function HistoryPage({
  initialTokenState,
  initialHistory,
  initialAccountEmail = null,
}: HistoryPageProps) {
  const [tokenState, setTokenState] = useState(initialTokenState);
  const [includeAll, setIncludeAll] = useState(false);
  const [history, setHistory] = useState<SessionHistoryPage | null>(initialHistory);
  const [loading, setLoading] = useState(initialHistory === null);
  const [error, setError] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | null>(initialAccountEmail);
  const [page, setPage] = useState(initialHistory?.page ?? 1);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      const tokenFromOAuth = extractOAuthAccessToken(window.location.href);

      if (tokenFromOAuth) {
        setStoredAuthToken(window.localStorage, tokenFromOAuth);
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      const token = tokenFromOAuth ?? getStoredAuthToken(window.localStorage);
      const summary = getStoredAccountSummary(window.localStorage);

      if (!token) {
        if (!cancelled) {
          setTokenState("missing");
          setLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setTokenState("present");
        setLoading(true);
        setError(null);
        setAccountEmail(summary?.email ?? null);
      }

      try {
        if (!summary) {
          const account = await fetchCurrentAccount(token);

          if (
            !cancelled &&
            typeof account.email === "string" &&
            account.email.length > 0
          ) {
            setStoredAccountSummary(window.localStorage, {
              email: account.email,
            });
            setAccountEmail(account.email);
          }
        }

        const result = await fetchHistory(token, { includeAll, page });

        if (!cancelled) {
          setHistory((current) => {
            if (!current || page === 1) {
              return result;
            }

            return {
              ...result,
              sessions: [...current.sessions, ...result.sessions],
            };
          });
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load history",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [includeAll, page]);

  return (
    <main className="min-h-dvh bg-bg text-text">
      <div className="mx-auto flex w-full max-w-6xl flex-col px-6 pb-16 pt-8 sm:px-8">
        <header className="flex items-center justify-between">
          <Logo />
          <span className="rounded-full border border-white/60 bg-white/80 px-3 py-1 text-caption text-text-secondary shadow-sm backdrop-blur">
            Saved dates
          </span>
        </header>

        <section className="mt-10 max-w-3xl">
          <p className="text-caption font-semibold uppercase tracking-[0.22em] text-secondary">
            History
          </p>
          <h1 className="mt-4 text-[clamp(2.75rem,8vw,4.5rem)] font-semibold leading-[0.95] tracking-[-0.05em]">
            Saved dates
          </h1>
          <p className="mt-4 text-body text-text-secondary">
            Keep every promising plan in one place, then come back when you need the details again.
          </p>
          {accountEmail ? (
            <p className="mt-4 text-caption font-medium text-text-secondary">
              Signed in as {accountEmail}
            </p>
          ) : null}
        </section>

        {tokenState === "missing" ? (
          <section className="mt-10 rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-[0_18px_50px_rgba(45,42,38,0.08)]">
            <h2 className="text-h2 font-semibold text-text">
              Sign in to view your saved dates
            </h2>
            <p className="mt-3 max-w-2xl text-body text-text-secondary">
              Your match history only appears after you create an account or log in from a saved result.
            </p>
          </section>
        ) : (
          <>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button
                className="max-w-[12rem]"
                variant={includeAll ? "secondary" : "primary"}
                onClick={() => {
                  setIncludeAll(false);
                  setPage(1);
                }}
              >
                {getHistoryFilterLabel(false)}
              </Button>
              <Button
                className="max-w-[12rem]"
                variant={includeAll ? "primary" : "secondary"}
                onClick={() => {
                  setIncludeAll(true);
                  setPage(1);
                }}
              >
                {getHistoryFilterLabel(true)}
              </Button>
            </div>

            {loading ? (
              <section className="mt-8 rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-[0_18px_50px_rgba(45,42,38,0.08)]">
                <p className="text-body text-text-secondary">Loading your saved dates...</p>
              </section>
            ) : error ? (
              <section className="mt-8 rounded-[2rem] border border-error/15 bg-white/90 p-6 shadow-[0_18px_50px_rgba(45,42,38,0.08)]">
                <p className="text-body text-error">{error}</p>
              </section>
            ) : history && history.sessions.length === 0 ? (
              <section className="mt-8 rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-[0_18px_50px_rgba(45,42,38,0.08)]">
                <h2 className="text-h2 font-semibold text-text">No saved dates yet</h2>
                <p className="mt-3 max-w-2xl text-body text-text-secondary">
                  Your future matches will show up here once you save them from the result page.
                </p>
              </section>
            ) : (
              <section className="mt-8 grid gap-5">
                {history?.sessions.map((session) => (
                  <HistoryCard key={session.sessionId} session={session} />
                ))}
                {history && shouldShowLoadMore(history) ? (
                  <div className="flex justify-center pt-2">
                    <Button
                      className="max-w-[12rem]"
                      variant="secondary"
                      onClick={() => setPage((current) => current + 1)}
                    >
                      Load more
                    </Button>
                  </div>
                ) : null}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
