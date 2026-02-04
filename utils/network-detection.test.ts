/**
 * Tests for Network Detection Utility
 *
 * @see Story 18.1: Network Detection Utility
 */

import {
  detectNetworkFromReferrer,
  detectNetworkFromUserAgent,
  getNetworkDisplayName,
  NetworkType,
} from './network-detection';

describe('Network Detection Utility', () => {
  describe('detectNetworkFromReferrer', () => {
    describe('Facebook detection', () => {
      it('detects facebook.com', () => {
        expect(detectNetworkFromReferrer('https://www.facebook.com/')).toBe('facebook');
      });

      it('detects m.facebook.com (mobile)', () => {
        expect(detectNetworkFromReferrer('https://m.facebook.com/')).toBe('facebook');
      });

      it('detects l.facebook.com (link shim)', () => {
        expect(detectNetworkFromReferrer('https://l.facebook.com/l.php?u=https://example.com')).toBe('facebook');
      });

      it('detects fb.com', () => {
        expect(detectNetworkFromReferrer('https://fb.com/story')).toBe('facebook');
      });
    });

    describe('Twitter/X detection', () => {
      it('detects twitter.com', () => {
        expect(detectNetworkFromReferrer('https://twitter.com/user/status/123')).toBe('twitter');
      });

      it('detects x.com', () => {
        expect(detectNetworkFromReferrer('https://x.com/user/status/123')).toBe('twitter');
      });

      it('detects t.co (short links)', () => {
        expect(detectNetworkFromReferrer('https://t.co/abc123')).toBe('twitter');
      });

      it('detects mobile.twitter.com', () => {
        expect(detectNetworkFromReferrer('https://mobile.twitter.com/')).toBe('twitter');
      });
    });

    describe('WhatsApp detection', () => {
      it('detects whatsapp.com', () => {
        expect(detectNetworkFromReferrer('https://whatsapp.com/')).toBe('whatsapp');
      });

      it('detects wa.me', () => {
        expect(detectNetworkFromReferrer('https://wa.me/1234567890')).toBe('whatsapp');
      });

      it('detects web.whatsapp.com', () => {
        expect(detectNetworkFromReferrer('https://web.whatsapp.com/')).toBe('whatsapp');
      });

      it('detects api.whatsapp.com', () => {
        expect(detectNetworkFromReferrer('https://api.whatsapp.com/send')).toBe('whatsapp');
      });
    });

    describe('LinkedIn detection', () => {
      it('detects linkedin.com', () => {
        expect(detectNetworkFromReferrer('https://www.linkedin.com/feed/')).toBe('linkedin');
      });

      it('detects lnkd.in (short links)', () => {
        expect(detectNetworkFromReferrer('https://lnkd.in/abc123')).toBe('linkedin');
      });
    });

    describe('Instagram detection', () => {
      it('detects instagram.com', () => {
        expect(detectNetworkFromReferrer('https://www.instagram.com/p/abc123')).toBe('instagram');
      });

      it('detects l.instagram.com (link shim)', () => {
        expect(detectNetworkFromReferrer('https://l.instagram.com/?u=https://example.com')).toBe('instagram');
      });
    });

    describe('Telegram detection', () => {
      it('detects t.me', () => {
        expect(detectNetworkFromReferrer('https://t.me/channel')).toBe('telegram');
      });

      it('detects telegram.org', () => {
        expect(detectNetworkFromReferrer('https://telegram.org/')).toBe('telegram');
      });
    });

    describe('Email client detection', () => {
      it('detects mail.google.com (Gmail)', () => {
        expect(detectNetworkFromReferrer('https://mail.google.com/mail/u/0/')).toBe('email');
      });

      it('detects outlook.com', () => {
        expect(detectNetworkFromReferrer('https://outlook.com/')).toBe('email');
      });

      it('detects outlook.live.com', () => {
        expect(detectNetworkFromReferrer('https://outlook.live.com/mail/')).toBe('email');
      });

      it('detects outlook.office.com', () => {
        expect(detectNetworkFromReferrer('https://outlook.office.com/')).toBe('email');
      });

      it('detects mail.yahoo.com', () => {
        expect(detectNetworkFromReferrer('https://mail.yahoo.com/')).toBe('email');
      });

      it('detects protonmail.com', () => {
        expect(detectNetworkFromReferrer('https://protonmail.com/')).toBe('email');
      });
    });

    describe('Edge cases', () => {
      it('returns null for empty referrer', () => {
        expect(detectNetworkFromReferrer('')).toBe(null);
      });

      it('returns null for unknown referrer', () => {
        expect(detectNetworkFromReferrer('https://example.com/')).toBe(null);
      });

      it('returns null for null/undefined referrer', () => {
        expect(detectNetworkFromReferrer(null as unknown as string)).toBe(null);
        expect(detectNetworkFromReferrer(undefined as unknown as string)).toBe(null);
      });

      it('handles case-insensitive matching', () => {
        expect(detectNetworkFromReferrer('https://FACEBOOK.COM/')).toBe('facebook');
        expect(detectNetworkFromReferrer('https://Twitter.Com/')).toBe('twitter');
      });
    });
  });

  describe('detectNetworkFromUserAgent', () => {
    describe('Facebook in-app browser detection', () => {
      it('detects FBAN in user-agent', () => {
        const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/292.0.0.0.0]';
        expect(detectNetworkFromUserAgent(ua)).toBe('facebook');
      });

      it('detects FBAV in user-agent', () => {
        const ua = 'Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 FBAV/292.0.0.0.0';
        expect(detectNetworkFromUserAgent(ua)).toBe('facebook');
      });

      it('detects FB_IAB in user-agent', () => {
        const ua = 'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 FB_IAB/FB4A';
        expect(detectNetworkFromUserAgent(ua)).toBe('facebook');
      });
    });

    describe('Instagram in-app browser detection', () => {
      it('detects Instagram in user-agent', () => {
        const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 Instagram 170.0.0.0.0';
        expect(detectNetworkFromUserAgent(ua)).toBe('instagram');
      });
    });

    describe('Twitter in-app browser detection', () => {
      it('detects Twitter in user-agent', () => {
        const ua = 'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Twitter for iPhone';
        expect(detectNetworkFromUserAgent(ua)).toBe('twitter');
      });
    });

    describe('LinkedIn in-app browser detection', () => {
      it('detects LinkedInApp in user-agent', () => {
        const ua = 'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 LinkedInApp';
        expect(detectNetworkFromUserAgent(ua)).toBe('linkedin');
      });
    });

    describe('Regular browsers', () => {
      it('returns null for Chrome on macOS', () => {
        const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        expect(detectNetworkFromUserAgent(ua)).toBe(null);
      });

      it('returns null for Safari on iOS', () => {
        const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
        expect(detectNetworkFromUserAgent(ua)).toBe(null);
      });

      it('returns null for Firefox', () => {
        const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0';
        expect(detectNetworkFromUserAgent(ua)).toBe(null);
      });
    });

    describe('Edge cases', () => {
      it('returns null for empty user-agent', () => {
        expect(detectNetworkFromUserAgent('')).toBe(null);
      });

      it('returns null for null/undefined user-agent', () => {
        expect(detectNetworkFromUserAgent(null as unknown as string)).toBe(null);
        expect(detectNetworkFromUserAgent(undefined as unknown as string)).toBe(null);
      });
    });
  });

  describe('getNetworkDisplayName', () => {
    it('returns correct display names', () => {
      expect(getNetworkDisplayName('direct')).toBe('Direct Link');
      expect(getNetworkDisplayName('whatsapp')).toBe('WhatsApp');
      expect(getNetworkDisplayName('facebook')).toBe('Facebook');
      expect(getNetworkDisplayName('twitter')).toBe('Twitter/X');
      expect(getNetworkDisplayName('linkedin')).toBe('LinkedIn');
      expect(getNetworkDisplayName('instagram')).toBe('Instagram');
      expect(getNetworkDisplayName('telegram')).toBe('Telegram');
      expect(getNetworkDisplayName('email')).toBe('Email');
      expect(getNetworkDisplayName('other')).toBe('Other');
    });
  });
});
