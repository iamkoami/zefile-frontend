/**
 * Story 135.11 — what a returning buyer should be shown on a stream sale page.
 *
 * ── Why this is a module and not four more conditionals in the page ──────────────────────
 *
 * `app/downloads/[transferId]/[shortCode]/page.tsx` is over 5,000 lines and the Buy button's
 * condition was already a two-clause boolean that nobody could evaluate by reading — which is how
 * Finding 1 below survived in a shipped build. This file is also the only part of the story that
 * can be reasoned about without a browser.
 *
 * ── THE DEFECT THIS EXISTS TO PREVENT ────────────────────────────────────────────────────
 *
 * Treating "I could not ask whether she owns it" as "she does not own it".
 *
 * That single substitution is Finding 1, it is what the page's `.catch(() => {})` used to do, and
 * it passes every static check in the project. The failure it produced was live: the page's idea
 * of "signed in" is a `localStorage` read that is never revalidated, so once the refresh cookie
 * lapsed a buyer who had paid was shown a purchase button, with the price beside it, and no email
 * box, no recovery affordance and no route back to her film.
 *
 * `purchaseCheck: 'unavailable'` is the type-level name for that ignorance. It is deliberately NOT
 * a boolean, because a boolean has nowhere to put "I don't know".
 *
 * The UX specification calls the shape this guards against "the most damaging [defect] this
 * feature could ship" (`ux-design-stream-playback.md:929-937`), and its copy rule is at `:902-904`:
 * on return with an expired session this must read as signing back in, never as a new purchase.
 */

/**
 * The four states a stream sale page can render for its viewer.
 *
 * ── Why there is no `unknown` member, though decision D1 lists one ───────────────────────
 *
 * D1's own definition of `unknown` is "could not ask AND a hint exists → treat as
 * `owner-signed-out`". A state whose definition is "treat it as another state" is not a state: it
 * would oblige every consumer to re-map it, and the first consumer that forgot would render
 * nothing at all. The ignorance it names is carried by `purchaseCheck: 'unavailable'` on the INPUT
 * side, where it belongs, and this union stays a closed set of things that can actually be drawn.
 */
export type StreamAccessState =
  /** No purchase known. Today's purchase action, unchanged. Every download page, always. */
  | 'visitor'
  /** Live session, settled purchase, access not withdrawn. Banner + resume. */
  | 'owner-active'
  /** She owns it, but this browser cannot prove a session. Sign-in framing, and NEVER a price. */
  | 'owner-signed-out'
  /** She owned it and the access has been withdrawn. Says so, and never offers a repurchase. */
  | 'owner-ended';

/**
 * What the server said when asked "does this caller own this film".
 *
 * `'unavailable'` covers a 401, a network failure, a 5xx, a 429, and never having asked at all
 * (an anonymous visitor). Every one of those means UNKNOWN and none of them mean "no".
 */
export type PurchaseCheckOutcome = 'owned' | 'not-owned' | 'unavailable';

export interface StreamAccessInput {
  /** False for every download transfer. See the early return in `resolveStreamAccessState`. */
  isStream: boolean;
  /**
   * A PROVEN session, not a `localStorage` read (D2).
   *
   * Derive it from the OUTCOME of the purchase check: a 2xx proves the JWT was accepted, a 401
   * proves it was not, regardless of what `localStorage` claims. Passing the page's
   * `isAuthenticated` in here re-creates Finding 1 exactly.
   */
  hasLiveSession: boolean;
  purchaseCheck: PurchaseCheckOutcome;
  /** `streamAccess === 'ended'` from the purchase check — a revoked entitlement (136.4's writer). */
  accessEnded: boolean;
  /** This browser has previously been told it owns this film. Advisory only — see the hint helpers. */
  hasOwnershipHint: boolean;
}

/**
 * Decide what to render. Pure — no storage reads, no network, no `window`.
 *
 * Precedence, and why it is this way round:
 *
 *   1. Not a stream transfer  → `visitor`, unconditionally. The download sale page must be
 *      byte-identical after this story (AC4), so nothing below can reach it.
 *   2. The server answered    → the server wins, in BOTH directions. `'not-owned'` from a live
 *      session is authoritative and outranks any hint, which is what stops a shared browser
 *      trapping its second user in sign-in framing for a film only its first user bought.
 *   3. The server could not answer → fall back to the hint for FRAMING ONLY.
 */
export function resolveStreamAccessState(input: StreamAccessInput): StreamAccessState {
  const { isStream, hasLiveSession, purchaseCheck, accessEnded, hasOwnershipHint } = input;

  if (!isStream) {
    return 'visitor';
  }

  if (purchaseCheck === 'owned') {
    return accessEnded ? 'owner-ended' : 'owner-active';
  }

  if (purchaseCheck === 'not-owned') {
    // A live session that says "you do not own this" is the only authoritative "no" in the system.
    return 'visitor';
  }

  // purchaseCheck === 'unavailable' — we do not know, and must not guess "no".
  //
  // `hasLiveSession` is false here by construction (an outcome we could not obtain cannot have
  // proven a session), so it is not re-tested. It stays on the input because it is what a reader
  // checks this reasoning against, and because 136.4 adds a state that needs it.
  if (hasOwnershipHint) {
    return 'owner-signed-out';
  }

  /*
   * THE RESIDUAL GAP, STATED RATHER THAN HIDDEN (D3).
   *
   * A returning owner on a new device or a cleared browser lands here and is shown the purchase
   * action. This is not an oversight and it cannot be closed in the browser: the server refuses to
   * answer "did this person buy this film" to an anonymous caller BY DESIGN, because doing so
   * re-creates the enumeration oracle that was deliberately removed from
   * `POST /transfers/:shortCode/buy/check` (Finding 2). AC2 and AC4 are the same request over the
   * wire — no credentials, a public URL — so no backend change separates them.
   *
   * Two things bound it, and both are real rather than planned:
   *   1. `StreamEligibilityService.assertNotAlreadyPurchased()` refuses the charge server-side
   *      with 409 `STREAM_ALREADY_PURCHASED`, so the worst case is a wasted click, never a second
   *      charge. The UI is not the gate.
   *   2. The page keeps an "already bought this?" affordance that routes to the IDENTITY OTP, so
   *      there is always a way back that does not pass through a purchase.
   */
  void hasLiveSession;
  return 'visitor';
}

/** True for the three states in which the buyer already owns the film. */
export function isOwnerState(state: StreamAccessState): boolean {
  return state !== 'visitor';
}

/**
 * ── The ownership hint ───────────────────────────────────────────────────────────────────
 *
 * A record that THIS BROWSER has bought THIS FILM. It is advisory, it is PII-free, and it grants
 * nothing: it selects framing, never access. The server still decides everything.
 *
 * ⚠ NO EMAIL, NO TOKEN, NO USER ID. The value is `true`. Anything richer would be a credential
 * sitting in `localStorage`, and this is a public page a buyer reaches from a shared link.
 */
const HINT_STORAGE_KEY = 'zefile_stream_access_hint';

type OwnershipHintMap = Record<string, true>;

function readHintMap(): OwnershipHintMap {
  // Next.js renders this page on the server first; `localStorage` does not exist there.
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(HINT_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    return parsed as OwnershipHintMap;
  } catch {
    // Corrupted value — treat as absent rather than throwing on a page render. The project's
    // error-handling rule for `localStorage` reads (`.claude/CLAUDE.md`), and losing a hint costs
    // the buyer one sign-in while a thrown parse error costs her the whole page.
    return {};
  }
}

/** Has this browser been told it owns this film? Framing only. */
export function hasOwnershipHint(shortCode: string | null | undefined): boolean {
  if (!shortCode) {
    return false;
  }
  return readHintMap()[shortCode] === true;
}

/**
 * Record that this browser owns this film. Called when a stream purchase completes and whenever
 * the purchase check answers `owned` (D3).
 *
 * ⚠ THIS KEY MUST SURVIVE `handleAuthFailure` (`services/api-client.ts`).
 *
 * That function clears `user`, both tokens and the Zustand stores when a session dies. Adding this
 * key to that teardown would delete the hint at precisely the moment it is needed — the expired
 * session of AC2 — and EVERY CHECK IN THIS PROJECT WOULD STILL PASS, because the resulting page
 * renders cleanly, throws nothing and logs nothing. It would simply show a paid buyer a Buy
 * button again, which is the defect this story exists to remove. Leave that function alone.
 *
 * Failures are swallowed on purpose: Safari private mode throws on `setItem` when the quota is
 * zero, and a buyer must never lose her purchase confirmation to a storage error. Losing the hint
 * degrades to the new-device gap documented above, which is bounded by the server-side refusal.
 */
export function rememberOwnershipHint(shortCode: string | null | undefined): void {
  if (!shortCode || typeof window === 'undefined') {
    return;
  }

  try {
    const map = readHintMap();
    if (map[shortCode] === true) {
      return;
    }
    map[shortCode] = true;
    window.localStorage.setItem(HINT_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // See above — advisory data, never worth an exception on a purchase-confirmation path.
  }
}

/** Exported for tests and for anyone auditing what this page writes about a buyer. */
export const OWNERSHIP_HINT_STORAGE_KEY = HINT_STORAGE_KEY;
