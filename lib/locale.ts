/**
 * The single place where a `next-intl` locale becomes an `Intl` locale.
 *
 * ── WHY THIS EXISTS (story 144.15) ─────────────────────────────────────────────────────
 *
 * Before this file, the repo answered the question "what locale do I pass to `Intl`?" in four
 * different ways at once:
 *
 *   1. `formatCurrencyAmount` hardcoded `'en-US'` and most callers never overrode it, so a French
 *      buyer read `5,151.99 XOF` — and French parses `,` as the DECIMAL mark, which turns five
 *      thousand francs into five.
 *   2. ~20 sites called a bare `toLocaleString()` with no argument at all.
 *   3. Twelve date sites inlined `locale === "fr" ? "fr-FR" : "en-US"`.
 *   4. Two money sites passed next-intl's bare `'fr'` straight through.
 *
 * (3) and (4) are both correct and produce identical output. (1) and (2) are the defect, and (2)
 * is the worse of the two — see below.
 *
 * ── A BARE `toLocaleString()` DOES NOT DEFAULT TO en-US ─────────────────────────────────
 *
 * It resolves to the **runtime's** locale: in a browser, the user's OS/browser language, which is
 * completely independent of the language this app is displaying. Three consequences, all of which
 * were live before 144.15:
 *
 *   - A French-OS user reading the site in English saw `5 151,99` in one panel and `5,151.99` in
 *     the panel beside it.
 *   - An English-OS user reading the site in French saw en-US everywhere.
 *   - It is **not reproducible across machines**, which is why this class survived unreported:
 *     two developers looking at the same screen can see different separators and neither is wrong.
 *
 * So "no argument" is never an acceptable answer on a money path. Pass the app's locale, always.
 *
 * ── WHY THE MAPPING IS TRIVIAL AND STILL WORTH A FUNCTION ───────────────────────────────
 *
 * Measured 2026-08-10 on Node 22, the same ICU the target browsers ship:
 *
 *   (5151.99).toLocaleString('fr')     -> "5 151,99"    group separator U+202F
 *   (5151.99).toLocaleString('fr-FR')  -> "5 151,99"    group separator U+202F
 *   (5151.99).toLocaleString('en-US')  -> "5,151.99"    group separator U+002C
 *
 * `'fr'` and `'fr-FR'` are identical for numbers, so this function changes no output today. It
 * exists so there is ONE answer instead of sixteen new ternaries, and so the day a third locale
 * arrives — or a `fr-CA`, whose grouping differs from `fr-FR` — there is one line to change
 * rather than a sweep. `i18n/request.ts` currently supports exactly `['en', 'fr']`.
 *
 * ── U+202F IS NOT A SPACE ───────────────────────────────────────────────────────────────
 *
 * The French group separator is a NARROW NO-BREAK SPACE (U+202F), not U+0020 and not U+00A0
 * (which older ICU used). It is visually near-identical. Never write an equality assertion, regex
 * or snapshot against a literal `" "` for a French amount — check the codepoint.
 */

/** The locales `i18n/request.ts` will actually resolve. */
const INTL_LOCALES: Record<string, string> = {
  en: "en-US",
  fr: "fr-FR",
};

const DEFAULT_INTL_LOCALE = INTL_LOCALES.en;

/**
 * Map a `next-intl` locale (`'en'`, `'fr'`) to the `Intl` locale used for number, currency and
 * date formatting.
 *
 * Accepts a full tag too (`'fr-FR'`, `'en-GB'`) and passes it through, so a caller that already
 * holds a BCP-47 tag does not have to unwrap it. Anything unrecognised falls back to `en-US`
 * rather than throwing — a money amount rendering in the wrong locale is a bug, but a money
 * amount failing to render at all is worse.
 */
export function toIntlLocale(locale: string | undefined | null): string {
  if (!locale) return DEFAULT_INTL_LOCALE;

  const exact = INTL_LOCALES[locale];
  if (exact) return exact;

  // Already a region-qualified tag we recognise the language of ("fr-CA", "en-GB") — trust it.
  const language = locale.split("-")[0];
  if (INTL_LOCALES[language]) return locale;

  return DEFAULT_INTL_LOCALE;
}
