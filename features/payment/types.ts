/**
 * Payment types shared across the payment surfaces.
 *
 * ── WHY THIS FILE EXISTS (story 144.15, review follow-up) ──────────────────────────────
 *
 * `MobileMoneyProvider` used to live in `PaymentMethodSelector.tsx`, and five live modules
 * imported it from there — the downloads page, `PaymentPanels`, `SaleCheckoutPanel` and both
 * subscription checkout panels. The component itself was dead: it had **no production render
 * site at all**, only its own orphaned test file referenced it.
 *
 * That is the trap worth naming. "Nothing renders it" and "nothing needs it" are different
 * statements, and a component file can be unreachable while the *type* it happens to export is
 * load-bearing across the app. Deleting the file on the strength of the render count alone would
 * have broken five modules that had nothing to do with the dead component.
 *
 * So the type moved here first and the component was deleted second. A type shared by five
 * features belongs in a types module, not as a side-effect of whichever component happened to
 * declare it.
 */

/** The mobile-money networks the platform can charge through. */
export type MobileMoneyProvider =
  | 'mtn_momo'
  | 'vodafone_cash'
  | 'airtel_tigo'
  | 'mpesa'
  | 'airtel_money'
  | 'orange_money'
  | 'wave';
