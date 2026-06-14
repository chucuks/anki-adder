import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VocabularyUseCase } from '../../src/application/use-cases';
import { BrowserAnkiAdapter } from '../../src/infrastructure/adapters/anki/browser-anki-adapter';
import { DefaultAnkiNoteFormatter } from '../../src/infrastructure/adapters/anki/default-anki-note-formatter';
import { WordMeaning } from '../../src/domain/entities';

const lsStore: Record<string, string> = {};
beforeEach(() => {
    Object.keys(lsStore).forEach(k => delete lsStore[k]);
});

Object.defineProperty(globalThis, 'localStorage', {
    value: {
        getItem: (k: string) => lsStore[k] || null,
        setItem: (k: string, v: string) => { lsStore[k] = v; },
        clear: () => { Object.keys(lsStore).forEach(k => delete lsStore[k]); },
        removeItem: (k: string) => { delete lsStore[k]; },
    },
    configurable: true,
    writable: true,
});

describe('Integration / Duplicate Detection (BrowserAnkiAdapter)', () => {
    let anki: BrowserAnkiAdapter;
    let useCase: VocabularyUseCase;
    let formatter: DefaultAnkiNoteFormatter;

    const mockScraper = {
        getWordData: vi.fn(),
    };

    const mockSettings = {
        getSettings: vi.fn().mockResolvedValue({
            deckTags: {}, autoPosTagging: false, frontSideMode: 'example',
            audioMode: 'none', language: 'en',
        }),
        saveSetting: vi.fn(),
        saveSettings: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        anki = new BrowserAnkiAdapter();
        formatter = new DefaultAnkiNoteFormatter();
        useCase = new VocabularyUseCase(mockScraper, anki, mockSettings, formatter);
    });

    it('should find idiom note via checkExistingMeanings after addMeaningsToAnki', async () => {
        const idiom: WordMeaning = {
            word: 'name',
            definition: 'to say bad things about somebody in public',
            example: 'The politician was dragged through the mud.',
            pos: 'idiom',
            type: 'idiom',
            idiomText: 'drag somebody through the mud',
        };

        // Add the idiom
        const addResult = await useCase.addMeaningsToAnki([idiom], 'Default');
        expect(addResult.success).toBe(1);

        // Now checkExistingMeanings should find it
        const { existing, totalExistingCount } = await useCase.checkExistingMeanings([idiom], 'Default');
        expect(totalExistingCount).toBe(1);
        expect(existing.has(0)).toBe(true);
    });

    it('should find idiom note with apostrophe in text', async () => {
        const idiom: WordMeaning = {
            word: 'name',
            definition: 'to say bad things about somebody in public',
            example: 'His name was dragged through the mud.',
            pos: 'idiom',
            type: 'idiom',
            idiomText: "drag somebody's name through the mud",
        };

        await useCase.addMeaningsToAnki([idiom], 'Default');
        const { existing } = await useCase.checkExistingMeanings([idiom], 'Default');
        expect(existing.has(0)).toBe(true);
    });

    it('should correctly distinguish between two different meanings in same deck', async () => {
        const apple: WordMeaning = {
            word: 'apple', definition: 'a fruit', example: 'I ate an apple.',
            pos: 'noun', type: 'normal',
        };
        const banana: WordMeaning = {
            word: 'banana', definition: 'a yellow fruit', example: 'Monkeys eat bananas.',
            pos: 'noun', type: 'normal',
        };

        // Add only apple
        await useCase.addMeaningsToAnki([apple], 'Default');

        // checkExistingMeanings for both: apple exists, banana does not
        const { existing } = await useCase.checkExistingMeanings([apple, banana], 'Default');
        expect(existing.has(0)).toBe(true);  // apple exists
        expect(existing.has(1)).toBe(false); // banana does not exist
    });

    it('should not find note in different deck', async () => {
        const meaning: WordMeaning = {
            word: 'test', definition: 'a trial', example: 'A test run.',
            pos: 'noun', type: 'normal',
        };

        await useCase.addMeaningsToAnki([meaning], 'Vocabulary');
        const { existing } = await useCase.checkExistingMeanings([meaning], 'Default');
        expect(existing.has(0)).toBe(false); // Not found in 'Default' deck
    });
});
