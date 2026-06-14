import { describe, it, expect } from 'vitest';
import { AppSettings, ThemeType, FontType, Language, WordMeaning, AnkiNote } from '@/domain/entities';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const defaultSettings = () => {
  return {
    theme: 'standard',
    font: 'outfit',
    fontSize: 16,
    language: 'en',
    showIdioms: true,
    audioMode: 'none',
    autoSearchEnabled: false,
    autoSearchDelay: 1000,
  } as AppSettings;
};

const makeSettings = (overrides: Partial<AppSettings>) => {
  return {
    ...defaultSettings(),
    ...overrides,
  } as AppSettings;
};

// ─── AppSettings ─────────────────────────────────────────────────────────────
describe('Domain / AppSettings', () => {
  it('should create valid default settings', () => {
    const s = defaultSettings();
    expect(s.theme).toBe('standard');
    expect(s.font).toBe('outfit');
    expect(s.fontSize).toBe(16);
    expect(s.language).toBe('en');
    expect(s.showIdioms).toBe(true);
    expect(s.audioMode).toBe('none');
    expect(s.autoSearchEnabled).toBe(false);
    expect(s.autoSearchDelay).toBe(1000);
  });

  it('should accept all ThemeType values', () => {
    const themes: ThemeType[] = ['standard', 'light', 'midnight', 'solarized', 'dracula', 'forest'];
    themes.forEach(theme => {
      const s: AppSettings = { ...defaultSettings(), theme };
      expect(s.theme).toBe(theme);
    });
  });

  it('should accept all FontType values', () => {
    const fonts: FontType[] = ['outfit', 'inter', 'roboto', 'serif', 'montserrat', 'poppins'];
    fonts.forEach(font => {
      const s: AppSettings = { ...defaultSettings(), font };
      expect(s.font).toBe(font);
    });
  });

  it('should accept all Language values', () => {
    const langs: Language[] = ['en', 'tr', 'es', 'de', 'fr', 'it', 'pt', 'ru', 'zh', 'hi', 'ar'];
    langs.forEach(language => {
      const s: AppSettings = { ...defaultSettings(), language };
      expect(s.language).toBe(language);
    });
  });

  it('should accept audioMode variants', () => {
    const modes: AppSettings['audioMode'][] = ['none', 'native'];
    modes.forEach(audioMode => {
      const s: AppSettings = { ...defaultSettings(), audioMode };
      expect(s.audioMode).toBe(audioMode);
    });
  });

  it('should support optional lastSelectedDeck', () => {
    const s1: AppSettings = { ...defaultSettings() };
    expect(s1.lastSelectedDeck).toBeUndefined();

    const s2: AppSettings = { ...defaultSettings(), lastSelectedDeck: 'English' };
    expect(s2.lastSelectedDeck).toBe('English');
  });
});

// ─── WordMeaning ─────────────────────────────────────────────────────────────
describe('Domain / WordMeaning', () => {
  it('should create a normal meaning', () => {
    const m: WordMeaning = {
      word: 'run',
      definition: 'to move quickly on foot',
      example: 'She runs every day.',
      pos: 'verb',
      type: 'normal',
    };
    expect(m.type).toBe('normal');
    expect(m.idiomText).toBeUndefined();
  });

  it('should create an idiom meaning with idiomText', () => {
    const m: WordMeaning = {
      word: 'run',
      definition: 'to operate a business',
      example: 'She runs the company.',
      pos: 'idiom',
      type: 'idiom',
      idiomText: 'run something',
    };
    expect(m.type).toBe('idiom');
    expect(m.idiomText).toBe('run something');
  });
});

// ─── AnkiNote ────────────────────────────────────────────────────────────────
describe('Domain / AnkiNote', () => {
  it('should create a valid AnkiNote', () => {
    const note: AnkiNote = {
      front: '<strong>She runs every day.</strong>',
      back: '<b>run</b><br><br>to move quickly on foot<br><br><i>(verb)</i>',
      frontPlain: 'She runs every day.',
      backPlain: 'to move quickly on foot',
      tags: ['AnkiAdder', 'verb'],
    };
    expect(note.front).toContain('strong');
    expect(note.tags).toContain('AnkiAdder');
  });
});
