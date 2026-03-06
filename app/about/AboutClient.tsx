"use client";

import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import CrossLinks from "@/components/shared/CrossLinks";
import PageHero from "@/components/shared/PageHero";
import SectionIndicator from "@/components/shared/SectionIndicator";
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
/*  Animated counter (same style as How-It-Works stats bar)            */
/* ------------------------------------------------------------------ */
function AnimatedNumber({
  target,
  suffix = "",
  duration = 1500,
}: {
  target: number;
  suffix?: string;
  duration?: number;
}) {
  const { ref, visible } = useInView(0.3);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [visible, target, duration]);

  return (
    <div ref={ref}>
      <span className="text-6xl md:text-8xl font-bold text-[#2d6b0e]/[0.12]">
        {count}
        <span className="text-4xl md:text-5xl">{suffix}</span>
      </span>
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
/*  Capabilities — dark fan cards (5 cards)                             */
/* ------------------------------------------------------------------ */
function CapCardInner({
  number,
  title,
  content,
}: {
  number: number;
  title: string;
  content: string;
}) {
  return (
    <div className="bg-[#171717] border border-[#87E64B]/20 rounded-2xl p-6 md:p-8 text-white h-full flex flex-col">
      <div className="flex items-start gap-1 mb-4">
        <span className="text-[#87E64B] text-3xl md:text-4xl font-bold leading-none">
          {String(number).padStart(2, "0")}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          className="mt-0.5"
        >
          <path
            d="M7 0L8.8 4.6L14 5.2L10.2 8.6L11.2 14L7 11.4L2.8 14L3.8 8.6L0 5.2L5.2 4.6L7 0Z"
            fill="#87E64B"
          />
        </svg>
      </div>
      <h3 className="text-lg md:text-xl font-bold mb-2">{title}</h3>
      <p className="text-white/60 font-medium text-base leading-relaxed flex-1">
        {content}
      </p>
    </div>
  );
}

function CapabilitiesFanCards({
  title,
  capabilities,
}: {
  title: string | ReactNode;
  capabilities: {
    title: string;
    content: string;
  }[];
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  /* Top row: 3 cards, fanned */
  const topRest = [
    "rotate(-4deg)",
    "rotate(0deg) translateY(-10px)",
    "rotate(4deg)",
  ];
  const getTopHover = (i: number) => {
    if (hovered === null) return topRest[i];
    if (hovered === i) return "rotate(0deg) translateY(-20px)";
    if (i === 0) return "rotate(-6deg) translateX(-12px)";
    if (i === 2) return "rotate(6deg) translateX(12px)";
    return "rotate(0deg) translateY(-10px)";
  };

  /* Bottom row: 2 cards, fanned */
  const botRest = ["rotate(-3deg)", "rotate(3deg)"];
  const getBotHover = (ri: number) => {
    const gi = ri + 3; // global index
    if (hovered === null) return botRest[ri];
    if (hovered === gi) return "rotate(0deg) translateY(-20px)";
    if (ri === 0) return "rotate(-5deg) translateX(-12px)";
    return "rotate(5deg) translateX(12px)";
  };

  return (
    <section className="max-w-5xl mx-auto px-6 pt-20 md:pt-32 pb-8">
      <Reveal>
        <h2 className="text-3xl md:text-5xl font-bold text-[#171717] mb-24 md:mb-24 text-center">
          {title}
        </h2>
      </Reveal>

      {/* Desktop: 2 rows of fanned cards */}
      <div className="hidden md:block" onMouseLeave={() => setHovered(null)}>
        {/* Row 1: 3 cards */}
        <div className="flex justify-center items-stretch mb-6">
          {capabilities.slice(0, 3).map((cap, i) => (
            <div
              key={i}
              className="cursor-pointer"
              style={{
                width: "34%",
                flexShrink: 0,
                marginLeft: i === 0 ? 0 : "-2%",
                transform: getTopHover(i),
                transformOrigin: "bottom center",
                transition:
                  "transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.3s ease",
                zIndex: hovered === i ? 10 : i === 1 ? 5 : 1,
                filter:
                  hovered !== null && hovered !== i
                    ? "brightness(0.92)"
                    : "none",
              }}
              onMouseEnter={() => setHovered(i)}
            >
              <CapCardInner
                number={i + 1}
                title={cap.title}
                content={cap.content}
              />
            </div>
          ))}
        </div>

        {/* Row 2: 2 cards */}
        <div className="flex justify-center items-stretch">
          {capabilities.slice(3, 5).map((cap, ri) => (
            <div
              key={ri}
              className="cursor-pointer"
              style={{
                width: "34%",
                flexShrink: 0,
                marginLeft: ri === 0 ? 0 : "-2%",
                transform: getBotHover(ri),
                transformOrigin: "bottom center",
                transition:
                  "transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.3s ease",
                zIndex: hovered === ri + 3 ? 10 : 1,
                filter:
                  hovered !== null && hovered !== ri + 3
                    ? "brightness(0.92)"
                    : "none",
              }}
              onMouseEnter={() => setHovered(ri + 3)}
            >
              <CapCardInner
                number={ri + 4}
                title={cap.title}
                content={cap.content}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Mobile: stacked */}
      <div className="md:hidden space-y-5">
        {capabilities.map((cap, i) => (
          <Reveal key={i}>
            <CapCardInner
              number={i + 1}
              title={cap.title}
              content={cap.content}
            />
          </Reveal>
        ))}
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
  "bg-[#F4F5F7]",
  "bg-[#F4F5F7]",
  "bg-[#F4F5F7]",
  "bg-[#F4F5F7]",
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
  const dragRef = useRef({ isDown: false, startX: 0, scrollLeft: 0 });

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

  const onScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const index = Math.round(
      scrollRef.current.scrollLeft / (TRUST_CARD_WIDTH + TRUST_GAP),
    );
    setActive(Math.min(index, items.length - 1));
  }, [items.length]);

  const onDragStart = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    dragRef.current = {
      isDown: true,
      startX: e.pageX - scrollRef.current.offsetLeft,
      scrollLeft: scrollRef.current.scrollLeft,
    };
    scrollRef.current.style.scrollBehavior = "auto";
    setPaused(true);
  };
  const onDragEnd = () => {
    dragRef.current.isDown = false;
    if (scrollRef.current) scrollRef.current.style.scrollBehavior = "";
  };
  const onDragMove = (e: React.MouseEvent) => {
    if (!dragRef.current.isDown || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    scrollRef.current.scrollLeft =
      dragRef.current.scrollLeft - (x - dragRef.current.startX);
  };

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => {
        setPaused(false);
        onDragEnd();
      }}
    >
      <div
        ref={scrollRef}
        className="flex gap-5 overflow-x-auto scrollbar-hide scroll-smooth [mask-image:linear-gradient(to_right,transparent,black_3%,black_97%,transparent)] cursor-grab active:cursor-grabbing"
        style={{ scrollbarWidth: "none" }}
        onScroll={onScroll}
        onMouseDown={onDragStart}
        onMouseUp={onDragEnd}
        onMouseMove={onDragMove}
        onMouseLeave={onDragEnd}
      >
        {items.map((item, i) => (
          <div
            key={i}
            className={`bg-white rounded-2xl p-6 shrink-0 flex flex-col transition-opacity duration-300 border border-gray-100 ${
              i === active ? "opacity-100" : "opacity-70"
            }`}
            style={{ width: TRUST_CARD_WIDTH }}
          >
            <h3 className="text-[#171717] font-bold text-base mb-2">
              {item.pill}
            </h3>
            <p className="text-[#171717] font-medium text-base leading-relaxed mb-4">
              {item.desc}
            </p>
            <div className="mt-auto rounded-xl bg-[#F3F0FF] aspect-[16/10] flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-[#5E53E0]/10 flex items-center justify-center">
                <div className="w-5 h-5 rounded-full bg-[#5E53E0]/20" />
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
                ? "w-6 h-2.5 bg-[#5E53E0]"
                : "w-2.5 h-2.5 bg-[#5E53E0]/20 hover:bg-[#5E53E0]/40"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

const ABOUT_SECTIONS = [
  { id: "about-hero", label: "Hero" },
  { id: "about-problem", label: "The Problem" },
  { id: "about-stats", label: "Numbers" },
  { id: "about-origin", label: "Our Story" },
  { id: "about-capabilities", label: "Capabilities" },
  { id: "about-trust", label: "Trust" },
  { id: "about-africa", label: "Made in Africa" },
  { id: "about-values", label: "Values" },
  { id: "about-cta", label: "Get Started" },
] as const;

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function AboutClient() {
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

      <SectionIndicator sections={ABOUT_SECTIONS} />

      <main className="flex-1">
        {/* ── 1. Hero + decorative crosses ─────────────────────── */}
        <div id="about-hero" className="relative overflow-x-clip">
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
        <section
          id="about-problem"
          className="max-w-6xl mx-auto px-6 pt-36 pb-30 md:pb-36"
        >
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
                  <p className="text-[#171717] font-medium text-base leading-relaxed">
                    {t("problemP1")}
                  </p>
                  <p className="text-[#171717] font-medium text-base leading-relaxed">
                    {t("problemP2")}
                  </p>
                  <p className="text-[#171717] font-medium text-base leading-relaxed">
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

        {/* ── 2b. Pain Points in Numbers (same style as How-It-Works stats bar) */}
        <section
          id="about-stats"
          className="relative overflow-x-clip bg-gradient-to-b from-white via-[#EAF9DE] to-white"
        >
          <BrandCross
            size={160}
            color="#5E53E0"
            opacity={0.06}
            rotate={-15}
            className="absolute top-6 -right-12 hidden md:block"
          />
          <BrandCross
            size={80}
            color="#87E64B"
            opacity={0.12}
            rotate={20}
            className="absolute top-[55%] -left-6 hidden lg:block"
          />
          <BrandCross
            size={55}
            color="#5E53E0"
            opacity={0.07}
            rotate={8}
            className="absolute bottom-[10%] right-[8%] hidden md:block"
          />

          <div className="max-w-6xl mx-auto px-6 py-20 md:py-32 relative z-10">
            <Reveal>
              <div className="mb-20 md:mb-28">
                <p className="text-2xl md:text-4xl text-[#171717]/50 font-light leading-snug">
                  {t("painStatsTagline")}
                </p>
              </div>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-12">
              <Reveal delay={0}>
                <div className="text-left">
                  <div className="mb-5">
                    <AnimatedNumber target={85} suffix="%" />
                  </div>
                  <p className="text-[#171717] font-semibold text-base leading-snug">
                    {t("painStat1Label")}
                  </p>
                </div>
              </Reveal>
              <Reveal delay={120}>
                <div className="text-left">
                  <div className="mb-5">
                    <AnimatedNumber target={102} suffix="h" />
                  </div>
                  <p className="text-[#171717] font-semibold text-base leading-snug">
                    {t("painStat2Label")}
                  </p>
                </div>
              </Reveal>
              <Reveal delay={240}>
                <div className="text-left">
                  <div className="mb-5">
                    <AnimatedNumber target={71} suffix="%" />
                  </div>
                  <p className="text-[#171717] font-semibold text-base leading-snug">
                    {t("painStat3Label")}
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── 3. Origin Story — dark card + interior shapes ────── */}
        <Reveal>
          <section
            id="about-origin"
            className="max-w-7xl mx-auto px-6 mt-10 mb-10"
          >
            <div className="bg-[#FDFAF4] text-white rounded-3xl overflow-hidden relative">
              <div className="absolute top-8 right-8 w-40 h-28 rounded-3xl bg-[#87E64B]/[0.08] rotate-12 pointer-events-none" />
              <div className="absolute bottom-10 left-12 w-20 h-20 rounded-full bg-[#5E53E0]/10 pointer-events-none" />

              <div className="grid grid-cols-1 lg:grid-cols-2 relative z-10">
                <div className="p-10 md:p-16 flex flex-col justify-center">
                  <h2 className="text-3xl md:text-5xl text-[#171717] font-bold mb-2">
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
                    <p className="text-[#171717] font-medium text-base leading-relaxed">
                      {t("storyP1")}
                    </p>
                    <p className="text-[#171717] font-medium text-base leading-relaxed">
                      {t("storyP2")}
                    </p>
                    <p className="text-[#171717] font-medium text-base leading-relaxed">
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

        {/* ── 4. Capabilities — dark fan cards ────────────────── */}
        <div id="about-capabilities">
          <CapabilitiesFanCards
            title={t.rich("capabilitiesTitle", {
              highlight: (chunks) => (
                <span className="ze-highlight-purple">{chunks}</span>
              ),
            })}
            capabilities={capabilities.map((cap) => ({
              title: t(cap.titleKey),
              content: t(cap.contentKey),
            }))}
          />
        </div>

        {/* Section separator: Capabilities → Security */}
        <div className="relative max-w-6xl mx-auto h-16 z-20">
          <BrandCross
            size={100}
            color="#5E53E0"
            opacity={0.12}
            rotate={15}
            className="absolute top-0 right-[15%] hidden md:block"
          />
        </div>

        {/* ── 5. Security — trust cards ──────────────────────── */}
        <section
          id="about-trust"
          className="bg-gradient-to-b from-white via-[#FDFAF4] to-white relative overflow-x-clip"
        >
          <BrandCross
            size={200}
            color="#5E53E0"
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
            color="#5E53E0"
            opacity={0.08}
            rotate={25}
            className="absolute top-1/3 right-[8%] hidden lg:block"
          />

          <div className="max-w-6xl mx-auto px-6 py-32 md:py-40 relative z-10">
            <Reveal>
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-5xl font-bold text-[#171717] mb-3">
                  {t.rich("trustTitle", {
                    highlight: (chunks) => (
                      <span className="ze-highlight-purple">{chunks}</span>
                    ),
                  })}
                </h2>
                <p className="text-gray-500 text-base max-w-xl mx-auto leading-relaxed">
                  {t("trustIntro")}
                </p>
              </div>
            </Reveal>

            <TrustCarousel items={trustItems} />
          </div>
        </section>

        {/* ── 6. Made in Africa — green gradient + shapes ──────── */}
        <section
          id="about-africa"
          className="pt-10 relative overflow-x-clip bg-gradient-to-br from-[#87E64B]/10 via-white to-[#87E64B]/5"
        >
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
                    <p className="text-[#171717] font-medium text-base md:text-base leading-relaxed">
                      {t("africaP1")}
                    </p>
                    <p className="text-[#171717] font-medium text-base md:text-base leading-relaxed">
                      {t("africaP2")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ── 7. Values — colorful cards + watermark numbers ──── */}
        <section id="about-values">
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
                      <p className="text-[#171717] font-medium text-base">
                        {t(v.contentKey)}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Cross-links */}
        <div className="pt-4">
          <CrossLinks exclude="about" />
        </div>

        {/* ── 8. CTA — green card + interior shapes ────────────── */}
        <Reveal>
          <section
            id="about-cta"
            className="max-w-6xl mx-auto px-6 pb-20 md:pt-20 md:pb-28"
          >
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
                <p className="text-[#171717]/70 font-medium text-base mb-10 max-w-xl mx-auto">
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
