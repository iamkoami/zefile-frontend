"use client";

export const runtime = "edge";

import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import PageHero from "@/components/shared/PageHero";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import LoadingFullscreen from "@/components/LoadingFullscreen";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  SendDiagonal,
  Lock,
  Settings,
  CreditCard,
  StatsReport,
} from "iconoir-react";

/* ------------------------------------------------------------------ */
/*  Scroll-triggered reveal                                            */
/* ------------------------------------------------------------------ */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, visible };
}

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, visible } = useInView();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Image placeholder (swap src later)                                 */
/* ------------------------------------------------------------------ */
function ImageZone({
  src,
  alt,
  className = "",
  aspect = "aspect-[4/3]",
}: {
  src?: string;
  alt: string;
  className?: string;
  aspect?: string;
}) {
  if (src) {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl ${aspect} ${className}`}
      >
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#F3F0FF] via-[#FDFAF4] to-[#F0FFF4] ${aspect} ${className}`}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-white/60 backdrop-blur-sm flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-[#87E64B]/30" />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Capabilities — cards overlaying central image                      */
/* ------------------------------------------------------------------ */

const CARD_ICON_STYLES = [
  { bg: "bg-[#87E64B]/20", text: "text-[#171717]" },
  { bg: "bg-[#5E53E0]/15", text: "text-[#5E53E0]" },
  { bg: "bg-[#87E64B]/20", text: "text-[#171717]" },
  { bg: "bg-[#5E53E0]/15", text: "text-[#5E53E0]" },
  { bg: "bg-[#87E64B]/20", text: "text-[#171717]" },
];

/* Desktop positions: slight vertical stagger for masonry feel */
const CARD_POSITIONS = [
  "top-[6%] left-1/2 -translate-x-1/2",
  "top-[30%] left-[3%]",
  "top-[60%] left-[7%]",
  "top-[36%] right-[1%]",
  "top-[70%] right-[5%]",
];

function CapabilityCard({
  icon,
  title,
  content,
  index,
}: {
  icon: ReactNode;
  title: string;
  content: string;
  index: number;
}) {
  const style = CARD_ICON_STYLES[index];
  return (
    <div
      className="bg-white/80 backdrop-blur-sm rounded-2xl px-5 py-4 border border-gray-100/50 w-[380px] flex items-start gap-4"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}
    >
      <div
        className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${style.bg} ${style.text}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <h3 className="font-bold text-[#171717] text-[15px] mb-0.5">{title}</h3>
        <p className="text-gray-400 text-sm leading-relaxed">{content}</p>
      </div>
    </div>
  );
}

function CapabilitiesSlideshow({
  title,
  capabilities,
}: {
  title: string | ReactNode;
  capabilities: {
    icon: ReactNode;
    titleKey: string;
    contentKey: string;
    title: string;
    content: string;
  }[];
}) {
  return (
    <section className="max-w-6xl mx-auto px-6 pt-36 ">
      <Reveal>
        <h2 className="text-3xl md:text-5xl font-bold text-[#171717] mb-12 md:mb-16 text-center">
          {title}
        </h2>
      </Reveal>

      {/* Mobile / Tablet layout */}
      <div className="lg:hidden">
        <Reveal>
          <div className="relative overflow-hidden">
            <div className="relative flex justify-center pt-8 pb-0">
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[340px] h-[170px] bg-[#87E64B] rounded-t-full pointer-events-none" />
              <div className="relative w-[280px] z-10">
                <ImageZone
                  alt="ZeFile capabilities"
                  aspect="aspect-[3/4]"
                  className="rounded-2xl"
                />
              </div>
            </div>
          </div>
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
          {capabilities.map((cap, i) => (
            <Reveal key={i} delay={(i + 1) * 100}>
              <CapabilityCard
                icon={cap.icon}
                title={cap.title}
                content={cap.content}
                index={i}
              />
            </Reveal>
          ))}
        </div>
      </div>

      {/* Desktop layout — large image with cards overlaying */}
      <div className="hidden lg:block">
        <Reveal>
          <div className="relative overflow-hidden" style={{ minHeight: 700 }}>
            {/* Large central image */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] z-[1]">
              <ImageZone
                alt="ZeFile capabilities"
                aspect="aspect-[3/4]"
                className="rounded-t-2xl rounded-b-none"
              />
            </div>

            {/* Green half-circle behind image bottom */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[640px] h-[320px] bg-[#87E64B] rounded-t-full pointer-events-none" />

            {/* Floating cards */}
            {capabilities.map((cap, i) => (
              <div key={i} className={`absolute z-[2] ${CARD_POSITIONS[i]}`}>
                <Reveal delay={(i + 1) * 120}>
                  <CapabilityCard
                    icon={cap.icon}
                    title={cap.title}
                    content={cap.content}
                    index={i}
                  />
                </Reveal>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Brand cross / plus shape                                            */
/* ------------------------------------------------------------------ */
function BrandCross({
  size = 80,
  color = "#87E64B",
  opacity = 0.15,
  rotate = 0,
  className = "",
}: {
  size?: number;
  color?: string;
  opacity?: number;
  rotate?: number;
  className?: string;
}) {
  const bar = size * 0.3;
  const r = size * 0.08;
  return (
    <div
      className={`pointer-events-none select-none ${className}`}
      style={{
        width: size,
        height: size,
        transform: `rotate(${rotate}deg)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          width: "100%",
          height: bar,
          marginTop: -(bar / 2),
          backgroundColor: color,
          opacity,
          borderRadius: r,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 0,
          height: "100%",
          width: bar,
          marginLeft: -(bar / 2),
          backgroundColor: color,
          opacity,
          borderRadius: r,
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Color palettes                                                      */
/* ------------------------------------------------------------------ */
const VALUE_COLORS = [
  "bg-[#E8FFD1]",
  "bg-[#EDE8FF]",
  "bg-[#FFF8D6]",
  "bg-[#E0FFF5]",
];

/* ------------------------------------------------------------------ */
/*  Trust carousel with dots                                           */
/* ------------------------------------------------------------------ */
const TRUST_AUTO_INTERVAL = 4000;
const TRUST_CARD_WIDTH = 320;
const TRUST_GAP = 20;

function TrustCarousel({ items }: { items: { pill: string; desc: string }[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollTo = useCallback((index: number) => {
    if (!scrollRef.current) return;
    const offset = index * (TRUST_CARD_WIDTH + TRUST_GAP);
    scrollRef.current.scrollTo({ left: offset, behavior: "smooth" });
    setActive(index);
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActive((prev) => {
        const next = (prev + 1) % items.length;
        scrollTo(next);
        return next;
      });
    }, TRUST_AUTO_INTERVAL);
  }, [items.length, scrollTo]);

  useEffect(() => {
    if (!paused) startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused, startTimer]);

  const handleDot = (index: number) => {
    scrollTo(index);
    if (timerRef.current) clearInterval(timerRef.current);
    startTimer();
  };

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        ref={scrollRef}
        className="flex gap-5 overflow-x-auto scrollbar-hide scroll-smooth [mask-image:linear-gradient(to_right,transparent,black_3%,black_97%,transparent)]"
        style={{ scrollbarWidth: "none" }}
      >
        {items.map((item, i) => (
          <div
            key={i}
            className={`bg-white/10 backdrop-blur-sm rounded-2xl p-6 shrink-0 flex flex-col transition-opacity duration-300 ${
              i === active ? "opacity-100" : "opacity-70"
            }`}
            style={{ width: TRUST_CARD_WIDTH }}
          >
            <h3 className="text-white font-bold text-base mb-2">{item.pill}</h3>
            <p className="text-white/70 text-sm leading-relaxed mb-4">
              {item.desc}
            </p>
            <div className="mt-auto rounded-xl bg-white/[0.06] aspect-[16/10] flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <div className="w-5 h-5 rounded-full bg-[#87E64B]/20" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Dots */}
      <div className="flex items-center justify-center gap-2 mt-8">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => handleDot(i)}
            className={`rounded-full transition-all duration-300 ${
              i === active
                ? "w-6 h-2.5 bg-white"
                : "w-2.5 h-2.5 bg-white/30 hover:bg-white/50"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function AboutPage() {
  const t = useTranslations("pages.about");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return <LoadingFullscreen />;
  }

  const capabilities = [
    {
      icon: <SendDiagonal width={20} height={20} strokeWidth={1.5} />,
      titleKey: "cap1Title",
      contentKey: "cap1Content",
    },
    {
      icon: <Lock width={20} height={20} strokeWidth={1.5} />,
      titleKey: "cap2Title",
      contentKey: "cap2Content",
    },
    {
      icon: <Settings width={20} height={20} strokeWidth={1.5} />,
      titleKey: "cap3Title",
      contentKey: "cap3Content",
    },
    {
      icon: <CreditCard width={20} height={20} strokeWidth={1.5} />,
      titleKey: "cap4Title",
      contentKey: "cap4Content",
    },
    {
      icon: <StatsReport width={20} height={20} strokeWidth={1.5} />,
      titleKey: "cap5Title",
      contentKey: "cap5Content",
    },
  ];

  const trustItems = [
    { pill: t("trustPill1"), desc: t("trust1") },
    { pill: t("trustPill2"), desc: t("trust2") },
    { pill: t("trustPill3"), desc: t("trust3") },
    { pill: t("trustPill4"), desc: t("trust4") },
    { pill: t("trustPill5"), desc: t("trust5") },
    { pill: t("trustPill6"), desc: t("trust6") },
  ];

  const values = [
    { num: "01", titleKey: "value1Title", contentKey: "value1Content" },
    { num: "02", titleKey: "value2Title", contentKey: "value2Content" },
    { num: "03", titleKey: "value3Title", contentKey: "value3Content" },
    { num: "04", titleKey: "value4Title", contentKey: "value4Content" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* ── 1. Hero + decorative crosses ─────────────────────── */}
        <div className="relative overflow-hidden">
          <PageHero
            title={t.rich("title", {
              highlight: (chunks) => (
                <span className="ze-highlight-green">{chunks}</span>
              ),
            })}
            subtitle={t("subtitle")}
          />
          <BrandCross
            size={120}
            color="#87E64B"
            opacity={0.15}
            rotate={12}
            className="absolute -bottom-8 -right-6 hidden md:block animate-[floatShapeSlow_10s_ease-in-out_infinite]"
          />
          <BrandCross
            size={64}
            color="#5E53E0"
            opacity={0.12}
            rotate={-8}
            className="absolute bottom-16 left-12 hidden md:block"
          />
        </div>

        {/* ── 2. The Problem — text left, image right ───────────── */}
        <section className="max-w-6xl mx-auto px-6 pt-36 pb-30 md:pb-36">
          <Reveal>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
              <div>
                <h2 className="text-3xl md:text-5xl font-bold text-[#171717] mb-6">
                  {t.rich("problemTitle", {
                    highlight: (chunks) => (
                      <span className="ze-highlight-purple">{chunks}</span>
                    ),
                  })}
                </h2>
                <div className="space-y-4">
                  <p className="text-gray-500 font-medium text-base md:text-lg leading-relaxed">
                    {t("problemP1")}
                  </p>
                  <p className="text-gray-500 font-medium text-base md:text-lg leading-relaxed">
                    {t("problemP2")}
                  </p>
                  <p className="text-gray-500 font-medium text-base md:text-lg leading-relaxed">
                    {t("problemP3")}
                  </p>
                </div>
              </div>
              <Reveal delay={200}>
                <div className="relative">
                  <ImageZone
                    alt="Creative freelancer working on a project"
                    aspect="aspect-[4/3]"
                  />
                  <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-[#87E64B]/10 -z-10 pointer-events-none" />
                  <div className="absolute -bottom-6 -left-6 w-20 h-14 rounded-2xl bg-[#5E53E0]/10 rotate-6 -z-10 pointer-events-none" />
                </div>
              </Reveal>
            </div>
          </Reveal>
        </section>

        {/* ── 3. Origin Story — dark card + interior shapes ────── */}
        <Reveal>
          <section className="max-w-7xl mx-auto px-6 mt-10 mb-10">
            <div className="bg-[#171717] text-white rounded-3xl overflow-hidden relative">
              <div className="absolute top-8 right-8 w-40 h-28 rounded-3xl bg-[#87E64B]/[0.08] rotate-12 pointer-events-none" />
              <div className="absolute bottom-10 left-12 w-20 h-20 rounded-full bg-[#5E53E0]/10 pointer-events-none" />

              <div className="grid grid-cols-1 lg:grid-cols-2 relative z-10">
                <div className="p-10 md:p-16 flex flex-col justify-center">
                  <h2 className="text-3xl md:text-5xl font-bold mb-2">
                    {t.rich("storyTitle", {
                      highlight: (chunks) => (
                        <span className="ze-highlight-green">{chunks}</span>
                      ),
                    })}
                  </h2>
                  <p className="text-gray-500 font-medium text-sm mb-8">
                    {t("storyTagline")}
                  </p>
                  <div className="space-y-5">
                    <p className="text-gray-400 font-medium text-base leading-relaxed">
                      {t("storyP1")}
                    </p>
                    <p className="text-gray-400 font-medium text-base leading-relaxed">
                      {t("storyP2")}
                    </p>
                    <p className="text-gray-400 font-medium text-base leading-relaxed">
                      {t("storyP3")}
                    </p>
                  </div>
                </div>
                <div className="relative min-h-[300px] lg:min-h-0">
                  <ImageZone
                    alt="African creatives collaborating"
                    aspect="aspect-auto"
                    className="h-full rounded-none lg:rounded-none"
                  />
                </div>
              </div>
            </div>
          </section>
        </Reveal>

        {/* ── 4. Capabilities — interactive slideshow ──────────── */}
        <CapabilitiesSlideshow
          title={t.rich("capabilitiesTitle", {
            highlight: (chunks) => (
              <span className="ze-highlight-purple">{chunks}</span>
            ),
          })}
          capabilities={capabilities.map((cap) => ({
            ...cap,
            title: t(cap.titleKey),
            content: t(cap.contentKey),
          }))}
        />

        {/* Section separator: Capabilities → Security */}
        <div className="relative max-w-6xl mx-auto">
          <BrandCross
            size={100}
            color="#5E53E0"
            opacity={0.12}
            rotate={15}
            className="absolute -top-12 right-[15%] hidden md:block"
          />
        </div>

        {/* ── 5. Security — bold purple + trust cards ──────────── */}
        <section className="bg-[#5E53E0] relative overflow-hidden">
          <BrandCross
            size={200}
            color="#ffffff"
            opacity={0.06}
            rotate={15}
            className="absolute -top-12 -right-12 hidden md:block"
          />
          <BrandCross
            size={120}
            color="#87E64B"
            opacity={0.1}
            rotate={-10}
            className="absolute -bottom-8 -left-8 hidden md:block"
          />
          <BrandCross
            size={60}
            color="#ffffff"
            opacity={0.08}
            rotate={25}
            className="absolute top-1/3 right-[8%] hidden lg:block"
          />

          <div className="max-w-6xl mx-auto px-6 py-32 md:py-40 relative z-10">
            <Reveal>
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-5xl font-bold text-white mb-3">
                  {t.rich("trustTitle", {
                    highlight: (chunks) => (
                      <span className="ze-highlight-white">{chunks}</span>
                    ),
                  })}
                </h2>
                <p className="text-white/70 text-base max-w-xl mx-auto leading-relaxed">
                  {t("trustIntro")}
                </p>
              </div>
            </Reveal>

            <TrustCarousel items={trustItems} />
          </div>
        </section>

        {/* ── 6. Made in Africa — green gradient + shapes ──────── */}
        <section className="pt-10 relative overflow-hidden bg-gradient-to-br from-[#87E64B]/10 via-white to-[#87E64B]/5">
          <BrandCross
            size={80}
            color="#87E64B"
            opacity={0.2}
            rotate={20}
            className="absolute -top-6 left-[20%] hidden md:block"
          />
          <div className="absolute top-12 -right-12 w-44 h-28 rounded-3xl bg-[#87E64B]/10 rotate-12 pointer-events-none animate-[floatShapeSlow_10s_ease-in-out_infinite]" />
          <div className="absolute bottom-16 left-8 w-28 h-28 rounded-full border-[3px] border-[#F59E0B]/10 pointer-events-none" />

          <Reveal>
            <div className="max-w-6xl mx-auto px-6 py-20 md:py-28 relative z-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 items-center">
                <Reveal delay={100}>
                  <ImageZone
                    alt="African creative professionals at work"
                    aspect="aspect-[4/3]"
                  />
                </Reveal>
                <div>
                  <h2 className="text-3xl md:text-5xl font-bold text-[#171717] mb-6">
                    {t.rich("africaTitle", {
                      highlight: (chunks) => (
                        <span className="ze-highlight-green">{chunks}</span>
                      ),
                    })}
                  </h2>
                  <div className="space-y-5">
                    <p className="text-gray-500 text-base md:text-base leading-relaxed">
                      {t("africaP1")}
                    </p>
                    <p className="text-gray-500 text-base md:text-base leading-relaxed">
                      {t("africaP2")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ── 7. Values — colorful cards + watermark numbers ──── */}
        <section>
          <div className="max-w-6xl mx-auto px-6 pb-22 pt-8 md:pt-8 md:pb-22">
            <Reveal>
              <h2 className="text-3xl md:text-5xl font-bold text-[#171717] mb-14 text-center">
                {t.rich("valuesTitle", {
                  highlight: (chunks) => (
                    <span className="ze-highlight-green">{chunks}</span>
                  ),
                })}
              </h2>
            </Reveal>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {values.map((v, i) => (
                <Reveal key={i} delay={i * 100}>
                  <div
                    className={`rounded-2xl p-8 ${VALUE_COLORS[i]} relative overflow-hidden transition-transform duration-300 hover:-translate-y-1`}
                  >
                    <span className="absolute -top-4 -right-2 text-[120px] font-black leading-none text-[#171717]/[0.04] pointer-events-none select-none">
                      {v.num}
                    </span>
                    <div className="relative z-10">
                      <h3 className="text-lg font-bold text-[#171717] mb-2">
                        {t(v.titleKey)}
                      </h3>
                      <p className="text-gray-600 text-base leading-relaxed">
                        {t(v.contentKey)}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── 8. CTA — green card + interior shapes ────────────── */}
        <Reveal>
          <section className="max-w-6xl mx-auto px-6 pb-20 md:pt-20 md:pb-28">
            <div className="bg-[#87E64B] rounded-3xl p-10 md:p-16 text-center relative overflow-hidden">
              <div className="absolute -top-6 -right-6 w-40 h-28 rounded-3xl bg-white/15 rotate-12 pointer-events-none" />
              <div className="absolute -bottom-8 -left-4 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
              <div className="absolute top-1/2 right-[15%] w-16 h-16 rounded-full bg-white/[0.08] pointer-events-none" />

              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold text-[#171717] mb-4">
                  {t.rich("ctaTitle", {
                    highlight: (chunks) => (
                      <span className="ze-highlight-purple">{chunks}</span>
                    ),
                  })}
                </h2>
                <p className="text-[#171717]/70 text-base md:text-lg mb-10 max-w-xl mx-auto">
                  {t("ctaSubtext")}
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    href="/"
                    className="bg-[#171717] text-white px-8 py-3.5 rounded font-bold text-lg hover:bg-[#2a2a2a] transition-colors"
                  >
                    {t("ctaButton")}
                  </Link>
                  <Link
                    href="/how-it-works"
                    className="text-[#171717] font-semibold underline underline-offset-2 hover:opacity-70 transition-opacity"
                  >
                    {t("ctaSecondaryLabel")}
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </Reveal>
      </main>

      <Footer />
    </div>
  );
}
