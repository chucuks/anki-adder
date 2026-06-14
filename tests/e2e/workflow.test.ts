import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VocabularyUseCase } from '../../src/application/use-cases';
import { WordMeaning, AnkiNote, AppSettings } from '../../src/domain/entities';
import { DefaultAnkiNoteFormatter } from '../../src/infrastructure/adapters/anki/default-anki-note-formatter';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function makeSettings(): AppSettings {
  return {
    theme: 'standard', font: 'outfit', fontSize: 16,
    language: 'tr', showIdioms: true, audioMode: 'native',
    autoSearchEnabled: false, autoSearchDelay: 1000,
    frontSideMode: 'example', autoPosTagging: false, deckTags: {}
  } as AppSettings;
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const WORD_DATA: Record<string, WordMeaning[]> = {
  test: [
    { word: 'test', definition: 'a trial', pos: 'noun', example: 'The test was hard.', type: 'normal' },
    { word: 'test', definition: 'to examine', pos: 'verb', example: 'She will test the water.', type: 'normal' },
  ]
};

// ─── E2E workflow test ────────────────────────────────────────────────────────
describe('Full Workflow E2E (mocked adapters)', () => {
  let useCase: VocabularyUseCase;
  let mockScraper: any;
  let mockAnki: any;
  let mockSettings: any;
  let addedNotes: AnkiNote[];
  let settingsStore: AppSettings;
  let formatter: DefaultAnkiNoteFormatter;

  beforeEach(() => {
    addedNotes = [];
    settingsStore = makeSettings();
    formatter = new DefaultAnkiNoteFormatter();

    mockScraper = {
      getWordData: vi.fn(async (word: string) => {
        if (word in WORD_DATA) return { meanings: WORD_DATA[word], error: null };
        return { meanings: [], error: 'err_not_found' };
      })
    };

    mockAnki = {
      isAvailable:            vi.fn().mockResolvedValue(true),
      checkAndRequestPermission: vi.fn().mockResolvedValue(true),
      getDecks:               vi.fn().mockResolvedValue(['Default', 'English']),
      findNotes:              vi.fn().mockResolvedValue([]),
      findDuplicateNotes:     vi.fn().mockResolvedValue([]),
      addNote: vi.fn(async (note: AnkiNote) => {
        addedNotes.push(note);
        return { success: true, error: null };
      })
    };

    mockSettings = {
      getSettings: vi.fn(async () => ({ ...settingsStore })),
      saveSetting: vi.fn(async (k: keyof AppSettings, v: any) => { (settingsStore as any)[k] = v; }),
      saveSettings: vi.fn(async (updates: Partial<AppSettings>) => { Object.assign(settingsStore, updates); })
    };

    useCase = new VocabularyUseCase(mockScraper, mockAnki, mockSettings, formatter);
  });

  // ─── Search → Add cycle ──────────────────────────────────────────────────
  it('should search a word and return its meanings', async () => {
    const { meanings, error } = await useCase.searchWord('test');

    expect(error).toBeNull();
    expect(meanings).toHaveLength(2);
    expect(mockScraper.getWordData).toHaveBeenCalledWith('test');
  });

  it('should add all found meanings to Anki', async () => {
    const { meanings } = await useCase.searchWord('test');
    const report = await useCase.addMeaningsToAnki(meanings, 'Default');

    expect(report.success).toBe(2);
    expect(report.failed).toBe(0);
    expect(addedNotes).toHaveLength(2);
  });

  it('should construct note front and back correctly via formatter', async () => {
    const { meanings } = await useCase.searchWord('test');
    await useCase.addMeaningsToAnki(meanings, 'Default');

    expect(addedNotes[0].front).toContain('test');
    expect(addedNotes[0].back).toContain('a trial');
  });

  it('should pass audioMode from settings to Anki adapter', async () => {
    const { meanings } = await useCase.searchWord('test');
    await useCase.addMeaningsToAnki([meanings[0]], 'Default');

    expect(mockAnki.addNote).toHaveBeenCalledWith(
      expect.anything(), 'Default', 'native', 'tr'
    );
  });

  // ─── Error paths ─────────────────────────────────────────────────────────
  it('should return err_not_found for an unknown word', async () => {
    const { meanings, error } = await useCase.searchWord('xyzzy');
    expect(error).toBe('err_not_found');
    expect(meanings).toHaveLength(0);
  });

  it('should report 0 added notes for an empty meanings list', async () => {
    const report = await useCase.addMeaningsToAnki([], 'Default');
    expect(report.success).toBe(0);
    expect(addedNotes).toHaveLength(0);
  });

  it('should count failures when Anki addNote fails', async () => {
    mockAnki.addNote = vi.fn().mockResolvedValue({ success: false, error: 'err_add_failed' });
    const { meanings } = await useCase.searchWord('test');
    const report = await useCase.addMeaningsToAnki(meanings, 'Default');
    expect(report.failed).toBe(2);
    expect(report.errors[0]).toBe('err_add_failed');
  });

  it('should skip meanings already in Anki (marked as exists)', async () => {
    mockAnki.findNotes = vi.fn()
      .mockResolvedValueOnce([999])
      .mockResolvedValueOnce([]);

    const { meanings } = await useCase.searchWord('test');
    const report = await useCase.addMeaningsToAnki(meanings, 'Default');

    expect(report.exists).toBe(1);
    expect(report.success).toBe(1);
    expect(addedNotes).toHaveLength(1);
  });

  // ─── Settings ────────────────────────────────────────────────────────────
  it('should return current settings', async () => {
    const s = await useCase.getSettings();
    expect(s.language).toBe('tr');
    expect(s.audioMode).toBe('native');
  });

  it('should persist a setting change', async () => {
    await useCase.saveSetting('theme', 'midnight');
    expect(mockSettings.saveSetting).toHaveBeenCalledWith('theme', 'midnight');
  });

  it('should persist bulk settings changes', async () => {
    await useCase.saveSettings({ theme: 'midnight', language: 'en' });
    expect(mockSettings.saveSettings).toHaveBeenCalledWith({ theme: 'midnight', language: 'en' });
  });

  // ─── Deck listing ─────────────────────────────────────────────────────────
  it('should list available Anki decks', async () => {
    const decks = await useCase.getAvailableDecks();
    expect(decks).toContain('Default');
    expect(decks.length).toBeGreaterThan(0);
  });
});
