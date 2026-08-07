import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

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
// Not `@/lib/currency` — this is a server-side metadata function and the helper there pulls in
// the client-side exchange-rate module.
function formatPrice(priceMinorUnits: number, currency: string): string {
  if (!priceMinorUnits || priceMinorUnits <= 0) return "";
  const price = priceMinorUnits / 100;
  if (currency === "XOF") return `${price.toLocaleString("fr-FR")} Fr CFA`;
  return `${price.toLocaleString()} ${currency}`;
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
    const priceStr = formatPrice(transfer.price, transfer.currency);
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
