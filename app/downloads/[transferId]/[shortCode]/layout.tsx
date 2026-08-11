import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { toIntlLocale } from "@/lib/locale";
import { CURRENCY_SYMBOLS, type CurrencyCode } from "@/lib/currency";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const SHORT_LINK_DOMAIN = process.env.NEXT_PUBLIC_SHORT_LINK_DOMAIN || "zefile.co";
const SHORT_CODE_PREFIX = process.env.NEXT_PUBLIC_SHORT_CODE_PREFIX || "z-";

interface TransferMeta {
  title: string;
  message?: string;
  price: number;
  currency: string;
  isPublicSales?: boolean;
  coverUrl?: string;
  files?: Array<{ thumbnailUrl?: string }>;
}

async function fetchTransferMeta(shortCode: string): Promise<TransferMeta | null> {
  try {
    const response = await fetch(`${API_URL}/transfers/code/${shortCode}`, {
      next: { revalidate: 3600 },
    });
    if (response.ok) {
      return await response.json();
    }
  } catch {
    // Graceful fallback
  }
  return null;
}

// `transfer.price` is MINOR units (story 144.7). This rendered it raw, so the share-card
// description advertised 100x the real price to every social preview and search crawler.
// The FORMATTING is deliberately local — `@/lib/currency`'s formatters are for client components.
// But the two things that must not fork are shared: the locale mapping from `@/lib/locale`, and
// the currency symbol from `CURRENCY_SYMBOLS`. That import is safe here despite the older warning
// on this comment: `lib/currency` has no top-level side effects, its exchange-rate fetch only runs
// when a function is called, and nothing on this path calls one.
//
// Story 144.15 — this used to pin `"fr-FR"` for XOF and fall back to a bare `toLocaleString()`
// for everything else, so an English reader saw French grouping on a CFA price while a French
// reader saw whatever their crawler's runtime happened to default to. `generateMetadata` already
// resolves the locale below; it simply was not passed down.
function formatPrice(
  priceMinorUnits: number,
  currency: string,
  locale: string,
): string {
  if (!priceMinorUnits || priceMinorUnits <= 0) return "";
  const price = priceMinorUnits / 100;
  const formatted = price.toLocaleString(toIntlLocale(locale));
  // Story 144.15 — was `Fr CFA` hardcoded for XOF, the last place in the app still using that
  // second label. The share card a buyer sees in WhatsApp now names the currency the same way the
  // checkout screen does.
  const symbol = CURRENCY_SYMBOLS[currency as CurrencyCode] || currency;
  return `${formatted} ${symbol}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ transferId: string; shortCode: string }>;
}): Promise<Metadata> {
  const { shortCode } = await params;
  const locale = await getLocale();

  const transfer = await fetchTransferMeta(shortCode);
  if (!transfer) {
    return {
      title: locale === "fr" ? "Transfert - ZeFile" : "Transfer - ZeFile",
    };
  }

  const title = transfer.title || "ZeFile";

  // Build description based on transfer type
  let description: string;
  if (transfer.isPublicSales && transfer.price > 0) {
    const priceStr = formatPrice(transfer.price, transfer.currency, locale);
    description =
      locale === "fr"
        ? `Disponible sur ZeFile${priceStr ? ` — ${priceStr}` : ""}`
        : `Available on ZeFile${priceStr ? ` — ${priceStr}` : ""}`;
  } else {
    description =
      locale === "fr"
        ? "Fichiers partages via ZeFile"
        : "Files shared via ZeFile";
  }

  // Use cover image or first file thumbnail
  const imageUrl =
    transfer.coverUrl ||
    transfer.files?.find((f) => f.thumbnailUrl)?.thumbnailUrl ||
    null;

  const shortUrl = `https://${SHORT_LINK_DOMAIN}/${SHORT_CODE_PREFIX}${shortCode}`;

  return {
    title: `${title} - ZeFile`,
    description,
    openGraph: {
      title,
      description,
      url: shortUrl,
      siteName: "ZeFile",
      type: "website",
      ...(imageUrl && {
        images: [{ url: imageUrl, alt: title }],
      }),
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title,
      description,
      ...(imageUrl && { images: [imageUrl] }),
    },
  };
}

export default function TransferDownloadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
