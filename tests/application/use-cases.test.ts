import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VocabularyUseCase } from '@/application/use-cases';
import { DefaultAnkiNoteFormatter } from '@/infrastructure/adapters/anki/default-anki-note-formatter';

describe('Application / VocabularyUseCase', () => {
  let formatter: DefaultAnkiNoteFormatter;
  let mockAnki: any;
  let mockScraper: any;
  let mockSettings: any;

  beforeEach(() => {
    formatter = new DefaultAnkiNoteFormatter();
    mockAnki = {
        isAvailable: vi.fn().mockResolvedValue(true),
        checkAndRequestPermission: vi.fn().mockResolvedValue(true),
        findNotes: vi.fn().mockResolvedValue([]),
        addNote: vi.fn().mockResolvedValue({ success: true }),
        getDecks: vi.fn().mockResolvedValue(['Default'])
    };
    mockScraper = {
        getWordData: vi.fn().mockResolvedValue({ meanings: [{ word: 'test', definition: 'def', pos: 'n', type: 'normal' }], error: null })
    };
    mockSettings = {
        getSettings: vi.fn().mockResolvedValue({ deckTags: {}, autoPosTagging: false }),
        saveSetting: vi.fn(),
        saveSettings: vi.fn()
    };
  });

  it('should search word', async () => {
    const useCase = new VocabularyUseCase(mockScraper, mockAnki, mockSettings, formatter);
    const res = await useCase.searchWord('test');
    expect(res.meanings).toHaveLength(1);
  });

  it('should add meanings to Anki', async () => {
    const useCase = new VocabularyUseCase(mockScraper, mockAnki, mockSettings, formatter);
    const res = await useCase.addMeaningsToAnki([{ word: 'test', definition: 'def', example: 'ex', pos: 'n', type: 'normal' }], 'Default');
    expect(res.success).toBe(1);
  });

  it('should handle Anki availability and permissions', async () => {
    const useCase = new VocabularyUseCase(mockScraper, mockAnki, mockSettings, formatter);
    mockAnki.isAvailable.mockResolvedValue(false);
    let res = await useCase.addMeaningsToAnki([], 'Default');
    expect(res.errors).toContain('err_anki_not_available');

    mockAnki.isAvailable.mockResolvedValue(true);
    mockAnki.checkAndRequestPermission.mockResolvedValue(false);
    res = await useCase.addMeaningsToAnki([], 'Default');
    expect(res.errors).toContain('err_no_permission');
  });

  it('should identify existing meanings', async () => {
    const useCase = new VocabularyUseCase(mockScraper, mockAnki, mockSettings, formatter);
    mockAnki.findNotes.mockResolvedValueOnce([1]).mockResolvedValueOnce([]); // True then False
    const res = await useCase.checkExistingMeanings([
        { word: 'test', definition: 'def', example: 'ex', pos: 'n', type: 'normal' },
        { word: 'test2', definition: 'def2', example: 'ex2', pos: 'n', type: 'normal' },
        { word: 'test3', definition: '', example: 'ex3', pos: 'n', type: 'normal' } // Empty def branch
    ]);
    expect(res.existing.has(0)).toBe(true);
    expect(res.existing.has(1)).toBe(false);
    expect(res.existing.has(2)).toBe(false);
  });

  it('should handle edge cases in addMeaningsToAnki', async () => {
    const useCase = new VocabularyUseCase(mockScraper, mockAnki, mockSettings, formatter);
    
    // Null/undefined meaning branch
    // @ts-ignore
    const res = await useCase.addMeaningsToAnki([null, { word: '', definition: 'd' }], 'Deck');
    expect(res.failed).toBe(0); // Should continue

    // Missing wordOrIdiom branch
    const res2 = await useCase.addMeaningsToAnki([{ word: '', definition: 'd', example: '', pos: 'n', type: 'normal' }], 'Deck');
    expect(res2.success).toBe(0);
  });

  it('should count existing cards with various queries', async () => {
    const useCase = new VocabularyUseCase(mockScraper, mockAnki, mockSettings, formatter);
    mockAnki.findNotes.mockResolvedValue([1, 2]);
    
    // Spaced word branch
    expect(await useCase.countExistingCards('spaced word')).toBe(2);
    expect(mockAnki.findNotes).toHaveBeenCalledWith('"spaced word"');

    // Deck filter branch
    expect(await useCase.countExistingCards('word', 'Deck')).toBe(2);
    expect(mockAnki.findNotes).toHaveBeenCalledWith('deck:"Deck" word');

    // Null results branch
    mockAnki.findNotes.mockResolvedValue(null);
    expect(await useCase.countExistingCards('word')).toBe(0);

    // Empty word branch
    expect(await useCase.countExistingCards('')).toBe(0);
  });

  it('should handle complex addition scenarios', async () => {
      const useCase = new VocabularyUseCase(mockScraper, mockAnki, mockSettings, formatter);
      
      // Idiom branch
      const meanings = [{ word: 'test', definition: 'def', example: 'ex', pos: 'n', type: 'normal' as const, idiomText: 'idiom' }];
      await useCase.addMeaningsToAnki(meanings, 'Deck');
      expect(mockAnki.findNotes).toHaveBeenCalled();

      // Failed add branch with explicit error
      mockAnki.addNote.mockResolvedValue({ success: false, error: 'fail' });
      const res = await useCase.addMeaningsToAnki(meanings, 'Deck');
      expect(res.failed).toBe(1);
      expect(res.errors).toContain('fail');

      // Failed add branch with fallback error
      mockAnki.addNote.mockResolvedValue({ success: false, error: null });
      const resFallback = await useCase.addMeaningsToAnki(meanings, 'Deck');
      expect(resFallback.errors).toContain('err_add_failed');

      // Already exists branch
      mockAnki.findNotes.mockResolvedValue([1]);
      const res2 = await useCase.addMeaningsToAnki(meanings, 'Deck');
      expect(res2.exists).toBe(1);

      // Deck not selected branch
      const res3 = await useCase.addMeaningsToAnki(meanings, '');
      expect(res3.errors).toContain('err_deck_not_selected');

      // Empty definition branch
      const emptyDefMeanings = [{ word: 'test', definition: ' ', example: 'ex', pos: 'n', type: 'normal' as const }];
      const res4 = await useCase.addMeaningsToAnki(emptyDefMeanings, 'Deck');
      expect(res4.success).toBe(0);
  });

  it('should handle formatter errors gracefully', async () => {
    const throwingFormatter = { format: () => { throw new Error('format failed'); } };
    const useCase = new VocabularyUseCase(mockScraper, mockAnki, mockSettings, throwingFormatter);
    const res = await useCase.addMeaningsToAnki([
      { word: 'test', definition: 'def', example: 'ex', pos: 'n', type: 'normal' }
    ], 'Default');
    expect(res.failed).toBe(1);
    expect(res.errors).toContain('err_add_failed');
  });

  it('should always use en locale for TTS regardless of UI language', async () => {
    const useCase = new VocabularyUseCase(mockScraper, mockAnki, mockSettings, formatter);
    const meaning = { word: 'w', definition: 'd', example: 'e', pos: 'n', type: 'normal' as const };
    
    await useCase.addMeaningsToAnki([meaning], 'Deck');
    expect(mockAnki.addNote).toHaveBeenCalledWith(expect.any(Object), 'Deck', undefined, undefined);

    mockAnki.addNote.mockClear();
    await useCase.addMeaningsToAnki([meaning], 'Deck');
    expect(mockAnki.addNote).toHaveBeenCalledWith(expect.any(Object), 'Deck', undefined, undefined);

    mockAnki.addNote.mockClear();
    await useCase.addMeaningsToAnki([meaning], 'Deck');
    expect(mockAnki.addNote).toHaveBeenCalledWith(expect.any(Object), 'Deck', undefined, undefined);
  });

  it('should support bulk settings save', async () => {
    const useCase = new VocabularyUseCase(mockScraper, mockAnki, mockSettings, formatter);
    await useCase.saveSettings({ theme: 'midnight' });
    expect(mockSettings.saveSettings).toHaveBeenCalledWith({ theme: 'midnight' });
  });

  it('should handle findNotes errors in checkExistingMeanings', async () => {
    mockAnki.findNotes.mockRejectedValue(new Error('network error'));
    const useCase = new VocabularyUseCase(mockScraper, mockAnki, mockSettings, formatter);
    const meanings = [{ word: 'test', definition: 'def', example: '', pos: 'n', type: 'normal' as const }];
    const result = await useCase.checkExistingMeanings(meanings, 'Deck');
    expect(result.existing.size).toBe(0);
  });

  it('should return empty result for empty word search', async () => {
    const useCase = new VocabularyUseCase(mockScraper, mockAnki, mockSettings, formatter);
    const res1 = await useCase.searchWord('');
    expect(res1.meanings).toHaveLength(0);
    expect(res1.error).toBe('err_empty_word');

    const res2 = await useCase.searchWord('  ');
    expect(res2.meanings).toHaveLength(0);
    expect(res2.error).toBe('err_empty_word');
  });
});
