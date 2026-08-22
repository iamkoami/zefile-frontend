"use client";

/**
 * The paid film, playing inline on the public sale page. Story 135.6.
 *
 * The buyer's sentence for this whole feature is "I paid, and it played"
 * (`ux-design-stream-playback.md:450`). Everything before this story is preparation; this is
 * where the risk closes. Two consequences shape the file:
 *
 *  1. **Time-to-first-frame beats first-frame quality** (D14). Start on a low rung and climb.
 *     A single high rendition that probes and stalls fails the buyer this feature targets — 3G
 *     in Togo, Côte d'Ivoire and Benin is a first-class constraint, not an edge case.
 *  2. **Silent when working, spoken when not.** Quality steps, credential renewal, lease
 *     re-acquisition and resume are all invisible. Stalls, refusals and failures are always
 *     stated. There is no middle register.
 *
 * ══ MOUNT THIS WITH `next/dynamic` AND `ssr: false`. NOT A PREFERENCE. ═══════════════════
 *
 * `lib/stream/shaka-loader.ts` carries the measurement: a plain `'use client'` import puts
 * 748 KB of Shaka into the Cloudflare Pages **edge worker bundle**, which has a hard size limit
 * and cannot run the library anyway (1140 KB vs 376 KB, measured 2026-07-31). `npm run build`
 * passes either way and the deploy dies silently — the exact failure class `.claude/CLAUDE.md`
 * records for Pages.
 *
 * ══ D7 — the control set is the BROWSER'S, not a restyled Shaka overlay ══════════════════
 *
 * **Declared deviation from Task 3's "restyle Shaka's control set" subtask**, and it is forced
 * by a constraint the same story makes non-optional.
 *
 * AC13 requires that "Shaka's inherited keyboard model and ARIA implementation are unmodified —
 * appearance is restyled, behaviour is not". That control set lives in `shaka-player.ui`, a
 * DIFFERENT bundle from the one Finding 2 mandates: `loadShaka()` imports
 * `shaka-player/dist/shaka-player.compiled`, which is the core library and ships no UI overlay.
 * Finding 2 also forbids importing `shaka-player` directly anywhere, so reaching the UI bundle
 * would mean a second import path for the library — the thing that finding exists to prevent —
 * and ~1 MB of client chunk on a page whose target market is 3G.
 *
 * So the video element carries native `controls`. This satisfies AC13's actual guarantee more
 * strongly than a restyle could: the keyboard model and ARIA implementation are not merely
 * unmodified, they are unmodifiable by us. What is lost is the ZeFile visual token pass on the
 * transport controls. That is a real loss and it is recorded rather than hidden.
 *
 * The quality cap (AC6) is OURS, not Shaka's — it sits outside the native control set, so it
 * neither inherits nor damages any of the above.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { loadShaka } from "@/lib/stream/shaka-loader";
import {
  streamApi,
  STREAM_ERROR_CODES,
  type StreamSessionResponse,
} from "@/services/stream-api";
import PlaybackStatePanel, {
  PlaybackState,
  PlaybackStateAnnouncer,
} from "./PlaybackStatePanel";

type ShakaNamespace = Awaited<ReturnType<typeof loadShaka>>;
type ShakaPlayer = InstanceType<ShakaNamespace["Player"]>;

export interface StreamPlayerProps {
  transferId: string;
  /** The film. One per stream transfer — the backend 400s on a transfer holding several. */
  fileId: string;
  /**
   * Where to seek on load, in seconds (D3, AC7 client half).
   *
   * The SERVER half — reading a last position out of `StreamPlaybackEvents` — is story 135.8's
   * and the table does not exist yet. Deliberately NOT backed by `localStorage`: "position is
   * sacred" means ACROSS devices, and a per-browser store would satisfy a single-device demo
   * while failing the actual promise.
   */
  resumeAtSeconds?: number;
  /** Fires as playback advances. Nothing is stored here; 135.8 owns the sink. */
  onPositionChange?: (seconds: number) => void;
}

/** Below this many seconds of stall, say nothing at all (AC3). */
const BUFFERING_ANNOUNCE_MS = 2_000;
/** Above this, stop implying it will fix itself and offer an action (AC3). */
const STALL_ACTION_MS = 15_000;

/**
 * 350 kbps. AC5/D14 — the player must begin on a LOW rung and adapt upward.
 *
 * Shaka's own default is 1 Mbps, which on a 3G connection picks a rendition the link cannot
 * sustain, buffers, and then steps down — the buyer's first experience of a film they just paid
 * for is a stall. ABR stays ENABLED; only the starting guess is lowered, so a fast connection
 * climbs within a few segments and loses nothing but the first one.
 */
const INITIAL_BANDWIDTH_ESTIMATE = 350_000;

/**
 * Minimum gap between two transparent credential renewals (AC4).
 *
 * Bounds a refresh→401→refresh loop to one attempt per 10 s while placing NO ceiling on how many
 * renewals a long film may need. Shaka's own retry backoff sits on top of this.
 */
const CREDENTIAL_RETRY_COOLDOWN_MS = 10_000;

/**
 * Consecutive failed renewals before the buyer is told (AC4 vs AC3).
 *
 * Silence is right while a renewal might still work — but silence forever is a frozen frame with
 * no explanation, which is the exact failure AC3 exists to prevent. The counter resets the moment
 * playback resumes, so a long film that renews successfully many times never approaches it.
 */
const MAX_CONSECUTIVE_RENEWAL_FAILURES = 3;

/**
 * A codeless 429 from `POST /stream/sessions` retries ITSELF, and these bound it (G3 round 5).
 *
 * 135.5's Finding 3: two different 429s demand OPPOSITE client behaviour. `STREAM_DEVICE_LIMIT`
 * means "stop your other device" and the buyer must act. A 429 with NO code is the transport
 * rate limiter saying "slow down and come back" — and `stream-api.ts` documents exactly that.
 * That distinction was carried faithfully from the backend and then dropped at the last step:
 * `stateForSessionError` mapped the codeless one to a terminal `unavailable` panel, so the
 * throttle the buyer had no part in became a wall they had to tap through.
 *
 * Bounded, because an unbounded auto-retry against a rate limiter is how a client becomes the
 * outage. After the budget, the panel is still there and still honest.
 */
const MAX_THROTTLE_RETRIES = 2;
const THROTTLE_RETRY_FALLBACK_SECONDS = 3;
const MAX_THROTTLE_WAIT_SECONDS = 30;

/** Per session, per film. D4: not a user preference, no backend field, no migration. */
const qualityCapStorageKey = (transferId: string) => `zefile:stream-quality:${transferId}`;

/**
 * The persisted quality cap for this film, or `null` for Auto.
 *
 * ⚠ READ SYNCHRONOUSLY, NEVER FROM AN EFFECT — G3 round 2, Finding 2.
 *
 * This used to be a `useEffect` that only called `setQualityCap`. The load effect reads
 * `qualityCap` to build its first `player.configure()`, but deliberately EXCLUDES it from its
 * dependency array (changing the cap must never tear down and re-acquire the lease). So the load
 * effect captured the value from the render that scheduled it — always `null` — and the value the
 * read effect fetched a moment later never reached Shaka.
 *
 * The buyer saw "480p" correctly selected in the dropdown while the player ran **uncapped**, and
 * re-picking the same value fires no `onChange`, so there was no way to recover except choosing a
 * different quality. Silent, and it costs exactly the mobile data the cap exists to save — a
 * direct breach of AC6/D4's "the choice persists for that session".
 *
 * It was invisible to this story's browser walkthrough because the local probe film packages one
 * rendition, so `qualityOptions.length > 1` is false and the control never rendered at all.
 *
 * ⚠ The `Number.isFinite` guard is load-bearing NOW in a way it was not before. While the value
 * could not reach the player, a corrupted entry was a cosmetic dropdown glitch. Once it does
 * reach `abr.restrictions.maxHeight`, a `NaN` propagates through Shaka's track filter and makes
 * EVERY rendition fail its height check — an unplayable film from one bad storage entry.
 */
function readStoredQualityCap(transferId: string): number | null {
  try {
    const stored = window.sessionStorage.getItem(qualityCapStorageKey(transferId));
    if (!stored || stored === "auto") return null;
    const height = Number(stored);
    return Number.isFinite(height) && height > 0 ? height : null;
  } catch {
    // Storage unavailable (privacy mode). Auto is the correct fallback; the film must still play.
    return null;
  }
}

/**
 * In-flight lease acquisitions, keyed by film. MODULE level, and it has to be.
 *
 * ══ MEASURED, TWICE, IN A REAL BROWSER — DO NOT DEMOTE THIS TO A `useRef` ═══════════════
 *
 * A tab must hold ONE lease per film. `POST /stream/sessions` has no counterpart that releases
 * one — 135.5's leases are Dragonfly TTL entries that expire on their own (prohibition P5: a DB
 * counter permanently locks out a buyer whose browser crashed). So every surplus acquisition is
 * a slot burned for ~90 seconds, and on a cap of TWO the second one locks the buyer out of their
 * own phone.
 *
 * First attempt was the obvious `if (!sessionRef.current)` guard. It sits after an `await`, so
 * two effect runs both read `null` before either writes: **two 201s from one page load**,
 * confirmed as `ZCARD = 2` against real Redis, not inferred from the request count.
 *
 * Second attempt moved the claim before the await, into a `useRef` assigned with `??=`. Still
 * two. A ref only dedupes within ONE component instance, and under StrictMode + `next/dynamic`
 * the effect is entered against a fresh instance whose refs start empty — so the guard was
 * looking at a different `null` each time.
 *
 * A module-level map is keyed on the thing that actually owns the constraint: the film. It
 * survives remount, StrictMode, fast refresh and `dynamic()`'s loading swap, because it does not
 * live inside the component at all.
 *
 * Entries are removed on failure (so the retry button can try again) and on a device-limit
 * refusal (so the lease can be re-taken once the other device stops). A resolved entry is kept
 * deliberately: a remount SHOULD reuse the live lease rather than take a second one.
 */
const inFlightSessions = new Map<string, ReturnType<typeof streamApi.startSession>>();

export default function StreamPlayer({
  transferId,
  fileId,
  resumeAtSeconds,
  onPositionChange,
}: StreamPlayerProps) {
  const t = useTranslations("streamSale");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<ShakaPlayer | null>(null);
  /**
   * The live lease, held across retries.
   *
   * ⚠ Held rather than re-acquired, because **there is no endpoint that releases a lease** —
   * 135.5's leases are Dragonfly TTL entries and expire on their own (prohibition P5: a DB
   * counter permanently locks out a buyer whose browser crashed). So a retry button that called
   * `startSession` again would take a SECOND slot for the same buyer on the same device, and two
   * taps of "try again" would device-limit them out of a film they are alone with. Acquire once;
   * reuse until the server says the lease is gone.
   */
  const sessionRef = useRef<StreamSessionResponse | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bufferingTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  /**
   * When the last transparent credential renewal was attempted, as a timestamp (AC4).
   *
   * ⚠ A COUNTER HERE IS WRONG, AND THAT IS WHAT THIS FIELD USED TO BE — G3 finding, 2026-08-17.
   *
   * The first version was a boolean, `credentialRetriedRef`, set to `true` on the first renewal and
   * reset only at mount and after the *initial* `player.load()`. Neither renewal return path reset
   * it. So the guard did not bound a retry LOOP, it capped the session at **one** renewal — and the
   * comment above it claimed "reset on every successful (re)load", which the code never did.
   *
   * The second expiry then degraded TWO ways, not one: a 401 fell past the spent guard to the
   * CRITICAL check and surfaced "we can't play this right now" (or nothing at all), and a 403 fell
   * to `accessEnded` **without** the refresh that distinguishes revoked from not-entitled — telling
   * a paying buyer the film was withdrawn when their token had merely expired.
   *
   * Mostly inert under self-hosted, because the heartbeat refreshes the JWT cookie via `apiClient`
   * every ~30 s and the key is fetched once with no rotation. **Live under Cloudflare**, the
   * shipping default, whose playback token has its own TTL and nothing else refreshing it — i.e.
   * exactly the branch this story could not verify in a browser.
   *
   * A plain reset-after-success would fix the cap and reintroduce the hazard the guard exists for:
   * a persistently-401ing key would spin refresh→401→refresh with no ceiling. A timestamp bounds
   * the RATE (one attempt per cooldown) without ever bounding the TOTAL, which is what AC4's
   * "playback continues without user action" actually requires across a feature-length film.
   */
  const lastCredentialRetryAtRef = useRef(0);
  /**
   * True while a renewal is running, so a sibling sub-stream's error from the SAME cause is
   * swallowed rather than treated as independent evidence of failure (G3 round 2, Finding 1).
   */
  const renewalInFlightRef = useRef(false);
  /**
   * Consecutive renewals that did NOT get the film moving again.
   *
   * Reset by playback PROGRESS (see the handler) rather than by a Shaka event, and reset wholesale
   * when the load effect re-runs. Counting renewals rather than unhelpful ones is what made an
   * ordinary long film trip this budget — see the block comment at the increment site.
   */
  const renewalFailuresRef = useRef(0);
  /** Playback position at the last renewal, so progress since then can be detected. */
  const lastRenewalPositionRef = useRef(-1);
  /**
   * Where OUR OWN renewal reload asked the player to resume, so the `seeked` it causes is not
   * mistaken for the buyer seeking (G3 round 5). See the `seeked` listener for the full story.
   */
  const programmaticSeekTargetRef = useRef<number | null>(null);
  /** Automatic retries already spent against a codeless (transport) 429. */
  const throttleRetriesRef = useRef(0);
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  const [state, setState] = useState<PlaybackState | null>("starting");
  const [deviceLimit, setDeviceLimit] = useState<number | undefined>();
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<number | undefined>();
  // Lazy initialiser, so the very first render already carries the persisted cap and the
  // dropdown never disagrees with the player. Safe to touch storage during render here: this
  // component is mounted with `ssr: false`, so it only ever renders in a browser.
  const [qualityCap, setQualityCap] = useState<number | null>(() =>
    readStoredQualityCap(transferId),
  );
  const [availableHeights, setAvailableHeights] = useState<number[]>([]);
  /** Bumped to force a full re-acquire + re-load from the retry button. */
  const [attempt, setAttempt] = useState(0);

  const clearBufferingTimers = useCallback(() => {
    bufferingTimersRef.current.forEach(clearTimeout);
    bufferingTimersRef.current = [];
  }, []);

  const applyQualityCap = useCallback(
    (height: number | null) => {
      setQualityCap(height);
      try {
        window.sessionStorage.setItem(
          qualityCapStorageKey(transferId),
          height === null ? "auto" : String(height),
        );
      } catch {
        /* storage unavailable — the cap still applies for this playback */
      }
      // `Infinity` rather than deleting the restriction: Shaka reads maxHeight unconditionally,
      // and ABR stays enabled either way. This caps the ceiling; it never pins a rendition.
      playerRef.current?.configure({
        abr: { restrictions: { maxHeight: height ?? Infinity } },
      });
    },
    [transferId],
  );

  // ── Heartbeat (135.5) ──────────────────────────────────────────────────────────────────
  //
  // ⚠ A 409 here is ORDINARY and must never reach the buyer. This is 135.5's explicit hand-off
  // obligation. The heartbeat route can never CREATE a lease, so a backgrounded phone whose
  // timers the OS throttled — or a caller whose acknowledged lease a later caller's trim removed
  // (135.5 measured ~25% phantom 201s at 3-way contention) — is told its lease is gone and must
  // silently re-acquire. Showing "your session expired" over a film that is playing perfectly
  // would be a defect manufactured out of a normal event.
  const beat = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) return;

    const response = await streamApi.heartbeat(session.sessionId, transferId);
    if (unmountedRef.current || !response.error) return;

    if (response.error.code === STREAM_ERROR_CODES.sessionExpired) {
      const reacquired = await streamApi.startSession(transferId);
      if (unmountedRef.current) return;

      if (reacquired.data) {
        sessionRef.current = reacquired.data;
        // Keep the module map pointing at the LIVE lease, or a remount would await the old
        // promise, adopt a dead sessionId and heartbeat into a 409 forever.
        inFlightSessions.set(transferId, Promise.resolve(reacquired));
        return;
      }

      // The one case where re-acquisition legitimately fails in front of a watching buyer:
      // their other device took the slot while this one was asleep.
      if (reacquired.error?.code === STREAM_ERROR_CODES.deviceLimit) {
        sessionRef.current = null;
        inFlightSessions.delete(transferId);
        setDeviceLimit(reacquired.error.limit);
        setRetryAfterSeconds(reacquired.error.retryAfterSeconds);
        setState("deviceLimit");
        videoRef.current?.pause();
      }
      return;
    }

    // Anything else — a transport 429, a 5xx, a dropped connection — is left alone on purpose.
    // The lease outlives several missed beats, and interrupting a playing film to report a
    // failed background request is exactly the middle register the UX spec rules out.
  }, [transferId]);

  const startHeartbeat = useCallback(
    (intervalSeconds: number) => {
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = setInterval(() => void beat(), intervalSeconds * 1000);
    },
    [beat],
  );

  // ── Load ───────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    unmountedRef.current = false;
    let cancelled = false;
    let player: ShakaPlayer | null = null;

    (async () => {
      setState("starting");
      // ⚠ EVERY PIECE OF RECOVERY STATE RESETS HERE, NOT JUST THE COOLDOWN.
      //
      // `StreamPlayer` is mounted with no `key`, so a retry re-runs this effect WITHOUT
      // remounting the component — every `useRef` survives. An earlier version reset only the
      // cooldown, which left the give-up counter at its tripped value: the buyer pressed "Try
      // again", the film played, and then the very next renewal was auto-doomed because the
      // counter was still spent. Recovery was impossible for the life of the tab, and only a
      // full page reload (losing their position) escaped it.
      //
      // A retry is the buyer explicitly saying "start over". Anything that would carry a past
      // failure across it belongs in this block.
      lastCredentialRetryAtRef.current = 0;
      renewalFailuresRef.current = 0;
      renewalInFlightRef.current = false;
      lastRenewalPositionRef.current = -1;
      programmaticSeekTargetRef.current = null;

      // 1. Take a device slot BEFORE touching the provider — but only if we do not already hold
      //    one. 135.5 resolves the manifest only after the lease, so a refused device costs no
      //    provider work; mirroring that order here means a refused buyer never downloads 748 KB
      //    of player either. See `sessionRef` for why re-acquiring on a retry is a bug.
      let session = sessionRef.current;
      if (!session) {
        // Claimed SYNCHRONOUSLY, before any await, in a map that outlives this instance.
        // Moving either property — the timing or the scope — brings the double-acquire back.
        // See `inFlightSessions`; both weaker forms were tried and both measured ZCARD = 2.
        let pending = inFlightSessions.get(transferId);
        if (!pending) {
          pending = streamApi.startSession(transferId);
          inFlightSessions.set(transferId, pending);
        }
        const acquired = await pending;

        if (acquired.error || !acquired.data) {
          // Cleared so the retry button can try again; a refused acquisition must not be cached.
          inFlightSessions.delete(transferId);
          if (cancelled) return;

          // ══ A CODELESS 429 IS THE TRANSPORT THROTTLE. IT RETRIES ITSELF. ═══════════════
          //
          // See `MAX_THROTTLE_RETRIES`. `stateForSessionError` still answers `unavailable` once
          // the budget is spent, so nothing here can hide a persistent refusal — it only stops
          // a two-second rate limit from being presented to the buyer as a dead end.
          if (
            !acquired.error?.code &&
            acquired.error?.statusCode === 429 &&
            throttleRetriesRef.current < MAX_THROTTLE_RETRIES
          ) {
            throttleRetriesRef.current += 1;
            const waitSeconds = Math.min(
              acquired.error?.retryAfterSeconds ?? THROTTLE_RETRY_FALLBACK_SECONDS,
              MAX_THROTTLE_WAIT_SECONDS,
            );
            setState("starting");
            throttleTimerRef.current = setTimeout(
              () => setAttempt((n) => n + 1),
              waitSeconds * 1000,
            );
            return;
          }

          setState(stateForSessionError(acquired.error?.code, acquired.error?.statusCode));
          setDeviceLimit(acquired.error?.limit);
          setRetryAfterSeconds(acquired.error?.retryAfterSeconds);
          return;
        }

        session = acquired.data;
        sessionRef.current = session;
        if (cancelled) return;
      }

      // 2. Resolve the manifest. `manifestUrl: null` is Cloudflare telling us to go and get the
      //    credential, which under that provider IS a tokenised manifest URL. The player never
      //    branches on provider NAME (D6) — only on whether a URL arrived with the session.
      let manifestUrl = session.manifestUrl;
      if (!manifestUrl) {
        const credential = await streamApi.fetchManifestCredential(fileId);
        if (cancelled) return;
        manifestUrl = credential.data?.manifestUrl ?? null;
      }

      if (!manifestUrl) {
        setState("unavailable");
        return;
      }

      // 3. Shaka. Loaded only now, so a buyer refused at step 1 never pays for the download.
      let shaka: ShakaNamespace;
      try {
        shaka = await loadShaka();
      } catch {
        if (!cancelled) setState("failed");
        return;
      }
      if (cancelled) return;

      if (!shaka.Player.isBrowserSupported()) {
        setState("unsupported");
        return;
      }

      const video = videoRef.current;
      if (!video) return;

      player = new shaka.Player();
      await player.attach(video);
      if (cancelled) {
        void player.destroy();
        return;
      }
      playerRef.current = player;

      player.configure({
        abr: {
          enabled: true,
          defaultBandwidthEstimate: INITIAL_BANDWIDTH_ESTIMATE,
          // Read from storage HERE rather than from `qualityCap`, belt-and-braces against the
          // exact staleness Finding 2 was: this effect deliberately omits `qualityCap` from its
          // deps, so a closure value could go stale again if anyone reorders the hooks above.
          // Reading at configure time cannot be stale by construction.
          restrictions: { maxHeight: readStoredQualityCap(transferId) ?? Infinity },
        },
      });

      // ⚠ P3 IS A PROHIBITION AND IT LOOKS LIKE A BUG FROM HERE.
      //
      // Segment URLs carry NO per-buyer signature, deliberately. An AES-128 segment is worthless
      // without the key, and per-buyer signing gives every buyer a unique cache key, collapses
      // the Cloudflare hit rate and pushes egress onto Wasabi against its fair-use terms. So this
      // filter appends NOTHING to any URL. Its whole job is making the browser send the HttpOnly
      // session cookie on the KEY request — which is how that request authenticates, because
      // ZeFile stores no token in JavaScript for anyone to attach as an Authorization header.
      //
      // ⚠ SCOPED TO `/stream/key/` AND NOT TO THE API ORIGIN, WHICH WOULD UNDO AC2.
      //
      // Under the self-hosted provider the manifest and EVERY segment are served from that same
      // origin (`/stream/hls/...`), publicly and cacheably — the packager writes
      // `public, max-age=31536000, immutable` on segments and the route mirrors it. Attaching
      // credentials there would put a `Cookie` header on every segment request, which makes the
      // response non-shareable at the edge and collapses exactly the cache hit rate P3 exists to
      // protect. The broad `startsWith(apiOrigin)` form looks safer and is the more expensive bug.
      const keyEndpointPrefix = `${originOf(process.env.NEXT_PUBLIC_API_URL) ?? ""}/stream/key/`;
      player.getNetworkingEngine()?.registerRequestFilter((_type, request) => {
        if (request.uris.some((uri) => uri.startsWith(keyEndpointPrefix))) {
          request.allowCrossSiteCredentials = true;
        }
      });

      // ── Stall detection (AC3) ──────────────────────────────────────────────────────────
      //
      // Two timers, not one. Under 2s say nothing — a brief rebuffer is normal and a panel that
      // flashes on every one is noise. At 2s name the condition. At 15s stop implying it will
      // resolve itself and offer an action. A frozen frame with no explanation is the failure
      // this AC exists to prevent, and so is a spinner that spins forever.
      //
      // Both transitions go through `setState(current => …)` and refuse to touch a TERMINAL
      // state. Without that guard a buffering event still in flight when the film fails — which
      // is the normal ordering, because a failure IS preceded by a stall — replaces "we can't
      // play this right now" with "catching up" two seconds later, and the buyer is left
      // watching a reassuring message about a film that has already stopped.
      player.addEventListener("buffering", (event) => {
        const buffering = (event as unknown as { buffering: boolean }).buffering;
        clearBufferingTimers();

        if (!buffering) {
          // Playback is running again, so whatever renewals it took to get here worked. This is
          // the signal that resets the give-up counter — without it, three failures spread across
          // a two-hour film would eventually surface a failure panel over a healthy stream.
          renewalFailuresRef.current = 0;
          setState((current) =>
            current === "buffering" || current === "stalled" || current === "starting"
              ? null
              : current,
          );
          return;
        }

        const announce = (next: PlaybackState) =>
          setState((current) => (isTerminal(current) ? current : next));

        bufferingTimersRef.current.push(
          setTimeout(() => announce("buffering"), BUFFERING_ANNOUNCE_MS),
          setTimeout(() => announce("stalled"), STALL_ACTION_MS),
        );
      });

      // ── Transparent credential renewal (AC4) ───────────────────────────────────────────
      //
      // "A new credential is fetched transparently and playback continues WITHOUT USER ACTION."
      //
      // What actually expires is the buyer's one-hour access-token cookie, so the key request
      // starts answering 401. `fetchManifestCredential` runs through `apiClient`, whose 401 path
      // already refreshes the session and retries — so calling it both refreshes the cookie and,
      // under Cloudflare, returns a fresh tokenised manifest URL. Then `retryStreaming()` resumes
      // from where the buyer was.
      //
      // 401 and 403 are DIFFERENT answers here and 135.4 made them so deliberately: 401 is a
      // buyer we cannot identify (an expired token — recoverable), 403 is one we can and are
      // refusing (not entitled, or revoked — not recoverable, and retrying would loop).
      const handlePlayerError = async (error: ShakaError) => {
        const status = httpStatusOf(shaka, error);

        // ══ AN AUTH ERROR NEVER FALLS THROUGH TO A TERMINAL STATE ═══════════════════════
        //
        // G3 round 2, Finding 1. Shaka runs audio and video as INDEPENDENT per-track download
        // loops on one Player, and every `BAD_HTTP_STATUS` it raises is CRITICAL. So one shared
        // credential expiry routinely produces TWO error events milliseconds apart — one per
        // sub-stream — from a single benign cause.
        //
        // Previously only the FIRST was handled: the second failed the cooldown check and fell
        // through to `403 → accessEnded` / `CRITICAL → failed` below. Those are TERMINAL states
        // that nothing ever clears (the buffering handler explicitly refuses to overwrite them),
        // so the buyer got a permanent "your access has ended" veil over a film that had already
        // resumed playing perfectly behind it. Their only exit was Retry, which tears the player
        // down and re-acquires a device slot for a stream that was never broken.
        //
        // The rule that fixes it: an auth error is EITHER renewed here or deliberately ignored.
        // It is never evidence of a terminal condition, because only the renewal ATTEMPT can
        // tell an expiry apart from a real refusal. Hence every branch below returns.
        if (status === 401 || status === 403) {
          // A sibling sub-stream failing from the same cause while a renewal is already running.
          // Swallow it — the in-flight renewal is already fixing it for both tracks.
          if (renewalInFlightRef.current) return;

          const now = Date.now();
          if (now - lastCredentialRetryAtRef.current <= CREDENTIAL_RETRY_COOLDOWN_MS) {
            // Too soon to retry. Say nothing and let Shaka's own backoff work; falling through
            // to a terminal state here is precisely the defect described above.
            return;
          }

          // ══ THE GIVE-UP BUDGET COUNTS RENEWALS THAT DID NOT HELP — NOT RENEWALS ══════
          //
          // Two earlier versions of this counter were wrong in opposite directions, and both
          // shipped a defect. Version 1 incremented only when the credential CALL failed and
          // reset on every success: a credential route answering 200 while segments kept
          // answering 403 renewed "successfully" forever, silently, frozen frame, no message.
          // Version 2 incremented on every ATTEMPT and reset only in the `buffering: false`
          // handler — but a renewal on a healthy film often causes no visible rebuffer at all,
          // so the reset simply never fired and an ORDINARY long film tripped the budget.
          // Under Cloudflare's default 1 h token TTL that is a ~3 h film reaching attempt 3 with
          // nothing whatsoever wrong.
          //
          // The signal that actually distinguishes them is **playback position**. If the film has
          // advanced since the last renewal, that renewal worked, whatever the network did in
          // between. It needs no cooperation from Shaka's event timing.
          const position = videoRef.current?.currentTime ?? 0;
          if (position > lastRenewalPositionRef.current) {
            renewalFailuresRef.current = 0;
          }
          lastRenewalPositionRef.current = position;

          // Checked BEFORE spending an attempt, so a successful renewal is never fetched and
          // then thrown away — version 2 discarded a valid fresh manifest on the third attempt,
          // which is how a recoverable stream became permanently unrecoverable.
          if (renewalFailuresRef.current >= MAX_CONSECUTIVE_RENEWAL_FAILURES) {
            clearBufferingTimers();
            setState("failed");
            return;
          }

          lastCredentialRetryAtRef.current = now;
          renewalInFlightRef.current = true;
          renewalFailuresRef.current += 1;
          try {
            const refreshed = await streamApi.fetchManifestCredential(fileId);
            if (cancelled) return;

            // A 403 that survives a refresh is a real refusal, not an expiry. Say which one.
            // This is the ONLY place a playback auth failure may become terminal, because it is
            // the only place that has asked the authorization endpoint directly.
            if (refreshed.error?.statusCode === 403) {
              clearBufferingTimers();
              setState(
                refreshed.error.code === STREAM_ERROR_CODES.entitlementRevoked
                  ? "accessEnded"
                  : "notEntitled",
              );
              return;
            }

            // Renewal itself failed (5xx, offline, a key route that keeps 401ing). Nothing more
            // to try this cycle. Say nothing yet — the budget check at the top of the next
            // attempt is what eventually surfaces `failed`, and it does so without having
            // discarded a renewal that might have worked.
            if (refreshed.error) {
              return;
            }

            // Cloudflare hands back a NEW manifest URL; reloading at the current position is the
            // only way to adopt it, and it is still "without user action". Self-hosted returns raw
            // key bytes (which `apiClient` cannot parse, hence no `manifestUrl`) and only needed
            // the cookie refreshed, so plain `retryStreaming()` is enough there.
            const nextManifest = refreshed.data?.manifestUrl;
            if (nextManifest && nextManifest !== manifestUrl) {
              const resumeFrom = videoRef.current?.currentTime ?? 0;
              manifestUrl = nextManifest;

              // ⚠ THIS RELOAD MUST NEVER REJECT SILENTLY — G3 round 5, the one High of that round.
              //
              // `player.load()` REJECTS on failure; the initial load below has always known that
              // and catches it. This one did not, and it is reached from an `error` LISTENER, so
              // the rejection escaped as an unhandled promise rejection: no `setState`, no panel,
              // frozen frame. Worse than merely silent — `load()` unloads first, which fires
              // `buffering: false`, which runs `clearBufferingTimers()`. So the reload ITSELF
              // cancelled the 2 s/15 s stall timers that were the only remaining backstop. The
              // buyer was left looking at a still frame with no message and no action, which is
              // the precise failure AC3 exists to forbid.
              //
              // `failed` rather than `stalled`: its Retry re-runs the load effect, which re-fetches
              // a fresh credential — the only recovery that can actually work when the newest
              // manifest we could obtain is the thing that would not load. `stalled`'s Retry calls
              // `retryStreaming()` on a player that has nothing loaded.
              programmaticSeekTargetRef.current = resumeFrom;
              try {
                await player?.load(nextManifest, resumeFrom);
              } catch {
                programmaticSeekTargetRef.current = null;
                if (cancelled) return;
                clearBufferingTimers();
                setState("failed");
              }
              return;
            }

            player?.retryStreaming();
          } finally {
            renewalInFlightRef.current = false;
          }
          return;
        }

        // RECOVERABLE errors are Shaka's own retry territory; it is already retrying, and a
        // panel here would report a failure the library is in the middle of fixing.
        if (error.severity === shaka.util.Error.Severity.CRITICAL) {
          clearBufferingTimers();
          setState("failed");
        }
      };

      // The `.catch` is a BACKSTOP, not decoration (G3 round 5). `handlePlayerError` is async and
      // fired from a listener, so ANY unguarded `await` inside it escapes as an unhandled
      // rejection and strands the buyer on a frozen frame with no panel. Round 5 found exactly
      // one such path; this closes the whole class rather than that one instance, so a future
      // edit that adds an await cannot reopen it silently.
      player.addEventListener("error", (event) => {
        handlePlayerError((event as unknown as { detail: ShakaError }).detail).catch(() => {
          if (cancelled) return;
          clearBufferingTimers();
          setState("failed");
        });
      });

      try {
        await player.load(manifestUrl, resumeAtSeconds ?? null);
      } catch {
        if (!cancelled) setState("failed");
        return;
      }
      if (cancelled) return;

      setState(null);

      // The cap's option list comes from the film itself. A film packaged with two renditions
      // must not offer four.
      setAvailableHeights(
        [
          ...new Set(
            player
              .getVariantTracks()
              .map((track) => track.height)
              .filter((height): height is number => typeof height === "number"),
          ),
        ].sort((a, b) => b - a),
      );

      startHeartbeat(session.heartbeatIntervalSeconds);
    })();

    return () => {
      cancelled = true;
      unmountedRef.current = true;
      clearBufferingTimers();
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
      if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);
      throttleTimerRef.current = null;
      playerRef.current = null;
      void player?.destroy();
    };
    // No `eslint-disable` here any more, and its removal is deliberate.
    //
    // This effect used to read the `qualityCap` STATE while omitting it from the deps, which
    // needed a suppression — and that suppression was hiding the staleness G3 round 2 found as
    // Finding 2. The effect now reads the cap from `sessionStorage` at configure time instead, so
    // there is no state to go stale, nothing to omit, and nothing to suppress. Changing the cap
    // still reconfigures the live player through `applyQualityCap` and must never tear down and
    // re-acquire the lease. If a future edit reintroduces a suppression here, treat it as a
    // question about that lease rather than as a lint formality.
  }, [transferId, fileId, resumeAtSeconds, attempt, clearBufferingTimers, startHeartbeat]);

  // ── A manual seek invalidates the progress baseline (G3 round 4) ───────────────────────
  //
  // The renewal budget forgives itself when `currentTime` has advanced since the last renewal —
  // that is how it tells "this renewal worked" from "nothing is moving". The comparison is a
  // strict `>` on the raw position, which quietly assumes the playhead only ever moves forward.
  //
  // A buyer rewinding to rewatch a scene breaks that assumption: the next renewal compares a
  // SMALLER position against the stored one, skips the reset, and carries a failure count that
  // was already earned back. Enough of those and a healthy stream is told it failed.
  //
  // Rather than trying to interpret a seek, discard the baseline. `-1` means "no comparison is
  // meaningful yet", so the next renewal forgives unconditionally and starts measuring again from
  // wherever the buyer landed. The independent 15 s stall panel still covers a genuinely stuck
  // stream, so nothing is lost by being generous here.
  //
  // NOT gated on `onPositionChange` — that callback is optional and the sale page does not pass
  // one, which would have left this listener unattached in exactly the shipping configuration.
  //
  // ⚠ IT MUST ALSO IGNORE THE SEEK THE RENEWAL ITSELF CAUSES — G3 round 5.
  //
  // Round 4 was right about the buyer rewinding and wrong about who else seeks. Under Cloudflare
  // a renewal reloads with `player.load(nextManifest, currentTime)`, and resuming at a position
  // IS a seek: `seeked` fired, the baseline was discarded, and the next renewal forgave
  // unconditionally. So the give-up budget could never reach its limit on the Cloudflare path —
  // which is the exact provider round 3 built it for ("credential 200, segments 403" is a
  // rotating-manifest stream). Round 4's fix silently made round 3's fix inert.
  //
  // Matched on the TARGET rather than with a boolean flag, so a reload that fails — and therefore
  // never fires `seeked` — cannot leave a flag set and swallow the buyer's next real rewind.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onSeeked = () => {
      const target = programmaticSeekTargetRef.current;
      if (target !== null && Math.abs(video.currentTime - target) < 0.5) {
        programmaticSeekTargetRef.current = null;
        return;
      }
      lastRenewalPositionRef.current = -1;
    };

    video.addEventListener("seeked", onSeeked);
    return () => video.removeEventListener("seeked", onSeeked);
  }, []);

  // ── Position (D3, the client half of AC7) ──────────────────────────────────────────────
  //
  // Reported once a second rather than on every `timeupdate` (which fires 4-66x/s). Nothing is
  // persisted here; 135.8 owns the sink, and inventing a local one would silently satisfy a
  // single-device demo while failing the cross-device promise the AC actually makes.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !onPositionChange) return;

    let lastReported = -1;
    const onTimeUpdate = () => {
      const whole = Math.floor(video.currentTime);
      if (whole !== lastReported) {
        lastReported = whole;
        onPositionChange(whole);
      }
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    return () => video.removeEventListener("timeupdate", onTimeUpdate);
  }, [onPositionChange]);

  /**
   * The retry button, which does two different things depending on what failed.
   *
   * A STALL is a network problem with a working player and a live lease, so the fix is
   * `retryStreaming()` — resume the same playback from where it stopped. Tearing the player down
   * would discard the buffer, re-download the manifest and lose the buyer's position, to solve a
   * problem none of that touches.
   *
   * Everything else has no usable player, so the effect re-runs. It reuses `sessionRef` rather
   * than acquiring again — see that ref for why a second `startSession` would device-limit a
   * buyer out of their own film.
   */
  const retry = useCallback(() => {
    if (state === "stalled" && playerRef.current) {
      clearBufferingTimers();
      setState(null);
      playerRef.current.retryStreaming();
      return;
    }

    // An explicit "start over" forgives the automatic-throttle budget as well; anything that
    // would carry a past failure across a deliberate retry belongs here, for the same reason the
    // load effect resets every piece of recovery state (G3 round 3).
    throttleRetriesRef.current = 0;
    if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);
    throttleTimerRef.current = null;
    setDeviceLimit(undefined);
    setRetryAfterSeconds(undefined);
    setState("starting");
    setAttempt((n) => n + 1);
  }, [state, clearBufferingTimers]);

  const qualityOptions = useMemo(
    () => availableHeights.filter((height) => height > 0),
    [availableHeights],
  );

  return (
    <div className="w-full">
      <div className="relative w-full overflow-hidden rounded bg-black">
        {/*
          D5 — the watermark overlay slot. `StreamWatermarkOverlay` is story 135.7 and Phase 2;
          this story composes the slot and renders nothing into it. `pointer-events-none` is set
          here rather than by the future occupant so that an overlay added later cannot swallow
          the native transport controls by forgetting it.
        */}
        <div
          data-slot="stream-watermark"
          className="pointer-events-none absolute inset-0 z-10"
          aria-hidden="true"
        />

        <video
          ref={videoRef}
          // D7 — the browser's own control set. Its keyboard model and ARIA implementation are
          // not merely unmodified (AC13), they are unmodifiable by us.
          controls
          playsInline
          // No `autoPlay`: a film that starts itself on a page the buyer just landed on is a
          // data charge they did not ask for, in markets where that matters.
          className="aspect-video w-full bg-black"
          aria-label={t("playerLabel")}
        />

        {/*
          AC10 — mounted UNCONDITIONALLY and outside the `{state && …}` below, which is the whole
          point (G3 round 5). The live region has to already exist for a screen reader to announce
          the text that later arrives in it; when it lived inside the panel, region and content
          appeared in the same commit and the announcement was routinely dropped. The panel is the
          visible half; this is the spoken half, and it says the same sentence.
        */}
        <PlaybackStateAnnouncer
          state={state}
          deviceLimit={deviceLimit}
          retryAfterSeconds={retryAfterSeconds}
        />

        {state && (
          <PlaybackStatePanel
            state={state}
            deviceLimit={deviceLimit}
            retryAfterSeconds={retryAfterSeconds}
            onRetry={retry}
          />
        )}
      </div>

      {/*
        AC6 + AC12 — the quality cap.

        `flex-wrap` rather than a shrinking row: at 320px the label and the control drop onto
        separate lines at full size instead of compressing below a 44px target. A native
        `<select>` carries its own keyboard model and its own ARIA, for the same reason the
        transport controls do.
      */}
      {qualityOptions.length > 1 && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <label
            htmlFor="stream-quality"
            className="text-sm font-medium text-[#171717] dark:text-[oklch(0.91_0_0)]"
          >
            {t("playerQualityLabel")}
          </label>
          <select
            id="stream-quality"
            value={qualityCap === null ? "auto" : String(qualityCap)}
            onChange={(event) =>
              applyQualityCap(event.target.value === "auto" ? null : Number(event.target.value))
            }
            className="min-h-[44px] rounded border border-gray-300 bg-white px-3 text-sm text-[#171717] dark:border-[oklch(0.35_0_0)] dark:bg-[oklch(0.24_0_0)] dark:text-[oklch(0.91_0_0)]"
          >
            <option value="auto">{t("playerQualityAuto")}</option>
            {qualityOptions.map((height) => (
              <option key={height} value={height}>
                {t("playerQualityCap", { height })}
              </option>
            ))}
          </select>
          <p className="w-full text-xs text-gray-500 dark:text-[oklch(0.65_0_0)]">
            {t("playerQualityHint")}
          </p>
        </div>
      )}
    </div>
  );
}

/** The subset of `shaka.util.Error` this file reads. */
interface ShakaError {
  code: number;
  severity: number;
  data: unknown[];
}

/**
 * The HTTP status behind a Shaka error, or null when it was not an HTTP failure.
 *
 * `BAD_HTTP_STATUS` puts `[uri, status, responseText, headers, requestType]` in `data`, so the
 * status is `data[1]`. Read through Shaka's own constant rather than the literal 1001 so a
 * library upgrade that renumbers it fails loudly instead of silently never matching.
 */
function httpStatusOf(shaka: ShakaNamespace, error: ShakaError): number | null {
  if (error.code !== shaka.util.Error.Code.BAD_HTTP_STATUS) return null;
  const status = error.data?.[1];
  return typeof status === "number" ? status : null;
}

/**
 * Which panel a refused `POST /stream/sessions` should show.
 *
 * Keyed on the CODE, never on the status: 135.5's Finding 3 is that two different 429s —
 * "stop your other device" and "slow down, we'll retry" — demand opposite client behaviour and
 * cannot be told apart from the status alone. Only the device-limit 429 carries a code.
 */
function stateForSessionError(code?: string, statusCode?: number): PlaybackState {
  switch (code) {
    case STREAM_ERROR_CODES.deviceLimit:
      return "deviceLimit";
    case STREAM_ERROR_CODES.entitlementRevoked:
      return "accessEnded";
    case STREAM_ERROR_CODES.notEntitled:
      return "notEntitled";
    case STREAM_ERROR_CODES.notReady:
    case STREAM_ERROR_CODES.sessionUnavailable:
      return "unavailable";
  }
  // A 401 means the buyer's session went while the page sat open; `apiClient` already tried to
  // refresh it and failed, so this is genuinely "sign in again" and not "you never bought it".
  if (statusCode === 401) return "notEntitled";
  return statusCode === 429 ? "unavailable" : "failed";
}

/**
 * States that must not be overwritten by a timer that was already in flight.
 *
 * `starting` and `buffering` are deliberately absent: those are the ones a stall is allowed to
 * escalate out of.
 */
const TERMINAL_STATES: ReadonlySet<PlaybackState> = new Set([
  "deviceLimit",
  "failed",
  "accessEnded",
  "notEntitled",
  "unavailable",
  "unsupported",
]);

function isTerminal(state: PlaybackState | null): boolean {
  return state !== null && TERMINAL_STATES.has(state);
}

/** Origin of a configured URL, or null when it is unset or unparseable. */
function originOf(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}
