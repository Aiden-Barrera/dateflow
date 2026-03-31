/**
 * Dateflow two-tone wordmark.
 *
 * "Date" in text primary, "flow" in coral. Used on the hook screen
 * and loading screen as a brand anchor.
 */
export function Logo({ className = "" }: { readonly className?: string }) {
  return (
    <span className={`text-xl font-semibold tracking-tight ${className}`}>
      <span className="text-text">Date</span>
      <span className="text-primary">flow</span>
    </span>
  );
}
