/**
 * Device fingerprint collection using FingerprintJS Open Source.
 * Lazy-loaded via dynamic import to avoid increasing initial bundle size.
 * Cached per page session -- computed once, reused for all subsequent requests.
 */

let cachedFingerprint: DeviceFingerprintPayload | null = null;
let fingerprintPromise: Promise<DeviceFingerprintPayload | null> | null = null;

export interface DeviceFingerprintPayload {
  visitorId: string;
  componentsHash: string;
  platform: string;
  screenResolution: string;
}

// NOTE: Hash output changes if FingerprintJS adds/removes/reorders component fields
// across library versions, which may create new fingerprint records for the same device.
async function hashComponents(components: Record<string, unknown>): Promise<string> {
  const data = JSON.stringify(components);
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function getDeviceFingerprint(): Promise<DeviceFingerprintPayload | null> {
  if (cachedFingerprint) return cachedFingerprint;

  // Deduplicate concurrent calls
  if (fingerprintPromise) return fingerprintPromise;

  fingerprintPromise = (async () => {
    try {
      const FingerprintJS = await import('@fingerprintjs/fingerprintjs');
      const fp = await FingerprintJS.load();
      const result = await fp.get();

      const payload: DeviceFingerprintPayload = {
        visitorId: result.visitorId,
        componentsHash: await hashComponents(result.components),
        platform: (navigator as any).userAgentData?.platform || navigator.platform || 'unknown',
        screenResolution: `${screen.width}x${screen.height}`,
      };

      cachedFingerprint = payload;
      return payload;
    } catch (err) {
      console.warn('Device fingerprint collection failed:', err);
      fingerprintPromise = null; // Allow retry on next call
      return null;
    }
  })();

  return fingerprintPromise;
}
