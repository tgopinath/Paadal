/**
 * Extracts an ASIN from what a person pastes: a bare ASIN or an amazon.in
 * product link (/dp/…, /gp/product/…, /product/…). Short links (amzn.in/d/…)
 * hide the ASIN behind a redirect, so they're rejected with a hint.
 */
export function parseAsin(input: string): { asin: string } | { error: string } {
  const t = input.trim();
  if (/^[A-Za-z0-9]{10}$/.test(t)) return { asin: t.toUpperCase() };
  if (/amzn\.(in|to)\//i.test(t)) return { error: "Short links don't include the ASIN. Open the link and paste the full amazon.in address, or the ASIN itself." };
  const m = /\/(?:dp|gp\/product|gp\/aw\/d|product)\/([A-Za-z0-9]{10})(?:[/?#]|$)/i.exec(t);
  if (m) return { asin: m[1].toUpperCase() };
  return { error: "Paste a 10-character ASIN (like B0XXXXXXXX) or an amazon.in product link." };
}
