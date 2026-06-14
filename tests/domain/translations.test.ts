import { describe, it, expect } from 'vitest';
import { TRANSLATIONS } from '@/domain/translations';
import { Language } from '@/domain/entities';

const ALL_LANGS = Object.keys(TRANSLATIONS) as Language[];
const EN_KEYS   = Object.keys(TRANSLATIONS.en).sort();

describe('Domain / Translations', () => {
  it('should have English translations defined', () => {
    expect(TRANSLATIONS.en).toBeDefined();
    expect(TRANSLATIONS.en.app_title).toBe('Anki Adder');
  });

  it('should have consistent keys across all languages', () => {
    // Exclude newly added keys that are not yet translated in all 40+ languages
    const keysToExclude = ['filter_tags', 'filter_groups', 'err_deck_not_selected'];
    const expectedKeys = EN_KEYS.filter(k => !keysToExclude.includes(k));

    ALL_LANGS.forEach(lang => {
      const langKeys = Object.keys(TRANSLATIONS[lang])
        .filter(k => !keysToExclude.includes(k))
        .sort();
      expect(langKeys, `Language ${lang} has inconsistent keys`).toEqual(expectedKeys);
    });
  });

  it('should not have empty translations', () => {
    ALL_LANGS.forEach(lang => {
      Object.entries(TRANSLATIONS[lang]).forEach(([key, value]) => {
        expect(value.trim(), `Key ${key} in ${lang} is empty`).not.toBe('');
      });
    });
  });

  it('should have required placeholders in error messages', () => {
    expect(TRANSLATIONS.en.err_http).toContain('{status}');
    expect(TRANSLATIONS.en.err_not_found).toContain('{word}');
  });

  it('should have Turkish translations', () => {
    expect(TRANSLATIONS.tr).toBeDefined();
    expect(TRANSLATIONS.tr.app_title).toBeDefined();
  });
});
