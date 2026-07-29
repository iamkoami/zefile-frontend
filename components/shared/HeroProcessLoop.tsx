"use client";

/**
 * HeroProcessLoop — the "how it works" product tour that runs in the homepage hero.
 *
 * Replaces PaperPlaneAnimation in the hero only. PaperPlaneAnimation is still
 * used by the downloads and review pages and is intentionally left untouched.
 *
 * Six beats, one seamless loop: upload → price → link → preview → pay → download.
 *
 * Ported from the Claude Design project "ZeFile Pitch Deck" — `hero-loop.jsx`
 * and `nextjs/ZeFileProcessLoop.tsx`. Keep this file faithful to that source:
 * one soft white sheet on transparent ground, no shell, no outline, no browser
 * chrome, NO rotation, auto height. Chrome and tilt were tried in the design and
 * rejected — they made the loop read as a second upload widget.
 *
 * Deliberate deviations from the design source, all deliberate, do not "fix":
 *  - Copy lives in next-intl (`heroProcessLoop`), not inline ternaries.
 *  - Voice guide applied: no ellipsis, and fees framed as "You keep …".
 *  - The platform fee is read from PlatformConfigs, never hardcoded to 7%.
 *  - Short link built via buildDisplayUrl → zefile.co, not the design's
 *    hardcoded zefile.io.
 *  - "25 000 CFA" (symbol after) in French; the design put CFA first.
 *
 * Production behaviour
 *  - Pauses when scrolled out of view (IntersectionObserver), on tab switch, and
 *    whenever `isVisible` is false.
 *  - Respects prefers-reduced-motion: holds one representative frame.
 *  - Throttled to ~30fps. It is decoration on the busiest page in the app.
 *  - aria-hidden + pointer-events:none — decorative, invisible to assistive tech.
 *  - Shown only at >=1400px, and requires HeroText `reserveRightGutter` to keep
 *    the headline out of its column. See the breakpoint note on the wrapper.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Archive,
  MediaImage,
  Plus,
  Lock,
  ShieldCheck,
  SendDiagonal,
  Check,
  CheckCircle,
  Download,
  Copy,
  Eye,
  NavArrowDown,
  SmartphoneDevice,
  CreditCard,
  Link as LinkIcon,
} from "iconoir-react";
import { platformApi } from "@/services/platform-api";

/* ── design tokens ────────────────────────────────────────────────────────
   The --ze-* custom properties are not defined in globals.css today, so the
   hex fallbacks are what actually render. They are kept in var() form so the
   component picks up a themed palette for free if those tokens ever land. */
const INK = "var(--ze-ink, #171717)";
const CREAM = "var(--ze-cream, #FFF5ED)";
const CREAM_HOVER = "var(--ze-cream-hover, #FFF0E4)";
const CREAM_LINE = "var(--ze-cream-line, #F0E4D8)";
const GREEN = "var(--ze-green, #87E64B)";
const G500 = "var(--ze-gray-500, #737581)";
const G600 = "var(--ze-gray-600, #4A5565)";
const HAIR = "var(--border-subtle, #E5E7EB)";
const OFF = "var(--ze-gray-50, #F9FAFB)";
const GREEN_DARK = "var(--success, #1F8A4C)";
const PURPLE = "var(--ze-purple, #5E53E0)";
// exact value from the design system's tokens.css
const SHADOW_LG = "var(--shadow-lg, 0 12px 32px -8px rgba(0,0,0,0.12))";
const ICON = { strokeWidth: 1.5 } as const;

// Loop length is the sum of a variant's beat lengths — 40s creator, 20.5s buyer.
const REDUCED_AT = 3; // frame held when prefers-reduced-motion
const FRAME_MS = 1000 / 30; // decoration does not need 60fps
/* Beat-to-beat transition, in seconds. The opacity itself is animated by CSS,
   not recomputed per frame — that keeps the fade smooth at any clock rate and
   costs nothing per tick. These values only decide WHEN the target flips:
   content is held invisible for FADE_HOLD while the sheet resizes, and starts
   fading out FADE_OUT before the beat ends. */
const FADE_HOLD = 0.16;
const FADE_OUT = 0.36;
const FADE_MS = 300;
const CARD_W = 340; // kit-native card width
const CARD_PAD = 22;
const GHOST_W = 190; // dragged file card in beat 1
const DEMO_LINK = "zefile.co/z-K8MQ2P";
const FALLBACK_FEE = 7; // FREE tier; only used if the config call fails

/* ── helpers ──────────────────────────────────────────────────────────────── */
const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOutBack = (t: number) =>
  1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);
const typeOut = (text: string, local: number, start: number, dur: number) =>
  text.slice(0, Math.round(clamp((local - start) / dur) * text.length));

/** Narrow no-break space grouping — reads correctly in both EN and FR. */
const group = (n: number) =>
  Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");

type Lang = "en" | "fr";
type Tr = ReturnType<typeof useTranslations>;

/* ── per-locale market ────────────────────────────────────────────────────
   FR → Côte d'Ivoire / XOF, EN → Nigeria / NGN. `symAfter` matters: francophone
   markets write "25 000 CFA", anglophone markets write "₦ 65 000". */
const MARKETS = {
  fr: {
    sym: "CFA",
    symAfter: true,
    code: "XOF",
    base: 25000,
    flag: "CI",
    dial: "+225",
    phone: "07 12 34 56",
    providers: ["MTN MoMo", "Moov", "Wave"],
  },
  en: {
    sym: "₦",
    symAfter: false,
    code: "NGN",
    base: 65000,
    flag: "NG",
    dial: "+234",
    phone: "0803 123 4567",
    providers: ["MTN MoMo", "Opay", "Paga"],
  },
} as const;

type Market = (typeof MARKETS)[Lang];

const money = (m: Market, value: number) =>
  m.symAfter ? `${group(value)} ${m.sym}` : `${m.sym} ${group(value)}`;

const FILES = [
  { name: "Brand-shoot-finals.zip", mb: 248, Icon: Archive },
  { name: "Cover-art-master.png", mb: 14, Icon: MediaImage },
];
const TOTAL_MB = FILES.reduce((s, f) => s + f.mb, 0);

/** Everything a beat needs, resolved once per frame by the parent. */
type Beat = {
  t: Tr;
  m: Market;
  lang: Lang;
  now: number; // global clock, for caret blink
  local: number; // seconds into this beat
  fee: number; // platform fee %, from PlatformConfigs
  price: string; // formatted gross
  net: string; // formatted creator take-home
  priceDigits: string; // grouped digits only, for the typing effect
  /** Buyer variant hides every amount — the real page already shows the real
   *  price, and a second, different number beside it is just confusing. */
  showAmount: boolean;
};

/* ── primitives ───────────────────────────────────────────────────────────── */
function Caret({ on, now }: { on: boolean; now: number }) {
  return (
    <span
      style={{
        opacity: on && Math.sin(now * 7) > -0.2 ? 1 : 0,
        fontWeight: 400,
      }}
    >
      |
    </span>
  );
}

/** Grows an element open while it fades and lifts, so appearing content never
 *  snaps the layout. `p` is 0..1. */
function Reveal({
  p,
  mt = 0,
  children,
}: {
  p: number;
  mt?: number;
  children: React.ReactNode;
}) {
  if (p <= 0.001) return null;
  const e = easeOutCubic(clamp(p));
  return (
    <div style={{ display: "grid", gridTemplateRows: `${e}fr`, marginTop: mt * e }}>
      <div
        style={{
          overflow: "hidden",
          opacity: Math.min(1, e * 1.5),
          transform: `translateY(${(1 - e) * 5}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function FileRow({
  f,
  lang,
  right,
}: {
  f: (typeof FILES)[number];
  lang: Lang;
  right?: React.ReactNode;
}) {
  const { Icon } = f;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        border: `1px solid ${HAIR}`,
        borderRadius: 10,
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          flexShrink: 0,
          background: CREAM,
          border: `1px solid ${CREAM_LINE}`,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon width={18} height={18} color={INK} {...ICON} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
          {f.name}
        </div>
        <div style={{ fontSize: 11, color: G500, fontWeight: 500 }}>
          {f.mb} {lang === "fr" ? "Mo" : "MB"}
        </div>
      </div>
      {right}
    </div>
  );
}

function Btn({
  children,
  full = true,
  style,
}: {
  children: React.ReactNode;
  full?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        height: 44,
        padding: "0 18px",
        borderRadius: 4, // ZeFile buttons are 4px, never pill
        fontWeight: 600,
        fontSize: 14,
        whiteSpace: "nowrap",
        width: full ? "100%" : "auto",
        background: GREEN,
        color: "#000",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function AmountDue({ t, price }: { t: Tr; price: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        background: CREAM,
        border: `1px solid ${CREAM_LINE}`,
        borderRadius: 10,
        padding: "14px 16px",
      }}
    >
      <span style={{ fontSize: 13, color: G500, fontWeight: 500 }}>
        {t("amountDue")}
      </span>
      <span style={{ fontWeight: 800, fontSize: 26 }}>{price}</span>
    </div>
  );
}

function PreviewStage({
  t,
  unlocked,
  wm,
}: {
  t: Tr;
  unlocked?: boolean;
  wm: number;
}) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "4 / 3",
        borderRadius: 14,
        overflow: "hidden",
        border: `1px solid ${HAIR}`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(135deg,#5E53E0 0%,#BD51FF 45%,#FEC753 100%)",
        }}
      />
      {!unlocked && (
        <>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 26,
              transform: "rotate(-24deg) scale(1.4)",
              opacity: 0.5 * wm,
            }}
          >
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} style={{ display: "flex", gap: 30, whiteSpace: "nowrap" }}>
                {Array.from({ length: 4 }).map((_, j) => (
                  <span
                    key={j}
                    style={{
                      color: "#fff",
                      fontSize: 14,
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                    }}
                  >
                    {t("watermarkTag")}
                  </span>
                ))}
              </div>
            ))}
          </div>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.12)",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(255,255,255,0.95)",
                padding: "10px 16px",
                borderRadius: 9999,
                fontSize: 13,
                fontWeight: 700,
                boxShadow: "var(--shadow-md, 0 4px 16px rgba(0,0,0,.10))",
              }}
            >
              <Lock width={16} height={16} color={INK} {...ICON} />
              {t("lockedUntilPaid")}
            </div>
          </div>
        </>
      )}
      {unlocked && (
        <div style={{ position: "absolute", top: 12, left: 12 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: GREEN_DARK,
              color: "#fff",
              padding: "6px 12px",
              borderRadius: 9999,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            <CheckCircle width={16} height={16} color="#fff" {...ICON} />
            {t("unlocked")}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── beat 1 · drag in, then upload ────────────────────────────────────────── */
function StepUpload({ t, lang, local }: Beat) {
  const DROP_AT = 1.7;
  const dp = clamp(local / DROP_AT);
  const e = easeInOutCubic(dp);
  const dragging = local < DROP_AT + 0.12;
  const over = local > 0.45 && local < DROP_AT;
  const flash = local >= DROP_AT && local < DROP_AT + 0.45;
  const p = clamp((local - 2.3) / 3.0);

  // Ghost travels from off-sheet, then shrinks INTO the plus tile (never
  // dissolving on top of live copy). Plus tile centre is ~(46, 46) in kit px.
  // These coordinates are deliberately outside the sheet — the sheet does not
  // clip, so the file reads as coming from the desktop.
  const gx = 236 + (-49 - 236) * e;
  const gy = -148 + (18 + 148) * e;
  const gScale = 1 - 0.72 * clamp((dp - 0.7) / 0.3);
  const gOp = clamp(local / 0.25) * (1 - clamp((dp - 0.88) / 0.12));
  // pointer rides the same path to the plus tile, lingers a beat past the drop
  const cx = 256 + (46 - 256) * e;
  const cy = -132 + (46 + 132) * e;
  const cScale = 1 - 0.12 * clamp((dp - 0.85) / 0.15);
  const cOp = clamp(local / 0.2) * (1 - clamp((local - DROP_AT - 0.2) / 0.3));
  const labelOp = dragging ? 1 - 0.85 * clamp((dp - 0.4) / 0.25) : 1;

  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          background: over || flash ? CREAM_HOVER : CREAM,
          border: `1px dashed ${over || flash ? GREEN : "#D1D5DB"}`,
          borderRadius: 12,
          padding: 20,
          boxShadow: flash ? "0 0 0 3px rgba(135,230,75,0.20)" : "none",
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            flexShrink: 0,
            border: `1px solid ${INK}`,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${1 + 0.08 * (flash ? 1 - clamp((local - DROP_AT) / 0.45) : 0)})`,
          }}
        >
          <Plus width={26} height={26} color={INK} {...ICON} />
        </div>
        <div style={{ opacity: labelOp }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{t("addFiles")}</div>
          <div style={{ fontSize: 12, color: G500, fontWeight: 500 }}>
            {over ? t("dropHere") : t("dropHint")}
          </div>
        </div>
      </div>

      {dragging && (
        <div
          style={{
            position: "absolute",
            left: gx,
            top: gy,
            width: GHOST_W,
            opacity: gOp,
            transform: `rotate(${-9 + 9 * e}deg) scale(${gScale})`,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "#fff",
              border: `1px solid ${HAIR}`,
              borderRadius: 10,
              padding: "10px 12px",
              boxShadow: SHADOW_LG,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                flexShrink: 0,
                background: CREAM,
                border: `1px solid ${CREAM_LINE}`,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Archive width={18} height={18} color={INK} {...ICON} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
                {FILES[0].name}
              </div>
              <div style={{ fontSize: 11, color: G500, fontWeight: 500 }}>
                {FILES[0].mb} {lang === "fr" ? "Mo" : "MB"}
              </div>
            </div>
          </div>
        </div>
      )}

      {cOp > 0.01 && (
        <div
          style={{
            position: "absolute",
            left: cx,
            top: cy,
            opacity: cOp,
            transform: `scale(${cScale})`,
            transformOrigin: "0 0",
            pointerEvents: "none",
            zIndex: 3,
          }}
        >
          <svg
            width="19"
            height="23"
            viewBox="0 0 19 23"
            fill="none"
            style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.25))" }}
          >
            <path
              d="M2.5 1.6 L2.5 18.2 L6.9 14.2 L9.7 20.6 L12.6 19.3 L9.9 13.1 L15.6 13.1 Z"
              fill="#fff"
              stroke="#171717"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}

      {FILES.map((f, i) => (
        <Reveal
          key={f.name}
          mt={i === 0 ? 14 : 8}
          p={clamp((local - DROP_AT - 0.15 - i * 0.32) / 0.6)}
        >
          <FileRow f={f} lang={lang} />
        </Reveal>
      ))}

      <Reveal mt={14} p={clamp((local - 2.3) / 0.65)}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
            {t("uploading")}
          </div>
          <div
            style={{
              fontSize: 12,
              color: G500,
              fontWeight: 500,
              marginBottom: 12,
            }}
          >
            {t("uploadingSub", { count: FILES.length })}
          </div>
          <div
            style={{
              height: 8,
              background: CREAM_LINE,
              borderRadius: 9999,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${p * 100}%`,
                background: GREEN,
                borderRadius: 9999,
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 10,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <span>{Math.round(p * 100)}%</span>
            <span style={{ color: G500 }}>
              {p < 1 ? t("secondsLeft") : t("almostThere")}
            </span>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

/* ── beat 2 · set the price ───────────────────────────────────────────────── */
function StepPrice({ t, m, local, now, fee, net, priceDigits }: Beat) {
  const amount = typeOut(priceDigits, local, 0.7, 1.6);
  const focus = local > 0.5 && local < 2.5;
  const done = local >= 2.5;
  const rows: [React.ComponentType<Record<string, unknown>>, string, string, boolean][] = [
    [Lock, t("accessControl"), t("accessPrivate"), false],
    [ShieldCheck, t("watermarkPreview"), t("watermarkOn"), true],
  ];

  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>
        {t("newTransfer")}
      </div>
      <label
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 600,
          color: G600,
          marginBottom: 6,
        }}
      >
        {t("price")}
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <div
            style={{
              width: "100%",
              height: 46,
              border: `1px solid ${focus || done ? GREEN : INK}`,
              borderRadius: 4,
              padding: "0 14px",
              background: "#fff",
              display: "flex",
              alignItems: "center",
              boxShadow: focus ? "0 0 0 2px rgba(135,230,75,0.15)" : "none",
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              {amount}
              <Caret on={!done} now={now} />
            </span>
            <span
              style={{
                position: "absolute",
                right: 14,
                fontSize: 13,
                fontWeight: 600,
                color: G500,
              }}
            >
              {m.sym}
            </span>
          </div>
        </div>
        <div
          style={{
            width: 104,
            height: 46,
            border: `1px solid ${INK}`,
            borderRadius: 4,
            padding: "0 14px",
            fontSize: 14,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {m.code}
          <NavArrowDown width={14} height={14} color={INK} {...ICON} />
        </div>
      </div>

      <Reveal mt={8} p={clamp((local - 2.5) / 0.6)}>
        <div style={{ fontSize: 12, color: G500, fontWeight: 500 }}>
          {t.rich("youKeep", {
            amount: net,
            fee,
            net: (chunks) => (
              <strong style={{ color: GREEN_DARK, fontWeight: 700 }}>{chunks}</strong>
            ),
          })}
        </div>
      </Reveal>

      <Reveal mt={16} p={clamp((local - 2.9) / 0.6)}>
        <div style={{ border: `1px solid ${HAIR}`, borderRadius: 8, overflow: "hidden" }}>
          {rows.map(([RowIcon, label, value, green], i) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "11px 12px",
                borderBottom: i === 0 ? "1px solid #F0F0F0" : "none",
              }}
            >
              <RowIcon width={16} height={16} color={green ? GREEN_DARK : INK} {...ICON} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 13,
                  fontWeight: 600,
                  color: green ? GREEN_DARK : INK,
                }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal mt={16} p={clamp((local - 3.4) / 0.6)}>
        <Btn>
          <SendDiagonal width={18} height={18} color="#000" {...ICON} />
          {t("transfer")}
        </Btn>
      </Reveal>
    </div>
  );
}

/* ── beat 3 · one link, copied ────────────────────────────────────────────── */
function StepLink({ t, local, now }: Beat) {
  // Illustrative link, so the brand domain is hardcoded rather than read from
  // NEXT_PUBLIC_SHORT_LINK_DOMAIN — that renders "localhost:3000/z-K8MQ2P" in
  // dev and the preview host on Pages. A product shot must always show ZeFile.
  const target = DEMO_LINK;
  const url = typeOut(target, local, 0.8, 1.6);
  const full = local >= 2.5;
  const copied = local > 3.1;

  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          width: 60,
          height: 60,
          margin: "0 auto",
          background: GREEN,
          borderRadius: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${easeOutBack(clamp(local / 0.5))})`,
        }}
      >
        <Check width={30} height={30} color="#fff" strokeWidth={2.2} />
      </div>
      <div style={{ fontWeight: 800, fontSize: 18, marginTop: 14 }}>
        {t("transferReady")}
      </div>
      <p
        style={{
          fontSize: 13,
          color: G500,
          fontWeight: 500,
          margin: "6px 0 18px",
          lineHeight: 1.5,
        }}
      >
        {t("transferReadySub")}
      </p>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: OFF,
          border: `1px solid ${HAIR}`,
          borderRadius: 8,
          padding: "8px 8px 8px 12px",
        }}
      >
        <LinkIcon width={16} height={16} color={G500} {...ICON} />
        <span
          style={{
            flex: 1,
            fontSize: 13,
            fontWeight: 600,
            textAlign: "left",
            whiteSpace: "nowrap",
          }}
        >
          {url}
          <Caret on={!full} now={now} />
        </span>
        <Btn full={false} style={{ height: 34, padding: "0 12px", fontSize: 13, gap: 6 }}>
          {copied ? (
            <Check width={16} height={16} color="#000" {...ICON} />
          ) : (
            <Copy width={16} height={16} color="#000" {...ICON} />
          )}
          {copied ? t("copied") : t("copy")}
        </Btn>
      </div>
      <Reveal mt={14} p={clamp((local - 3.6) / 0.6)}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            fontSize: 13,
            fontWeight: 600,
            color: PURPLE,
          }}
        >
          <Eye width={16} height={16} color={PURPLE} {...ICON} />
          {t("previewAsClient")}
        </div>
      </Reveal>
    </div>
  );
}

/* ── beat 4 · client sees a watermarked preview ───────────────────────────── */
function StepPreview({ t, lang, local, price, showAmount }: Beat) {
  return (
    <div>
      {showAmount && (
        <div style={{ marginBottom: 14 }}>
          <AmountDue t={t} price={price} />
        </div>
      )}
      <PreviewStage t={t} wm={clamp((local - 0.6) / 1.1)} />
      {FILES.map((f, i) => (
        <Reveal key={f.name} mt={i === 0 ? 14 : 8} p={clamp((local - 1.5 - i * 0.28) / 0.6)}>
          <FileRow
            f={f}
            lang={lang}
            right={<Lock width={16} height={16} color="#99A1AF" {...ICON} />}
          />
        </Reveal>
      ))}
    </div>
  );
}

/* ── beat 5 · the client pays ─────────────────────────────────────────────── */
function StepPay({ t, m, local, now, price, showAmount }: Beat) {
  const num = typeOut(m.phone, local, 1.4, 1.6);
  const numDone = local >= 3.0;
  const paying = local > 3.8 && local < 5.6;
  const paid = local >= 5.6;

  const tab = (on: boolean, TabIcon: React.ComponentType<Record<string, unknown>>, label: string) => (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        height: 44,
        borderRadius: 8,
        border: `1px solid ${on ? INK : HAIR}`,
        background: "#fff",
        boxShadow: on ? `inset 0 0 0 1px ${INK}` : "none",
        fontSize: 13,
        fontWeight: 600,
        color: on ? INK : G500,
      }}
    >
      <TabIcon width={18} height={18} color={on ? INK : G500} {...ICON} />
      {label}
    </div>
  );

  return (
    <div>
      {showAmount && <AmountDue t={t} price={price} />}
      {!paid && (
        <>
          <div style={{ display: "flex", gap: 8, marginTop: showAmount ? 16 : 0 }}>
            {tab(true, SmartphoneDevice, "Mobile Money")}
            {tab(false, CreditCard, t("card"))}
          </div>
          <Reveal mt={12} p={clamp((local - 0.4) / 0.6)}>
            <div style={{ display: "flex", gap: 8 }}>
              {m.providers.map((pv, i) => (
                <div
                  key={pv}
                  style={{
                    flex: 1,
                    height: 36,
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 600,
                    border: `1px solid ${i === 0 ? GREEN : HAIR}`,
                    background: i === 0 ? "var(--ze-green-soft, #F0FDF4)" : "#fff",
                    color: i === 0 ? GREEN_DARK : G600,
                  }}
                >
                  {pv}
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal mt={14} p={clamp((local - 1.0) / 0.6)}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: G600,
                  marginBottom: 6,
                }}
              >
                {t("momoNumber")}
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <div
                  style={{
                    width: 92,
                    height: 46,
                    border: `1px solid ${INK}`,
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "0 14px",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/flags/m/${m.flag}.svg`}
                    alt=""
                    width={20}
                    style={{ borderRadius: 3 }}
                  />{" "}
                  {m.dial}
                </div>
                <div
                  style={{
                    flex: 1,
                    height: 46,
                    borderRadius: 4,
                    padding: "0 14px",
                    background: "#fff",
                    display: "flex",
                    alignItems: "center",
                    fontSize: 14,
                    fontWeight: 600,
                    border: `1px solid ${numDone ? GREEN : INK}`,
                    boxShadow: numDone ? "none" : "0 0 0 2px rgba(135,230,75,0.15)",
                  }}
                >
                  {num}
                  <Caret on={!numDone} now={now} />
                </div>
              </div>
            </div>
          </Reveal>
          <Reveal mt={18} p={clamp((local - 3.1) / 0.6)}>
            <div>
              <Btn>
                {paying ? (
                  <>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      style={{ transform: `rotate(${((local * 360) / 0.7) % 360}deg)` }}
                    >
                      <circle
                        cx="8"
                        cy="8"
                        r="6.5"
                        fill="none"
                        stroke="rgba(0,0,0,0.25)"
                        strokeWidth="2"
                      />
                      <path
                        d="M8 1.5A6.5 6.5 0 0 1 14.5 8"
                        fill="none"
                        stroke="#000"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                    {t("confirmingPayment")}
                  </>
                ) : (
                  <>
                    <Lock width={16} height={16} color="#000" {...ICON} />
                    {showAmount ? t("pay", { amount: price }) : t("paySecurely")}
                  </>
                )}
              </Btn>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                  marginTop: 12,
                  fontSize: 12,
                  fontWeight: 500,
                  color: G500,
                }}
              >
                <ShieldCheck width={14} height={14} color={G500} {...ICON} />
                {t("securedRelease")}
              </div>
            </div>
          </Reveal>
        </>
      )}
      {paid && (
        <div style={{ textAlign: "center", marginTop: 18 }}>
          <div
            style={{
              width: 60,
              height: 60,
              margin: "0 auto",
              background: GREEN,
              borderRadius: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: `scale(${easeOutBack(clamp((local - 5.6) / 0.5))})`,
            }}
          >
            <Check width={30} height={30} color="#fff" strokeWidth={2.2} />
          </div>
          <div style={{ fontWeight: 800, fontSize: 17, marginTop: 12 }}>
            {t("paymentComplete")}
          </div>
          <p
            style={{
              fontSize: 13,
              color: G500,
              fontWeight: 500,
              margin: "6px 0 0",
              lineHeight: 1.5,
            }}
          >
            {t("filesUnlocked")}
          </p>
        </div>
      )}
    </div>
  );
}

/* ── beat 6 · unlocked, download the originals ────────────────────────────── */
function StepDownload({ t, lang, local }: Beat) {
  const dl = clamp((local - 1.6) / 2.2);
  return (
    <div>
      <PreviewStage t={t} unlocked wm={0} />
      {FILES.map((f, i) => {
        const done = dl > 0.35 + i * 0.3;
        return (
          <Reveal key={f.name} mt={i === 0 ? 14 : 8} p={clamp((local - 0.6 - i * 0.3) / 0.6)}>
            <FileRow
              f={f}
              lang={lang}
              right={
                done ? (
                  <CheckCircle width={18} height={18} color={GREEN_DARK} {...ICON} />
                ) : (
                  <Download width={18} height={18} color={GREEN_DARK} {...ICON} />
                )
              }
            />
          </Reveal>
        );
      })}
      <Reveal mt={16} p={clamp((local - 1.5) / 0.65)}>
        <Btn>
          <Download width={18} height={18} color="#000" {...ICON} />
          {t("downloadAll", { size: `${TOTAL_MB} ${lang === "fr" ? "Mo" : "MB"}` })}
        </Btn>
      </Reveal>
      <Reveal mt={12} p={clamp((local - 2.4) / 0.65)}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            fontSize: 12,
            fontWeight: 500,
            color: G500,
          }}
        >
          <ShieldCheck width={14} height={14} color={G500} {...ICON} />
          {t("releasedAfterPayment")}
        </div>
      </Reveal>
    </div>
  );
}

/* ── sequence ─────────────────────────────────────────────────────────────── */
/** Creator story: the full six beats, as authored in the design source. */
const CREATOR_STATES = [
  { len: 8.0, C: StepUpload },
  { len: 5.5, C: StepPrice },
  { len: 6.0, C: StepLink },
  { len: 5.5, C: StepPreview },
  { len: 8.0, C: StepPay },
  { len: 7.0, C: StepDownload },
];

/** Buyer story: only the three beats that answer "if I pay, do I get the
 *  files?". No upload, no price-setting — that is the seller's side of the
 *  transaction and it reads as noise to someone about to pay. */
const BUYER_STATES = [
  { len: 5.5, C: StepPreview },
  { len: 8.0, C: StepPay },
  { len: 7.0, C: StepDownload },
];

function buildSeq(states: typeof CREATOR_STATES) {
  let a = 0;
  const seq = states.map((s) => {
    const start = a;
    a += s.len;
    return { ...s, start };
  });
  return { seq, loop: a };
}

const SEQS = {
  creator: buildSeq(CREATOR_STATES),
  buyer: buildSeq(BUYER_STATES),
};

/* ── the sheet ────────────────────────────────────────────────────────────
   One soft white sheet on transparent ground — no shell, no outline, no tab
   pill, no browser chrome. That chrome is what made it read as a second upload
   widget, so the design drops it. Height is AUTO: a pure function of the
   active beat's content, which is why nothing can ever be cropped. */
function Sheet({
  height,
  animate,
  children,
}: {
  /** Measured natural height of the active beat's content, or null pre-measure. */
  height: number | null;
  /** Only true just after a beat boundary. Leaving the transition on for the
   *  whole beat would make the in-beat Reveal growth lag and feel rubbery. */
  animate: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        width: CARD_W,
        background: "#fff",
        borderRadius: 12,
        padding: CARD_PAD,
        boxShadow: SHADOW_LG,
        boxSizing: "border-box",
        height: height != null ? height + CARD_PAD * 2 : undefined,
        transition: animate
          ? "height 380ms cubic-bezier(0.4, 0, 0.2, 1)"
          : "none",
      }}
    >
      {children}
    </div>
  );
}

/* ── the component ────────────────────────────────────────────────────────── */
export default function HeroProcessLoop({
  variant = "creator",
  feePercent,
  className,
  style,
}: {
  /**
   * "creator" — six beats, upload → price → link → preview → pay → download.
   * "buyer"   — three beats, preview → pay → download, with every amount
   *             suppressed so it never contradicts the real transfer price.
   */
  variant?: "creator" | "buyer";
  /** Platform fee %. Omit and the component reads it from PlatformConfigs. */
  feePercent?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const t = useTranslations("heroProcessLoop");
  const locale = useLocale();
  const lang: Lang = locale === "fr" ? "fr" : "en";
  const m = MARKETS[lang];

  const [now, setNow] = useState(0);
  const [fee, setFee] = useState<number>(feePercent ?? FALLBACK_FEE);
  const hostRef = useRef<HTMLDivElement>(null);

  // Fee comes from PlatformConfigs — never hardcode a rate in user-facing copy.
  // getUserConfig works unauthenticated and returns the FREE tier rate.
  useEffect(() => {
    if (feePercent !== undefined) {
      setFee(feePercent);
      return;
    }
    let cancelled = false;
    platformApi
      .getUserConfig()
      .then((r) => {
        const pct = r.data?.serviceChargePercentage;
        if (!cancelled && typeof pct === "number") setFee(pct);
      })
      .catch(() => {
        /* keep the fallback — a decorative loop must never break the hero */
      });
    return () => {
      cancelled = true;
    };
  }, [feePercent]);

  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setNow(REDUCED_AT);
      return;
    }

    let raf = 0;
    let onScreen = true;
    let last = performance.now();
    let acc = 0;
    let painted = 0;

    const tick = (ts: number) => {
      const dt = Math.min(0.05, (ts - last) / 1000); // clamp tab-switch jumps
      last = ts;
      if (onScreen) {
        acc += dt;
        if (ts - painted >= FRAME_MS) {
          painted = ts;
          setNow(acc);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const io = new IntersectionObserver(
      ([e]) => {
        onScreen = e.isIntersecting;
        last = performance.now();
      },
      { threshold: 0.05 },
    );
    if (hostRef.current) io.observe(hostRef.current);

    const onVis = () => {
      last = performance.now();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const price = money(m, m.base);
  const net = money(m, m.base * (1 - fee / 100));
  const priceDigits = group(m.base);

  const { seq, loop } = SEQS[variant];
  const { C, local, len } = useMemo(() => {
    const lt = ((now % loop) + loop) % loop;
    let i = 0;
    for (let k = 0; k < seq.length; k++) if (lt >= seq[k].start) i = k;
    return { C: seq[i].C, local: lt - seq[i].start, len: seq[i].len };
  }, [now, seq, loop]);

  const intro = easeOutCubic(clamp(now / 0.9));

  /* Beat-to-beat transition.
     The content fades out before the boundary, the sheet resizes while nothing
     is visible, then the content fades back in. Fading fully to zero (rather
     than the design's overlapping crossfade) is deliberate: it means two
     different beat layouts are never superimposed, and it lets the sheet keep
     `overflow: visible` so beat 1's ghost can still fly in from off-sheet.
     `shown` is a boolean the CSS transition interpolates — no per-frame math. */
  const shown = local >= FADE_HOLD && local < len - FADE_OUT;

  const contentRef = useRef<HTMLDivElement>(null);
  const [contentH, setContentH] = useState<number | null>(null);
  useEffect(() => {
    const el = contentRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setContentH(e.contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={hostRef}
      // Always on from `lg` up — `lg` is the floor every hero decoration shares
      // (HeroText and PaperPlaneAnimation use it too); below it the hero switches
      // to the stacked mobile layout and an absolutely-positioned sheet has
      // nowhere to sit. The sheet scales down on narrower desktops so it keeps
      // clear of the headline; HeroText `reserveRightGutter` is its other half.
      // --hpl is the sheet's scale. 1.0 at 2xl means it renders at the design's
      // native 340px with no downscaling, which is where the type is sharpest.
      // Any change here must move HeroText's gutter by the same amount.
      className={`hidden lg:flex items-center justify-center pointer-events-none select-none [--hpl:0.72] xl:[--hpl:0.85] 2xl:[--hpl:1] ${className ?? ""}`}
      aria-hidden="true"
      style={{
        position: "absolute",
        right: "clamp(0.75rem, 2vw, 2rem)",
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 1,
        width: `calc(${CARD_W}px * var(--hpl))`,
        fontFamily: "var(--font-sans, Metropolis, system-ui, sans-serif)",
        color: INK,
        ...style,
      }}
    >
      <div style={{ opacity: intro, transform: `translateX(${(1 - intro) * 20}px)` }}>
        {/* No rotation. The design keeps the sheet square to the page — a tilt
            reads as a marketing mockup, not as the product breathing. */}
        <div style={{ transform: "scale(var(--hpl))", transformOrigin: "center" }}>
          <Sheet height={contentH} animate={local < 0.6}>
            <div
              ref={contentRef}
              style={{
                opacity: shown ? 1 : 0,
                transform: `translateY(${shown ? 0 : 6}px)`,
                transition: `opacity ${FADE_MS}ms ease-out, transform ${FADE_MS}ms ease-out`,
              }}
            >
              <C
                t={t}
                m={m}
                lang={lang}
                now={now}
                local={local}
                fee={fee}
                price={price}
                net={net}
                priceDigits={priceDigits}
                showAmount={variant === "creator"}
              />
            </div>
          </Sheet>
        </div>
      </div>
    </div>
  );
}
