"use client";

import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import CrossLinks from "@/components/shared/CrossLinks";
import SectionIndicator from "@/components/shared/SectionIndicator";
import PageHero from "@/components/shared/PageHero";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Upload,
  Lock,
  Eye,
  CreditCard,
  Clock,
  Mail,
  Download,
  SendDiagonal,
  Settings,
  StatsReport,
  MediaImage,
  SoundHigh,
  VideoCamera,
  Page,
  Archive,
  PageStar,
  RefreshDouble,
  HandCash,
} from "iconoir-react";

/* ------------------------------------------------------------------ */
/*  Scroll-triggered reveal (same pattern as About page)               */
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
  dark = false,
}: {
  src?: string;
  alt: string;
  className?: string;
  aspect?: string;
  dark?: boolean;
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
      className={`relative overflow-hidden rounded-2xl ${aspect} ${className} ${
        dark
          ? "bg-gradient-to-br from-[#2a2a2a] via-[#333] to-[#2a2a2a]"
          : "bg-gradient-to-br from-[#F3F0FF] via-[#FDFAF4] to-[#F0FFF4] dark:from-[#1a1530] dark:via-[#141218] dark:to-[#0f1a14]"
      }`}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={`w-16 h-16 rounded-full backdrop-blur-sm flex items-center justify-center ${
            dark ? "bg-white/10" : "bg-white/60"
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-[#87E64B]/30" />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Brand cross / plus shape (same as About page)                      */
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
/*  2. Step cards — 3 dark cards in a fan layout with hover tilt       */
/* ------------------------------------------------------------------ */
function StepCardInner({
  number,
  title,
  content,
  imageAlt,
}: {
  number: number;
  title: string;
  content: string;
  imageAlt: string;
}) {
  return (
    <div className="bg-[#171717] border border-[#87E64B]/20 rounded-2xl p-6 md:p-8 text-white h-full flex flex-col">
      <div className="flex items-start gap-1 mb-4">
        <span className="text-[#87E64B] text-2xl md:text-4xl font-bold leading-none">
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
      <h3 className="text-xl md:text-xl font-bold mb-3">{title}</h3>
      <p className="text-white/60 font-medium text-base leading-relaxed mb-6 flex-1">
        {content}
      </p>
      <div className="rounded-xl overflow-hidden bg-[#2a2a2a]">
        <ImageZone alt={imageAlt} aspect="aspect-[16/10]" dark />
      </div>
    </div>
  );
}

function StepCards({
  title,
  steps,
}: {
  title: ReactNode;
  steps: { title: string; content: string; imageAlt: string }[];
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  /* ── per-card transforms ────────────────────────────────── */
  /* Rest: gentle fan, cards barely overlap at edges only.     */
  /* Hover: hovered card lifts, neighbors nudge outward.       */
  const restTransforms = [
    "rotate(-7deg)",
    "rotate(0deg) translateY(-12px)",
    "rotate(7deg)",
  ];

  const getHoverTransform = (i: number) => {
    if (hovered === null) return restTransforms[i];
    if (hovered === i) {
      return "rotate(0deg) translateY(-24px)";
    }
    // non-hovered: spread outward
    if (i === 0) return "rotate(-7deg) translateX(-16px)";
    if (i === 2) return "rotate(7deg) translateX(16px)";
    return "rotate(0deg) translateY(-12px)";
  };

  return (
    <section className="max-w-5xl mx-auto px-6 pt-28 md:pt-36 pb-32 md:pb-28">
      <Reveal>
        <h2 className="text-3xl md:text-5xl font-bold text-[#171717] dark:text-white pb-8 mb-28 md:mb-24 text-center">
          {title}
        </h2>
      </Reveal>

      {/* Desktop: overlapping fan with negative margins */}
      <div
        className="hidden md:flex justify-center items-stretch"
        onMouseLeave={() => setHovered(null)}
      >
        {steps.map((step, i) => (
          <div
            key={i}
            className="cursor-pointer"
            style={{
              width: "40%",
              flexShrink: 0,
              marginLeft: i === 0 ? 0 : "-4%",
              transform: getHoverTransform(i),
              transformOrigin: "bottom center",
              transition:
                "transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.3s ease",
              zIndex: hovered === i ? 10 : i === 1 ? 5 : 1,
              filter:
                hovered !== null && hovered !== i ? "brightness(0.92)" : "none",
            }}
            onMouseEnter={() => setHovered(i)}
          >
            <StepCardInner
              number={i + 1}
              title={step.title}
              content={step.content}
              imageAlt={step.imageAlt}
            />
          </div>
        ))}
      </div>

      {/* Mobile: stacked */}
      <div className="md:hidden space-y-6">
        {steps.map((step, i) => (
          <Reveal key={i}>
            <StepCardInner
              number={i + 1}
              title={step.title}
              content={step.content}
              imageAlt={step.imageAlt}
            />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  3. Dual perspective toggle                                         */
/* ------------------------------------------------------------------ */
interface PerspectiveStep {
  icon: ReactNode;
  title: string;
  description: string;
}

function StackedCard({
  label,
  steps,
  colorScheme,
  isActive,
  position,
  onClick,
}: {
  label: string;
  steps: PerspectiveStep[];
  colorScheme: "green" | "purple";
  isActive: boolean;
  position: "front" | "back";
  onClick: () => void;
}) {
  const bg = colorScheme === "green" ? "bg-[#171717]" : "bg-[#1a1a2e]";
  const border =
    colorScheme === "green" ? "border-[#87E64B]/20" : "border-[#5E53E0]/20";
  const accentBar = colorScheme === "green" ? "bg-[#87E64B]" : "bg-[#5E53E0]";
  const numberColor =
    colorScheme === "green" ? "text-[#87E64B]" : "text-[#5E53E0]";

  return (
    <div
      onClick={onClick}
      className={`${bg} border ${border} rounded-2xl p-8 md:p-10 absolute inset-0 cursor-pointer transition-all duration-500 ease-out`}
      style={{
        transform: isActive
          ? "translateY(0) scale(1)"
          : position === "back"
            ? "translateY(16px) scale(0.97)"
            : "translateY(-16px) scale(0.97)",
        opacity: isActive ? 1 : 0.5,
        zIndex: isActive ? 10 : 1,
        pointerEvents: isActive ? "auto" : "auto",
      }}
    >
      {/* Card heading */}
      <div className="mb-8 flex items-center gap-3">
        <h3 className="text-lg md:text-xl font-bold text-white">{label}</h3>
        <div className={`w-10 h-[2px] ${accentBar}`} />
      </div>

      {/* 2x2 step grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {steps.map((step, i) => (
          <div key={i} className="flex gap-3 items-start">
            <span
              className={`text-3xl md:text-4xl font-bold shrink-0 leading-none ${numberColor} opacity-20`}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0 pt-1">
              <h4 className="font-bold text-white text-base leading-snug">
                {step.title}
              </h4>
              <p className="text-gray-400 text-base font-medium leading-relaxed mt-1">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SplitPerspective({
  title,
  subtitle,
  senderLabel,
  receiverLabel,
  senderSteps,
  receiverSteps,
}: {
  title: ReactNode;
  subtitle: string;
  senderLabel: string;
  receiverLabel: string;
  senderSteps: PerspectiveStep[];
  receiverSteps: PerspectiveStep[];
}) {
  const [active, setActive] = useState<"sender" | "receiver">("sender");

  return (
    <section className="pt-20 md:pt-28 pb-10 md:pb-14">
      <div className="max-w-5xl mx-auto px-6">
        <Reveal>
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-5xl font-bold text-[#171717] dark:text-white mb-3">
              {title}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-base max-w-xl mx-auto leading-relaxed">
              {subtitle}
            </p>
          </div>
        </Reveal>

        {/* Toggle */}
        <Reveal delay={100}>
          <div className="flex justify-center mb-10">
            <div className="inline-flex bg-[#171717] rounded-md p-1 gap-1">
              <button
                onClick={() => setActive("sender")}
                className={`px-5 py-2.5 text-sm font-bold rounded-md transition-all duration-300 ${
                  active === "sender"
                    ? "bg-[#87E64B] text-[#171717]"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {senderLabel}
              </button>
              <button
                onClick={() => setActive("receiver")}
                className={`px-5 py-2.5 text-sm font-bold rounded-md transition-all duration-300 ${
                  active === "receiver"
                    ? "bg-[#5E53E0] text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {receiverLabel}
              </button>
            </div>
          </div>
        </Reveal>

        {/* Stacked cards — desktop only */}
        <Reveal delay={200}>
          <div className="relative hidden md:block" style={{ height: 380 }}>
            <StackedCard
              label={senderLabel}
              steps={senderSteps}
              colorScheme="green"
              isActive={active === "sender"}
              position="front"
              onClick={() => setActive("sender")}
            />
            <StackedCard
              label={receiverLabel}
              steps={receiverSteps}
              colorScheme="purple"
              isActive={active === "receiver"}
              position="back"
              onClick={() => setActive("receiver")}
            />
          </div>
        </Reveal>

        {/* Mobile: simple stacked view */}
        <div className="md:hidden mt-4">
          <div
            className={`transition-all duration-500 ease-out ${
              active === "sender"
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-4 absolute pointer-events-none"
            }`}
          >
            <div className="bg-[#171717] border border-[#87E64B]/20 rounded-2xl p-6 space-y-5">
              {senderSteps.map((step, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="text-2xl font-bold text-[#87E64B] opacity-20 shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h4 className="font-bold text-white text-base">
                      {step.title}
                    </h4>
                    <p className="text-gray-400 font-medium text-base mt-0.5">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div
            className={`transition-all duration-500 ease-out ${
              active === "receiver"
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4 absolute pointer-events-none"
            }`}
          >
            <div className="bg-[#1a1a2e] border border-[#5E53E0]/20 rounded-2xl p-6 space-y-5">
              {receiverSteps.map((step, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="text-2xl font-bold text-[#5E53E0] opacity-20 shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h4 className="font-bold text-white text-sm">
                      {step.title}
                    </h4>
                    <p className="text-gray-400 font-medium text-base mt-0.5">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  4. Feature carousel (same layout as About's Security section)       */
/* ------------------------------------------------------------------ */
const FEATURE_CARD_WIDTH = 320;
const FEATURE_GAP = 20;
const FEATURE_AUTO_INTERVAL = 4000;

function FeatureCarousel({
  title,
  subtitle,
  features,
}: {
  title: ReactNode;
  subtitle: string;
  features: { icon: ReactNode; title: string; description: string }[];
}) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dragRef = useRef({ isDown: false, startX: 0, scrollLeft: 0 });

  const scrollTo = useCallback((index: number) => {
    if (!scrollRef.current) return;
    const offset = index * (FEATURE_CARD_WIDTH + FEATURE_GAP);
    scrollRef.current.scrollTo({ left: offset, behavior: "smooth" });
    setActive(index);
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActive((prev) => {
        const next = (prev + 1) % features.length;
        scrollTo(next);
        return next;
      });
    }, FEATURE_AUTO_INTERVAL);
  }, [features.length, scrollTo]);

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

  const onScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const index = Math.round(
      scrollRef.current.scrollLeft / (FEATURE_CARD_WIDTH + FEATURE_GAP),
    );
    setActive(Math.min(index, features.length - 1));
  }, [features.length]);

  return (
    <section className="bg-gradient-to-b from-white via-[#FDFAF4] to-white dark:from-background dark:via-[#1a1520] dark:to-background relative overflow-x-clip">
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
            <h2 className="text-3xl md:text-5xl font-bold text-[#171717] dark:text-white mb-3">
              {title}
            </h2>
            <p className="text-[#171717]/70 dark:text-white/70 font-medium text-base max-w-xl mx-auto leading-relaxed">
              {subtitle}
            </p>
          </div>
        </Reveal>

        <div
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => {
            setPaused(false);
            onDragEnd();
          }}
        >
          <div
            ref={scrollRef}
            className="flex gap-5 px-6 overflow-x-auto scrollbar-hide scroll-smooth [mask-image:linear-gradient(to_right,transparent,black_1%,black_99%,transparent)] cursor-grab active:cursor-grabbing"
            style={{ scrollbarWidth: "none" }}
            onScroll={onScroll}
            onMouseDown={onDragStart}
            onMouseUp={onDragEnd}
            onMouseMove={onDragMove}
            onMouseLeave={onDragEnd}
          >
            {features.map((feature, i) => (
              <div
                key={i}
                className={`bg-white dark:bg-card rounded-2xl p-6 shrink-0 flex flex-col transition-opacity duration-300 border border-gray-100 dark:border-border ${
                  i === active ? "opacity-100" : "opacity-70"
                }`}
                style={{ width: FEATURE_CARD_WIDTH }}
              >
                <h3 className="text-[#171717] dark:text-white font-bold text-base mb-2">
                  {feature.title}
                </h3>
                <p className="text-[#171717] dark:text-white font-medium text-base leading-relaxed mb-4">
                  {feature.description}
                </p>
                <div className="mt-auto rounded-xl bg-[#F3F0FF] dark:bg-[#1a1530] aspect-[16/10] flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-[#5E53E0]/10 flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full bg-[#5E53E0]/20" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Dots */}
          <div className="flex items-center justify-center gap-2 mt-8">
            {features.map((_, i) => (
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
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  5. File types strip                                                */
/* ------------------------------------------------------------------ */
/* Gradient tints per tile position */
const MOSAIC_TINTS = [
  "from-[#87E64B]/8 to-[#87E64B]/3", // Images — green
  "from-[#5E53E0]/8 to-[#5E53E0]/3", // Video — purple
  "from-[#F59E0B]/6 to-[#F59E0B]/2", // Audio — warm
  "from-[#87E64B]/6 to-[#87E64B]/2", // Docs — green light
  "from-[#5E53E0]/6 to-[#5E53E0]/2", // Archives — purple light
];

function MosaicTile({
  icon,
  name,
  formats,
  spec,
  tint,
  className,
  delay,
}: {
  icon: ReactNode;
  name: string;
  formats: string;
  spec: string;
  tint: string;
  className?: string;
  delay: number;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Reveal delay={delay}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`bg-gradient-to-br ${tint} border border-white/[0.06] rounded-2xl p-6 cursor-default transition-all duration-400 ease-out h-full flex flex-col ${className ?? ""}`}
        style={{
          transform: hovered ? "translateY(-6px)" : "translateY(0)",
          boxShadow: hovered
            ? "0 16px 40px rgba(0,0,0,0.15)"
            : "0 2px 8px rgba(0,0,0,0.04)",
        }}
      >
        {/* Icon */}
        <div className="w-12 h-12 rounded-xl bg-white/80 flex items-center justify-center mb-4 text-[#5E53E0]">
          {icon}
        </div>

        {/* Name */}
        <h3 className="text-lg font-bold text-[#171717] dark:text-white mb-1">{name}</h3>

        {/* Formats — always visible */}
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 leading-relaxed mb-3 flex-1">
          {formats}
        </p>

        {/* Spec badge */}
        <span className="inline-block self-start bg-[#87E64B]/10 text-[#171717] dark:text-white text-xs font-medium px-3 py-1 rounded-full">
          {spec}
        </span>
      </div>
    </Reveal>
  );
}

function FileTypeStrip({
  title,
  types,
}: {
  title: ReactNode;
  types: { icon: ReactNode; name: string; formats: string; spec: string }[];
}) {
  return (
    <section className="bg-gradient-to-b from-white via-[#FDFAF4] to-[#F5F0E8] dark:from-background dark:via-[#1a1520] dark:to-[#141210] relative overflow-x-clip py-20 md:py-28">
      <BrandCross
        size={140}
        color="#87E64B"
        opacity={0.06}
        rotate={18}
        className="absolute -top-8 -left-10 hidden md:block"
      />
      <BrandCross
        size={70}
        color="#5E53E0"
        opacity={0.07}
        rotate={-12}
        className="absolute top-[40%] -right-4 hidden lg:block"
      />
      <BrandCross
        size={50}
        color="#87E64B"
        opacity={0.09}
        rotate={30}
        className="absolute bottom-[12%] left-[7%] hidden md:block"
      />

      <div className="max-w-5xl mx-auto px-6 relative z-10">
        <Reveal>
          <h2 className="text-3xl md:text-5xl font-bold text-[#171717] dark:text-white mb-14 text-center">
            {title}
          </h2>
        </Reveal>

        {/* Desktop: balanced mosaic — 3 top, 2 wider bottom */}
        <div className="hidden md:grid grid-cols-6 gap-4">
          {/* Row 1: 3 equal tiles */}
          {types[0] && (
            <div className="col-span-2">
              <MosaicTile
                icon={types[0].icon}
                name={types[0].name}
                formats={types[0].formats}
                spec={types[0].spec}
                tint={MOSAIC_TINTS[0]}
                delay={80}
              />
            </div>
          )}
          {types[1] && (
            <div className="col-span-2">
              <MosaicTile
                icon={types[1].icon}
                name={types[1].name}
                formats={types[1].formats}
                spec={types[1].spec}
                tint={MOSAIC_TINTS[1]}
                delay={160}
              />
            </div>
          )}
          {types[2] && (
            <div className="col-span-2">
              <MosaicTile
                icon={types[2].icon}
                name={types[2].name}
                formats={types[2].formats}
                spec={types[2].spec}
                tint={MOSAIC_TINTS[2]}
                delay={240}
              />
            </div>
          )}
          {/* Row 2: 2 wider tiles */}
          {types[3] && (
            <div className="col-span-3">
              <MosaicTile
                icon={types[3].icon}
                name={types[3].name}
                formats={types[3].formats}
                spec={types[3].spec}
                tint={MOSAIC_TINTS[3]}
                delay={320}
              />
            </div>
          )}
          {types[4] && (
            <div className="col-span-3">
              <MosaicTile
                icon={types[4].icon}
                name={types[4].name}
                formats={types[4].formats}
                spec={types[4].spec}
                tint={MOSAIC_TINTS[4]}
                delay={400}
              />
            </div>
          )}
        </div>

        {/* Mobile: 2-column grid, last item spans full width */}
        <div className="md:hidden grid grid-cols-2 gap-3">
          {types.map((type, i) => (
            <div
              key={i}
              className={
                i === types.length - 1 && types.length % 2 !== 0
                  ? "col-span-2"
                  : ""
              }
            >
              <MosaicTile
                icon={type.icon}
                name={type.name}
                formats={type.formats}
                spec={type.spec}
                tint={MOSAIC_TINTS[i] ?? MOSAIC_TINTS[0]}
                delay={i * 60}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  6. Stats bar with animated numbers                                 */
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
      <span className="text-6xl md:text-8xl font-bold text-[#2d6b0e]/[0.12] dark:text-[#87E64B]/20">
        {count}
        <span className="text-4xl md:text-5xl">{suffix}</span>
      </span>
    </div>
  );
}

function StatsBar({
  titleLine1,
  titleLine2,
  stats,
}: {
  titleLine1: ReactNode;
  titleLine2: ReactNode;
  stats: {
    value: number | null;
    suffix: string;
    label: string;
    sublabel: string;
    textValue?: string;
  }[];
}) {
  return (
    <section className="relative overflow-x-clip bg-gradient-to-b from-[#F5F0E8] via-[#EAF9DE] to-white dark:from-[#141210] dark:via-[#0f1a14] dark:to-background">
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
        {/* Two-line title */}
        <Reveal>
          <div className="mb-20 md:mb-28">
            <p className="text-2xl md:text-4xl text-[#171717]/50 dark:text-white/50 font-light leading-snug">
              {titleLine1}
            </p>
            <h2 className="text-3xl md:text-5xl font-bold text-[#171717] dark:text-white leading-snug mt-1">
              {titleLine2}
            </h2>
          </div>
        </Reveal>

        {/* Number columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-12">
          {stats.map((stat, i) => (
            <Reveal key={i} delay={i * 120}>
              <div className="text-left">
                {/* Big ghostly number */}
                <div className="mb-5">
                  {stat.value !== null ? (
                    <AnimatedNumber target={stat.value} suffix={stat.suffix} />
                  ) : (
                    <span className="text-6xl md:text-8xl font-bold text-[#2d6b0e]/[0.12] dark:text-[#87E64B]/20">
                      {stat.textValue}
                    </span>
                  )}
                </div>
                {/* Description */}
                <p className="text-[#171717] dark:text-white font-bold text-base leading-snug">
                  {stat.label}
                </p>
                <p className="text-[#171717]/70 dark:text-white/70 text-base font-medium mt-1">
                  {stat.sublabel}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  7. FAQ Accordion                                                   */
/* ------------------------------------------------------------------ */
function FAQAccordionItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl bg-[#F5F5F4] dark:bg-card transition-colors duration-300">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-6 md:px-8 py-5 md:py-6 text-left group"
        aria-expanded={open}
      >
        <span className="text-base md:text-lg font-bold text-[#171717] dark:text-white pr-6">
          {question}
        </span>
        <div
          className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center transition-all duration-300 ${
            open ? "rotate-180" : ""
          }`}
        >
          <svg
            className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>
      <div
        className="grid transition-all duration-400 ease-in-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="px-6 md:px-8 pb-6">
            <div className="border-t border-black/[0.06] dark:border-white/[0.06] pt-4">
              <p className="text-sm font-medium md:text-[15px] text-gray-500 dark:text-gray-400 leading-relaxed">
                {answer}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FAQSection({
  title,
  faqs,
}: {
  title: ReactNode;
  faqs: { question: string; answer: string }[];
}) {
  return (
    <section className="max-w-[55rem] mx-auto px-6 py-20 md:py-28">
      <Reveal>
        <h2 className="text-3xl md:text-5xl font-bold text-[#171717] dark:text-white mb-12 text-center">
          {title}
        </h2>
      </Reveal>
      <div className="space-y-3 md:space-y-4">
        {faqs.map((faq, i) => (
          <Reveal key={i} delay={80 + i * 60}>
            <FAQAccordionItem question={faq.question} answer={faq.answer} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  8. CTA — same green card as About page                             */
/* ------------------------------------------------------------------ */

const HIW_SECTIONS = [
  { id: "hiw-hero", label: "Hero" },
  { id: "hiw-steps", label: "Steps" },
  { id: "hiw-perspectives", label: "Perspectives" },
  { id: "hiw-features", label: "Features" },
  { id: "hiw-file-types", label: "File Types" },
  { id: "hiw-stats", label: "Stats" },
  { id: "hiw-faq", label: "FAQ" },
  { id: "hiw-cta", label: "Get Started" },
] as const;

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function HowItWorksClient() {
  const t = useTranslations("pages.howItWorks");

  const highlight = (chunks: ReactNode) => (
    <span className="ze-highlight-green">{chunks}</span>
  );

  /* ── Timeline steps ─── */
  const timelineSteps = [
    {
      title: t("step1Title"),
      content: t("step1Content"),
      imageAlt: "Upload files to ZeFile",
    },
    {
      title: t("step2Title"),
      content: t("step2Content"),
      imageAlt: "Watermarked preview of files",
    },
    {
      title: t("step3Title"),
      content: t("step3Content"),
      imageAlt: "Payment and download flow",
    },
  ];

  /* ── Perspective steps ─── */
  const senderSteps: PerspectiveStep[] = [
    {
      icon: <Upload width={20} height={20} strokeWidth={1.5} />,
      title: t("senderStep1Title"),
      description: t("senderStep1Desc"),
    },
    {
      icon: <Settings width={20} height={20} strokeWidth={1.5} />,
      title: t("senderStep2Title"),
      description: t("senderStep2Desc"),
    },
    {
      icon: <SendDiagonal width={20} height={20} strokeWidth={1.5} />,
      title: t("senderStep3Title"),
      description: t("senderStep3Desc"),
    },
    {
      icon: <StatsReport width={20} height={20} strokeWidth={1.5} />,
      title: t("senderStep4Title"),
      description: t("senderStep4Desc"),
    },
  ];

  const receiverSteps: PerspectiveStep[] = [
    {
      icon: <Mail width={20} height={20} strokeWidth={1.5} />,
      title: t("receiverStep1Title"),
      description: t("receiverStep1Desc"),
    },
    {
      icon: <Eye width={20} height={20} strokeWidth={1.5} />,
      title: t("receiverStep2Title"),
      description: t("receiverStep2Desc"),
    },
    {
      icon: <CreditCard width={20} height={20} strokeWidth={1.5} />,
      title: t("receiverStep3Title"),
      description: t("receiverStep3Desc"),
    },
    {
      icon: <Download width={20} height={20} strokeWidth={1.5} />,
      title: t("receiverStep4Title"),
      description: t("receiverStep4Desc"),
    },
  ];

  /* ── Bento features ─── */
  const bentoFeatures = [
    {
      icon: <Eye width={22} height={22} strokeWidth={1.5} />,
      title: t("bento1Title"),
      description: t("bento1Desc"),
    },
    {
      icon: <Lock width={22} height={22} strokeWidth={1.5} />,
      title: t("bento2Title"),
      description: t("bento2Desc"),
    },
    {
      icon: <CreditCard width={22} height={22} strokeWidth={1.5} />,
      title: t("bento3Title"),
      description: t("bento3Desc"),
    },
    {
      icon: <Clock width={22} height={22} strokeWidth={1.5} />,
      title: t("bento4Title"),
      description: t("bento4Desc"),
    },
    {
      icon: <Mail width={22} height={22} strokeWidth={1.5} />,
      title: t("bento5Title"),
      description: t("bento5Desc"),
    },
    {
      icon: <PageStar width={22} height={22} strokeWidth={1.5} />,
      title: t("bento6Title"),
      description: t("bento6Desc"),
    },
    {
      icon: <Lock width={22} height={22} strokeWidth={1.5} />,
      title: t("bento7Title"),
      description: t("bento7Desc"),
    },
    {
      icon: <RefreshDouble width={22} height={22} strokeWidth={1.5} />,
      title: t("bento8Title"),
      description: t("bento8Desc"),
    },
    {
      icon: <HandCash width={22} height={22} strokeWidth={1.5} />,
      title: t("bento9Title"),
      description: t("bento9Desc"),
    },
  ];

  /* ── File types ─── */
  const fileTypes = [
    {
      icon: <MediaImage width={24} height={24} strokeWidth={1.5} />,
      name: t("fileTypeImages"),
      formats: t("fileTypeFormatsImages"),
      spec: t("fileTypeSpecImages"),
    },
    {
      icon: <VideoCamera width={24} height={24} strokeWidth={1.5} />,
      name: t("fileTypeVideo"),
      formats: t("fileTypeFormatsVideo"),
      spec: t("fileTypeSpecVideo"),
    },
    {
      icon: <SoundHigh width={24} height={24} strokeWidth={1.5} />,
      name: t("fileTypeAudio"),
      formats: t("fileTypeFormatsAudio"),
      spec: t("fileTypeSpecAudio"),
    },
    {
      icon: <Page width={24} height={24} strokeWidth={1.5} />,
      name: t("fileTypeDocs"),
      formats: t("fileTypeFormatsDocs"),
      spec: t("fileTypeSpecDocs"),
    },
    {
      icon: <Archive width={24} height={24} strokeWidth={1.5} />,
      name: t("fileTypeArchives"),
      formats: t("fileTypeFormatsArchives"),
      spec: t("fileTypeSpecArchives"),
    },
  ];

  /* ── Stats ─── */
  const stats = [
    {
      value: 102,
      suffix: t("stat1Suffix"),
      label: t("stat1Label"),
      sublabel: t("stat1Sublabel"),
      textValue: undefined,
    },
    {
      value: 85,
      suffix: t("stat2Suffix"),
      label: t("stat2Label"),
      sublabel: t("stat2Sublabel"),
      textValue: undefined,
    },
    {
      value: 71,
      suffix: t("stat3Suffix"),
      label: t("stat3Label"),
      sublabel: t("stat3Sublabel"),
      textValue: undefined,
    },
  ];

  /* ── FAQs ─── */
  const faqs = [
    { question: t("faq1Q"), answer: t("faq1A") },
    { question: t("faq2Q"), answer: t("faq2A") },
    { question: t("faq3Q"), answer: t("faq3A") },
    { question: t("faq4Q"), answer: t("faq4A") },
    { question: t("faq5Q"), answer: t("faq5A") },
    { question: t("faq6Q"), answer: t("faq6A") },
    { question: t("faq7Q"), answer: t("faq7A") },
    { question: t("faq8Q"), answer: t("faq8A") },
    { question: t("faq9Q"), answer: t("faq9A") },
    { question: t("faq10Q"), answer: t("faq10A") },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-background">
      <Header />

      <SectionIndicator sections={HIW_SECTIONS} />

      <main className="flex-1">
        {/* 1. Hero + decorative crosses */}
        <div id="hiw-hero" className="relative overflow-x-clip">
          <PageHero
            title={t.rich("title", { highlight, br: () => <br /> })}
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

        {/* 2. Step cards — 3 dark cards with hover tilt */}
        <div id="hiw-steps" className="relative overflow-x-clip">
          <BrandCross
            size={80}
            color="#87E64B"
            opacity={0.1}
            rotate={15}
            className="absolute top-[12%] -right-4 hidden md:block animate-[floatShapeSlow_10s_ease-in-out_infinite]"
          />
          <BrandCross
            size={50}
            color="#5E53E0"
            opacity={0.1}
            rotate={-12}
            className="absolute bottom-[15%] left-[4%] hidden lg:block"
          />
          <StepCards
            title={t.rich("timelineTitle", { highlight })}
            steps={timelineSteps}
          />
        </div>

        {/* 3. Dual Perspective + shapes */}
        <div id="hiw-perspectives" className="relative overflow-x-clip">
          <BrandCross
            size={100}
            color="#87E64B"
            opacity={0.1}
            rotate={18}
            className="absolute top-8 right-4 z-10 hidden md:block"
          />
          <BrandCross
            size={60}
            color="#5E53E0"
            opacity={0.08}
            rotate={-15}
            className="absolute bottom-20 left-10 z-10 hidden md:block animate-[floatShapeSlow_10s_ease-in-out_infinite]"
          />
          <SplitPerspective
            title={t.rich("perspectiveTitle", { highlight })}
            subtitle={t("perspectiveSubtitle")}
            senderLabel={t("perspectiveSender")}
            receiverLabel={t("perspectiveReceiver")}
            senderSteps={senderSteps}
            receiverSteps={receiverSteps}
          />
        </div>

        {/* Separator shape */}
        <div className="relative max-w-5xl mx-auto z-10">
          <BrandCross
            size={40}
            color="#87E64B"
            opacity={0.15}
            rotate={22}
            className="absolute -top-6 right-[18%] hidden md:block"
          />
        </div>

        {/* 4. Feature Carousel (beige gradient, auto-scroll) */}
        <div id="hiw-features">
          <FeatureCarousel
            title={t.rich("bentoTitle", { highlight })}
            subtitle={t("bentoSubtitle")}
            features={bentoFeatures}
          />
        </div>

        {/* 5. File Types — mosaic grid */}
        <div id="hiw-file-types">
          <FileTypeStrip
            title={t.rich("fileTypesTitle", { highlight })}
            types={fileTypes}
          />
        </div>

        {/* 6. Stats Bar */}
        <div id="hiw-stats">
          <StatsBar
            titleLine1={t("statsTitleLine1")}
            titleLine2={t.rich("statsTitleLine2", { highlight })}
            stats={stats}
          />
        </div>

        {/* 7. FAQ + shapes */}
        <div id="hiw-faq" className="relative overflow-x-clip">
          <BrandCross
            size={70}
            color="#87E64B"
            opacity={0.08}
            rotate={12}
            className="absolute top-[10%] -right-4 hidden md:block animate-[floatShapeSlow_10s_ease-in-out_infinite]"
          />
          <BrandCross
            size={55}
            color="#5E53E0"
            opacity={0.1}
            rotate={-8}
            className="absolute bottom-[15%] left-[5%] hidden lg:block"
          />
          <FAQSection title={t.rich("faqTitle", { highlight })} faqs={faqs} />
        </div>

        {/* Cross-links */}
        <div className="pt-4">
          <CrossLinks exclude="howItWorks" />
        </div>

        {/* 8. CTA — green card + interior shapes (same as About) */}
        <Reveal>
          <div id="hiw-cta">
            <section className="max-w-6xl mx-auto px-6 pb-20 md:pb-28 pt-4">
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
                  <p className="text-[#171717]/70 font-medium text-base mb-10 max-w-3xl mx-auto">
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
                      href="/pricing"
                      className="text-[#171717] font-bold underline underline-offset-2 hover:opacity-70 transition-opacity"
                    >
                      {t("ctaSecondaryLabel")}
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </Reveal>
      </main>

      <Footer />
    </div>
  );
}
