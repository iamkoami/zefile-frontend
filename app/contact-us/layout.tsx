import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { BreadcrumbJsonLd, ContactPageJsonLd, FAQJsonLd } from "@/components/seo/JsonLd";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://zefile.io';

const seoContent = {
  en: {
    title: 'Contact Us - Get in Touch',
    description: 'Have a question or need help? Reach out to the ZeFile team. We\'re here to help with file transfers, payments, partnerships, and more.',
    faqs: [
      { question: 'How do I send large files with ZeFile?', answer: 'Just drag and drop your files, set a price (or send for free), add your recipient\'s email, and hit send. They\'ll get a link to preview and download. No account needed on their end.' },
      { question: 'I haven\'t received my payment yet. What\'s going on?', answer: 'Payments are processed as soon as your recipient completes checkout. If your balance shows the payment but you haven\'t withdrawn yet, head to your account to request a payout. Payouts typically arrive within 1-3 business days.' },
      { question: 'My download link isn\'t working. Help?', answer: 'Links expire after the date set by the sender (1 to 14 days). If yours has expired, ask the sender to create a new transfer. If it\'s still within the window, check your email for the correct link -- sometimes older ones get buried.' },
      { question: 'Can I password-protect my transfers?', answer: 'Yes. When creating a transfer, toggle on password protection and set your password. Recipients will need to enter it before they can preview or download your files.' },
      { question: 'What file types and sizes does ZeFile support?', answer: 'Pretty much anything -- images, videos, audio, documents, archives. The free plan supports up to 2 GB per transfer, Starter goes up to 10 GB, and Pro up to 50 GB.' },
    ],
  },
  fr: {
    title: 'Contactez-nous - ZeFile',
    description: 'Une question ou besoin d\'aide ? Contactez l\'\u00e9quipe ZeFile. Nous sommes l\u00e0 pour vous aider avec vos transferts de fichiers, paiements, partenariats et plus.',
    faqs: [
      { question: 'Comment envoyer des fichiers volumineux avec ZeFile ?', answer: 'Glissez-d\u00e9posez vos fichiers, fixez un prix (ou envoyez gratuitement), ajoutez l\'e-mail du destinataire et c\'est parti. Il recevra un lien pour pr\u00e9visualiser et t\u00e9l\u00e9charger. Aucun compte n\u00e9cessaire de son c\u00f4t\u00e9.' },
      { question: 'Je n\'ai pas encore re\u00e7u mon paiement. Que se passe-t-il ?', answer: 'Les paiements sont trait\u00e9s d\u00e8s que votre destinataire termine le checkout. Si votre solde affiche le paiement mais que vous n\'avez pas encore retir\u00e9, rendez-vous dans votre compte pour demander un virement. Les virements arrivent en g\u00e9n\u00e9ral sous 1 \u00e0 3 jours ouvrables.' },
      { question: 'Mon lien de t\u00e9l\u00e9chargement ne fonctionne plus. \u00c0 l\'aide !', answer: 'Les liens expirent apr\u00e8s la date fix\u00e9e par l\'exp\u00e9diteur (1 \u00e0 14 jours). Si le v\u00f4tre a expir\u00e9, demandez \u00e0 l\'exp\u00e9diteur de cr\u00e9er un nouveau transfert. Si c\'est encore dans le d\u00e9lai, v\u00e9rifiez vos e-mails pour retrouver le bon lien.' },
      { question: 'Puis-je prot\u00e9ger mes transferts par mot de passe ?', answer: 'Oui. Lors de la cr\u00e9ation d\'un transfert, activez la protection par mot de passe et d\u00e9finissez votre mot de passe. Les destinataires devront le saisir avant de pouvoir pr\u00e9visualiser ou t\u00e9l\u00e9charger vos fichiers.' },
      { question: 'Quels types et tailles de fichiers ZeFile prend-il en charge ?', answer: '\u00c0 peu pr\u00e8s tout -- images, vid\u00e9os, audio, documents, archives. Le plan gratuit prend en charge jusqu\'\u00e0 2 Go par transfert, Starter jusqu\'\u00e0 10 Go et Pro jusqu\'\u00e0 50 Go.' },
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
      url: `${SITE_URL}/contact-us`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: content.title,
      description: content.description,
    },
    alternates: {
      canonical: `${SITE_URL}/contact-us`,
    },
  };
}

export default async function ContactLayout({
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
        { name: 'Contact', url: `${SITE_URL}/contact-us` },
      ]} />
      <ContactPageJsonLd />
      <FAQJsonLd faqs={content.faqs} />
      {children}
    </>
  );
}
