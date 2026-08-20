/**
 * `?next=` open-redirect guard. Everything that is not provably a
 * same-origin absolute path becomes "/". Apply this everywhere a `next`
 * value crosses a trust boundary: rendering the hidden field, reading it
 * back in the login Server Action, and proxy's already-signed-in bounce.
 * Missing any one of those three reopens the open redirect.
 */
const MAX_LENGTH = 512;
const BLOCKED_PREFIXES = ["/login", "/auth/"];

/**
 * True if `raw` contains a raw C0 control character (0x00-0x1F) or DEL
 * (0x7F) — e.g. an unescaped CR/LF that could be used for header-splitting
 * if this value were ever echoed into a header. Checked by char code
 * rather than a regex control-character class, so no literal control byte
 * has to live in this source file.
 */
function hasControlChar(raw: string): boolean {
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

export function sanitizeNextPath(raw: string | null | undefined): string {
  if (!raw || raw.length > MAX_LENGTH) return "/";
  // Must be a single-slash absolute path. Rejects "//evil.com" (protocol-
  // relative), "/\evil.com" (browsers normalize \ to /), and "https://evil".
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  // Rejects "/%0d%0aSet-Cookie:.." style header-splitting attempts.
  if (hasControlChar(raw)) return "/";

  let parsed: URL;
  try {
    parsed = new URL(raw, "http://sentinel.invalid");
  } catch {
    return "/";
  }
  // Belt and braces: anything that resolved off-origin is out.
  if (parsed.origin !== "http://sentinel.invalid") return "/";

  const path = parsed.pathname + parsed.search;
  // Never bounce back into the auth plumbing — that's how redirect loops start.
  if (BLOCKED_PREFIXES.some((p) => parsed.pathname === p || parsed.pathname.startsWith(p))) {
    return "/";
  }
  return path;
}
