import { getRequestConfig } from 'next-intl/server';
import { headers, cookies } from 'next/headers';

export default getRequestConfig(async () => {
  const supportedLocales = ['en', 'fr'];
  let locale = 'en'; // Default to English

  // 1. Check for cookie preference first (highest priority)
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('NEXT_LOCALE');

  if (localeCookie && supportedLocales.includes(localeCookie.value)) {
    locale = localeCookie.value;
  } else {
    // 2. Fall back to browser's accept-language header
    const headersList = await headers();
    const acceptLanguage = headersList.get('accept-language');

    if (acceptLanguage) {
      // Parse accept-language header (e.g., "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7")
      const languages = acceptLanguage.split(',').map((lang) => {
        const [code, priority] = lang.trim().split(';');
        return {
          code: code.split('-')[0], // Get just the language part (fr from fr-FR)
          priority: priority ? parseFloat(priority.split('=')[1]) : 1.0,
        };
      });

      // Sort by priority (highest first)
      languages.sort((a, b) => b.priority - a.priority);

      // Find first supported language
      const preferredLocale = languages.find((lang) =>
        supportedLocales.includes(lang.code)
      );

      if (preferredLocale) {
        locale = preferredLocale.code;
      }
    }
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
