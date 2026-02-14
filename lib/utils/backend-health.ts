/**
 * Backend Health Check Utility
 * Provides functions to check if the backend is reachable
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Check if backend is reachable
 * @returns Promise<boolean> - true if backend is healthy
 */
export async function isBackendHealthy(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    const response = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Wait for backend to become available
 * @param maxAttempts Maximum number of retry attempts
 * @param delayMs Delay between attempts in milliseconds
 * @returns Promise<boolean> - true if backend becomes available
 */
export async function waitForBackend(
  maxAttempts: number = 10,
  delayMs: number = 2000
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    if (await isBackendHealthy()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return false;
}

/**
 * Get user-friendly error message for backend connection issues
 */
export function getBackendErrorMessage(locale: string = 'en'): string {
  const messages: Record<string, string> = {
    en: 'Unable to connect to the server. Please check your internet connection and try again.',
    fr: 'Impossible de se connecter au serveur. Veuillez vérifier votre connexion internet et réessayer.',
  };
  return messages[locale] || messages.en;
}
