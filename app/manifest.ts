import type { MetadataRoute } from 'next';
import { cookies } from 'next/headers';

export const runtime = 'edge';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'en';

  const content = {
    en: {
      name: 'ZeFile - Secure File Transfer',
      description: 'Send large files securely with payment protection. ZeFile ensures your deliverables are paid for before download.',
    },
    fr: {
      name: 'ZeFile - Transfert de fichiers securise',
      description: 'Envoyez de gros fichiers en toute securite avec protection du paiement. ZeFile garantit que vos livrables sont payes avant le telechargement.',
    },
  };

  const t = content[locale as keyof typeof content] || content.en;

  return {
    name: t.name,
    short_name: 'ZeFile',
    description: t.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#5E53E0',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/favicon.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/favicon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    categories: ['productivity', 'business', 'utilities'],
    lang: locale,
    dir: 'ltr',
  };
}
