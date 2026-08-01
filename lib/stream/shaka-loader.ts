'use client';

/**
 * Client-only loader for Shaka Player.
 *
 * Shaka touches `window`, `document` and `MediaSource` the moment it is evaluated, so
 * it can only ever be imported in the browser. The import below is deliberately
 * dynamic: a static import would pull 768 KB into whatever chunk referenced it, and on
 * Cloudflare Pages that can mean the edge worker bundle, which has a hard size limit
 * and cannot run the library anyway.
 *
 * This module intentionally contains no player, no UI and no React. Its only consumer
 * is Story 135.6 (`StreamPlayer.tsx`), which owns the playback surface; this exists so
 * 135.6 does not have to invent the loading and polyfill sequence.
 *
 * ---------------------------------------------------------------------------------
 * REQUIRED OF EVERY CONSUMER — mount with `next/dynamic` and `ssr: false`:
 *
 *     const StreamPlayer = dynamic(() => import('./StreamPlayer'), { ssr: false });
 *
 * The dynamic import below is NOT sufficient on its own. A `'use client'` component is
 * still server-rendered for the initial HTML, so webpack keeps the imported chunk in
 * the server graph and `@cloudflare/next-on-pages` copies it into the edge worker.
 *
 * Measured on 2026-07-31 against a probe route, `npm run build:cloudflare`:
 *
 *     plain 'use client' import   →  shaka-probe.func.js = 1140 KB, Shaka in _worker.js
 *     next/dynamic ssr: false     →  shaka-probe.func.js =  376 KB, Shaka absent
 *
 * (An ordinary route's edge function is ~480 KB, for scale.) The client chunk carries
 * the 748 KB library either way — that part is correct and expected.
 * ---------------------------------------------------------------------------------
 */

type ShakaNamespace = typeof import('shaka-player/dist/shaka-player.compiled').default;

/** Cached so repeated mounts share one download and one polyfill installation. */
let shakaPromise: Promise<ShakaNamespace> | null = null;

export class ShakaUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ShakaUnavailableError';
  }
}

/**
 * Loads Shaka Player and installs its polyfills once.
 *
 * @throws {ShakaUnavailableError} when called outside a browser.
 */
export function loadShaka(): Promise<ShakaNamespace> {
  if (typeof window === 'undefined') {
    return Promise.reject(
      new ShakaUnavailableError(
        'Shaka Player can only be loaded in the browser. Import it from a client component.',
      ),
    );
  }

  shakaPromise ??= import('shaka-player/dist/shaka-player.compiled')
    .then((module) => {
      const shaka = module.default;
      // Must run before any Player is constructed — it patches EME, MSE and
      // fullscreen differences across browsers.
      shaka.polyfill.installAll();
      return shaka;
    })
    .catch((error: unknown) => {
      // Do not cache a failure: a chunk that failed on a flaky connection should be
      // retried on the next attempt rather than poisoning the module for the session.
      shakaPromise = null;
      throw error;
    });

  return shakaPromise;
}

/**
 * Whether this browser can play what we deliver. Loads the library as a side effect,
 * because the answer comes from Shaka itself.
 */
export async function isShakaSupported(): Promise<boolean> {
  const shaka = await loadShaka();
  return shaka.Player.isBrowserSupported();
}
