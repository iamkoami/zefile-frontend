import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { BreadcrumbJsonLd, FAQJsonLd } from "@/components/seo/JsonLd";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://zefile.io';

const seoContent = {
  en: {
    title: 'How It Works - Upload, Share, Get Paid',
    description: 'Upload your files, set a price, share a link. Recipients preview watermarked files and pay before downloading. Secure file transfer with payment protection.',
    faqs: [
      { question: 'Is ZeFile free to use?', answer: 'Yes! The free plan lets you send up to 2 GB per transfer. Starter and Pro plans unlock higher limits and lower platform fees.' },
      { question: 'What file types can I send?', answer: 'Pretty much anything -- images, videos, audio, documents, archives. We generate watermarked previews automatically for most file types.' },
      { question: 'How does payment protection work?', answer: 'Recipients can preview your files with watermarks, but originals stay locked. The download only unlocks after payment is confirmed.' },
      { question: 'What payment methods are accepted?', answer: 'Visa, Mastercard, Mobile Money (MTN, Airtel, Orange), and bank transfers. All payments are processed securely.' },
      { question: 'How large can my files be?', answer: 'Up to 2 GB on the free plan, 10 GB on Starter, and 50 GB on Pro. Files are uploaded in chunks so even large transfers are reliable.' },
      { question: 'Do recipients need a ZeFile account?', answer: 'Nope. They just need the link and their email. We verify access with a quick one-time code -- no account needed.' },
      { question: 'What happens when a transfer expires?', answer: 'After the expiry date, the download link stops working. You can set expiry from 1 to 14 days when creating a transfer.' },
      { question: 'Is my data secure?', answer: 'Files are encrypted in transit, stored on secure cloud infrastructure, and served through our CDN. We never access your files.' },
    ],
  },
  fr: {
    title: 'Comment \u00e7a marche - Envoyez, partagez, soyez pay\u00e9',
    description: 'Envoyez vos fichiers, fixez un prix, partagez un lien. Vos destinataires pr\u00e9visualisent avec filigrane et paient avant de t\u00e9l\u00e9charger.',
    faqs: [
      { question: 'ZeFile est-il gratuit ?', answer: 'Oui ! Le plan gratuit vous permet d\'envoyer jusqu\'\u00e0 2 Go par transfert. Les plans Starter et Pro offrent des limites plus \u00e9lev\u00e9es et des frais r\u00e9duits.' },
      { question: 'Quels types de fichiers puis-je envoyer ?', answer: '\u00c0 peu pr\u00e8s tout -- images, vid\u00e9os, audio, documents, archives. Nous g\u00e9n\u00e9rons automatiquement des aper\u00e7us filigran\u00e9s pour la plupart des types de fichiers.' },
      { question: 'Comment fonctionne la protection de paiement ?', answer: 'Les destinataires peuvent pr\u00e9visualiser vos fichiers avec des filigranes, mais les originaux restent verrouill\u00e9s. Le t\u00e9l\u00e9chargement ne se d\u00e9verrouille qu\'apr\u00e8s confirmation du paiement.' },
      { question: 'Quels moyens de paiement sont accept\u00e9s ?', answer: 'Visa, Mastercard, Mobile Money (MTN, Airtel, Orange) et virements bancaires. Tous les paiements sont trait\u00e9s de mani\u00e8re s\u00e9curis\u00e9e.' },
      { question: 'Quelle taille maximale pour mes fichiers ?', answer: 'Jusqu\'\u00e0 2 Go sur le plan gratuit, 10 Go sur Starter et 50 Go sur Pro. Les fichiers sont envoy\u00e9s par morceaux pour une fiabilit\u00e9 maximale.' },
      { question: 'Les destinataires ont-ils besoin d\'un compte ZeFile ?', answer: 'Non. Ils ont juste besoin du lien et de leur e-mail. Nous v\u00e9rifions l\'acc\u00e8s avec un code unique -- pas de compte n\u00e9cessaire.' },
      { question: 'Que se passe-t-il quand un transfert expire ?', answer: 'Apr\u00e8s la date d\'expiration, le lien de t\u00e9l\u00e9chargement cesse de fonctionner. Vous pouvez d\u00e9finir l\'expiration de 1 \u00e0 14 jours.' },
      { question: 'Mes donn\u00e9es sont-elles s\u00e9curis\u00e9es ?', answer: 'Les fichiers sont chiffr\u00e9s en transit, stock\u00e9s sur une infrastructure cloud s\u00e9curis\u00e9e et distribu\u00e9s via notre CDN. Nous n\'acc\u00e9dons jamais \u00e0 vos fichiers.' },
    ],
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const content = seoContent[locale as keyof typeof seoContent] || seoContent.en;

  return {
    title: content.title,
    description: content.description,
    openGraph: {
      title: content.title,
      description: content.description,
      url: `${SITE_URL}/how-it-works`,
      type: 'website',
    },
    twitter: {
      title: content.title,
      description: content.description,
    },
    alternates: {
      canonical: `${SITE_URL}/how-it-works`,
      languages: {
        'en': `${SITE_URL}/how-it-works`,
        'fr': `${SITE_URL}/how-it-works`,
        'x-default': `${SITE_URL}/how-it-works`,
      },
    },
  };
}

export default async function HowItWorksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const content = seoContent[locale as keyof typeof seoContent] || seoContent.en;

  return (
    <>
      <BreadcrumbJsonLd items={[
        { name: 'Home', url: SITE_URL },
        { name: 'How It Works', url: `${SITE_URL}/how-it-works` },
      ]} />
      <FAQJsonLd faqs={content.faqs} />
      {children}
    </>
  );
}
