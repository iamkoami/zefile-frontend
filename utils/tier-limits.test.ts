/**
 * Tests for Tier Limits Utility
 *
 * @see Story 26.1: Create Tier Limits Utility
 */

import {
  SubscriptionTier,
  TIER_LIMITS,
  ALL_VALIDITY_OPTIONS,
  DEFAULT_VALIDITY_DAYS,
  TIER_TRANSLATION_KEYS,
  isValidityAvailable,
  getRequiredTier,
  getTierTranslationKey,
  getMaxUploadSizeBytes,
} from './tier-limits';

describe('Tier Limits Utility', () => {
  describe('TIER_LIMITS constant', () => {
    it('defines free tier with 1, 3, 7 day validity', () => {
      expect(TIER_LIMITS.free.validityDays).toEqual([1, 3, 7]);
    });

    it('defines starter tier with 1, 3, 7, 14, 30 day validity', () => {
      expect(TIER_LIMITS.starter.validityDays).toEqual([1, 3, 7, 14, 30]);
    });

    it('defines pro tier with all validity options up to 90 days', () => {
      expect(TIER_LIMITS.pro.validityDays).toEqual([1, 3, 7, 14, 30, 60, 90]);
    });

    it('defines correct upload size limits per tier', () => {
      expect(TIER_LIMITS.free.maxUploadSizeMB).toBe(2000);
      expect(TIER_LIMITS.starter.maxUploadSizeMB).toBe(5000);
      expect(TIER_LIMITS.pro.maxUploadSizeMB).toBe(50000);
    });
  });

  describe('ALL_VALIDITY_OPTIONS constant', () => {
    it('has 7 validity options', () => {
      expect(ALL_VALIDITY_OPTIONS).toHaveLength(7);
    });

    it('contains all expected values', () => {
      const values = ALL_VALIDITY_OPTIONS.map((opt) => opt.value);
      expect(values).toEqual(['1', '3', '7', '14', '30', '60', '90']);
    });

    it('has translation keys for each option', () => {
      ALL_VALIDITY_OPTIONS.forEach((opt) => {
        expect(opt.labelKey).toMatch(/^validity\.days?\d+$/);
      });
    });
  });

  describe('DEFAULT_VALIDITY_DAYS constant', () => {
    it('sets free tier default to 1 day', () => {
      expect(DEFAULT_VALIDITY_DAYS.free).toBe(1);
    });

    it('sets starter tier default to 7 days', () => {
      expect(DEFAULT_VALIDITY_DAYS.starter).toBe(7);
    });

    it('sets pro tier default to 14 days', () => {
      expect(DEFAULT_VALIDITY_DAYS.pro).toBe(14);
    });

    it('defaults are available in their respective tiers', () => {
      const tiers: SubscriptionTier[] = ['free', 'starter', 'pro'];
      tiers.forEach((tier) => {
        const defaultDays = DEFAULT_VALIDITY_DAYS[tier];
        expect(isValidityAvailable(defaultDays, tier)).toBe(true);
      });
    });
  });

  describe('isValidityAvailable()', () => {
    describe('free tier', () => {
      it('returns true for 1, 3, 7 days', () => {
        expect(isValidityAvailable(1, 'free')).toBe(true);
        expect(isValidityAvailable(3, 'free')).toBe(true);
        expect(isValidityAvailable(7, 'free')).toBe(true);
      });

      it('returns false for 14, 30, 60, 90 days', () => {
        expect(isValidityAvailable(14, 'free')).toBe(false);
        expect(isValidityAvailable(30, 'free')).toBe(false);
        expect(isValidityAvailable(60, 'free')).toBe(false);
        expect(isValidityAvailable(90, 'free')).toBe(false);
      });
    });

    describe('starter tier', () => {
      it('returns true for 1, 3, 7, 14, 30 days', () => {
        expect(isValidityAvailable(1, 'starter')).toBe(true);
        expect(isValidityAvailable(14, 'starter')).toBe(true);
        expect(isValidityAvailable(30, 'starter')).toBe(true);
      });

      it('returns false for 60, 90 days', () => {
        expect(isValidityAvailable(60, 'starter')).toBe(false);
        expect(isValidityAvailable(90, 'starter')).toBe(false);
      });
    });

    describe('pro tier', () => {
      it('returns true for all valid days including 60, 90', () => {
        expect(isValidityAvailable(60, 'pro')).toBe(true);
        expect(isValidityAvailable(90, 'pro')).toBe(true);
      });
    });

    it('returns false for invalid day values', () => {
      expect(isValidityAvailable(0, 'pro')).toBe(false);
      expect(isValidityAvailable(5, 'pro')).toBe(false);
      expect(isValidityAvailable(100, 'pro')).toBe(false);
    });
  });

  describe('getRequiredTier()', () => {
    it('returns free for 1, 3, 7 days', () => {
      expect(getRequiredTier(1)).toBe('free');
      expect(getRequiredTier(3)).toBe('free');
      expect(getRequiredTier(7)).toBe('free');
    });

    it('returns starter for 14, 30 days', () => {
      expect(getRequiredTier(14)).toBe('starter');
      expect(getRequiredTier(30)).toBe('starter');
    });

    it('returns pro for 60, 90 days', () => {
      expect(getRequiredTier(60)).toBe('pro');
      expect(getRequiredTier(90)).toBe('pro');
    });

    it('returns null for invalid day values', () => {
      expect(getRequiredTier(0)).toBeNull();
      expect(getRequiredTier(5)).toBeNull();
      expect(getRequiredTier(100)).toBeNull();
      expect(getRequiredTier(-1)).toBeNull();
    });
  });

  describe('getTierTranslationKey()', () => {
    it('returns freeTier for free', () => {
      expect(getTierTranslationKey('free')).toBe('freeTier');
    });

    it('returns starterTier for starter', () => {
      expect(getTierTranslationKey('starter')).toBe('starterTier');
    });

    it('returns proTier for pro', () => {
      expect(getTierTranslationKey('pro')).toBe('proTier');
    });
  });

  describe('getMaxUploadSizeBytes()', () => {
    it('returns 2GB for free tier', () => {
      expect(getMaxUploadSizeBytes('free')).toBe(2000 * 1024 * 1024);
    });

    it('returns 5GB for starter tier', () => {
      expect(getMaxUploadSizeBytes('starter')).toBe(5000 * 1024 * 1024);
    });

    it('returns 50GB for pro tier', () => {
      expect(getMaxUploadSizeBytes('pro')).toBe(50000 * 1024 * 1024);
    });
  });

  describe('TIER_TRANSLATION_KEYS constant', () => {
    it('maps each tier to its translation key', () => {
      expect(TIER_TRANSLATION_KEYS.free).toBe('freeTier');
      expect(TIER_TRANSLATION_KEYS.starter).toBe('starterTier');
      expect(TIER_TRANSLATION_KEYS.pro).toBe('proTier');
    });
  });
});
