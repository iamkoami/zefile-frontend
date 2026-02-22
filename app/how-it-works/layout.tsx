import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { BreadcrumbJsonLd, FAQJsonLd } from "@/components/seo/JsonLd";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://zefile.io';

const seoContent = {
  en: {
    title: 'How It Works - Upload, Share, Get Paid | ZeFile',
    description: 'Upload your files, set a price, share a link. Recipients preview watermarked files and pay before downloading. Secure file transfer with payment protection.',
    faqs: [
      { question: 'Is ZeFile free to use?', answer: 'Yes! The free plan lets you send up to 2 GB per transfer. Starter and Pro plans unlock higher limits and lower platform fees.' },
      { question: 'What file types can I send?', answer: 'Pretty much anything -- images, videos, audio, documents, archives. We generate watermarked previews automatically for most file types.' },
      { question: 'How does payment protection work?', answer: 'Recipients can preview your files with watermarks, but originals stay locked. The download only unlocks after payment is confirmed.' },
      { question: 'What payment methods are accepted?', answer: 'Visa, Mastercard, Mobile Money (MTN, Airtel, Orange), and bank transfers. We use Paystack for secure processing.' },
      { question: 'How large can my files be?', answer: 'Up to 2 GB on the free plan, 10 GB on Starter, and 50 GB on Pro. Files are uploaded in chunks so even large transfers are reliable.' },
      { question: 'Do recipients need a ZeFile account?', answer: 'Nope. They just need the link and their email. We verify access with a quick one-time code -- no account needed.' },
      { question: 'What happens when a transfer expires?', answer: 'After the expiry date, the download link stops working. You can set expiry from 1 to 14 days when creating a transfer.' },
      { question: 'Is my data secure?', answer: 'Files are encrypted in transit, stored on secure cloud infrastructure, and served through our CDN. We never access your files.' },
    ],
  },
  fr: {
    title: 'Comment ca marche - Envoyez, partagez, soyez paye | ZeFile',
    description: 'Envoyez vos fichiers, fixez un prix, partagez un lien. Vos destinataires previsualisent les fichiers filigranes et paient avant de telecharger. Transfert securise avec protection de paiement.',
    faqs: [
      { question: 'ZeFile est-il gratuit ?', answer: 'Oui ! Le plan gratuit vous permet d\'envoyer jusqu\'a 2 Go par transfert. Les plans Starter et Pro offrent des limites plus elevees et des frais reduits.' },
      { question: 'Quels types de fichiers puis-je envoyer ?', answer: 'A peu pres tout -- images, videos, audio, documents, archives. Nous generons automatiquement des apercus filigranes pour la plupart des types de fichiers.' },
      { question: 'Comment fonctionne la protection de paiement ?', answer: 'Les destinataires peuvent previsualiser vos fichiers avec des filigranes, mais les originaux restent verrouilles. Le telechargement ne se deverrouille qu\'apres confirmation du paiement.' },
      { question: 'Quels moyens de paiement sont acceptes ?', answer: 'Visa, Mastercard, Mobile Money (MTN, Airtel, Orange) et virements bancaires. Nous utilisons Paystack pour un traitement securise.' },
      { question: 'Quelle taille maximale pour mes fichiers ?', answer: 'Jusqu\'a 2 Go sur le plan gratuit, 10 Go sur Starter et 50 Go sur Pro. Les fichiers sont envoyes par morceaux pour une fiabilite maximale.' },
      { question: 'Les destinataires ont-ils besoin d\'un compte ZeFile ?', answer: 'Non. Ils ont juste besoin du lien et de leur e-mail. Nous verifions l\'acces avec un code unique -- pas de compte necessaire.' },
      { question: 'Que se passe-t-il quand un transfert expire ?', answer: 'Apres la date d\'expiration, le lien de telechargement cesse de fonctionner. Vous pouvez definir l\'expiration de 1 a 14 jours.' },
      { question: 'Mes donnees sont-elles securisees ?', answer: 'Les fichiers sont chiffres en transit, stockes sur une infrastructure cloud securisee et distribues via notre CDN. Nous n\'accedons jamais a vos fichiers.' },
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
