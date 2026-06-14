import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrowserAnkiAdapter } from '@/infrastructure/adapters/anki/browser-anki-adapter';
import { AnkiNote } from '@/domain/entities';

describe('Infrastructure / BrowserAnkiAdapter', () => {
    let adapter: BrowserAnkiAdapter;

    // Mock localStorage
    const localStorageMock = (() => {
        let store: { [key: string]: string } = {};
        return {
            getItem: (key: string) => store[key] || null,
            setItem: (key: string, value: string) => { store[key] = value.toString(); },
            clear: () => { store = {}; },
            removeItem: (key: string) => { delete store[key]; }
        };
    })();

    beforeEach(() => {
        Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });
        adapter = new BrowserAnkiAdapter();
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('should be available', async () => {
        expect(await adapter.isAvailable()).toBe(true);
    });

    it('should grant permission', async () => {
        expect(await adapter.checkAndRequestPermission()).toBe(true);
    });

    it('should return mock decks', async () => {
        const decks = await adapter.getDecks();
        expect(decks).toContain('Default');
        expect(decks.length).toBeGreaterThan(0);
    });

    it('should add a note and find it', async () => {
        const note: AnkiNote = {
            front: 'test front',
            frontPlain: 'test front',
            back: 'test back',
            backPlain: 'test definition',
            tags: ['tag1']
        };

        const result = await adapter.addNote(note, 'Default');
        expect(result.success).toBe(true);

        const found = await adapter.findNotes('test definition');
        expect(found.length).toBe(1);
    });

    it('should return empty list if note not found', async () => {
        const found = await adapter.findNotes('non-existent definition');
        expect(found.length).toBe(0);
    });

    it('should find notes with complex queries from VocabularyUseCase', async () => {
        const note: AnkiNote = {
            front: 'apple',
            frontPlain: 'apple',
            back: 'a fruit',
            backPlain: 'a fruit',
            tags: []
        };
        await adapter.addNote(note, 'Default');
        
        // Realistic query from VocabularyUseCase: note:"Anki Adder*" "apple" "a fruit"
        const query = 'note:"Anki Adder*" "apple" "a fruit"';
        const found = await adapter.findNotes(query);
        expect(found.length).toBe(1);
    });

    it('should handle HTML escaped characters and newlines in queries', async () => {
        const note: AnkiNote = {
            front: 'R&D',
            frontPlain: 'R&D',
            back: 'Research & Development',
            backPlain: 'Research & Development',
            tags: []
        };
        await adapter.addNote(note, 'Default');
        
        // Query will have &amp;
        const query = 'note:"Anki Adder*" "R&D" "Research &amp; Development"';
        const found = await adapter.findNotes(query);
        expect(found.length).toBe(1);
    });

    it('should find notes with deck: prefix in query', async () => {
        const note: AnkiNote = {
            front: 'apple',
            frontPlain: 'apple',
            back: 'a fruit',
            backPlain: 'a fruit',
            tags: []
        };
        await adapter.addNote(note, 'Vocabulary');

        // Query from buildDuplicateQuery (use-cases.ts)
        const query = 'deck:"Vocabulary" note:"Anki Adder*" "apple" "a fruit"';
        const found = await adapter.findNotes(query);
        expect(found.length).toBe(1);
    });

    it('should not find notes in wrong deck with deck: prefix', async () => {
        const note: AnkiNote = {
            front: 'apple',
            frontPlain: 'apple',
            back: 'a fruit',
            backPlain: 'a fruit',
            tags: []
        };
        await adapter.addNote(note, 'Vocabulary');

        const query = 'deck:"Default" note:"Anki Adder*" "apple" "a fruit"';
        const found = await adapter.findNotes(query);
        expect(found.length).toBe(0);
    });

    it('should isolate notes per deck', async () => {
        const note1: AnkiNote = {
            front: 'apple', frontPlain: 'apple', back: 'a fruit', backPlain: 'a fruit', tags: []
        };
        const note2: AnkiNote = {
            front: 'dog', frontPlain: 'dog', back: 'an animal', backPlain: 'an animal', tags: []
        };
        await adapter.addNote(note1, 'Default');
        await adapter.addNote(note2, 'Vocabulary');

        const defaultFound = await adapter.findNotes('deck:"Default" "apple"');
        expect(defaultFound.length).toBe(1);

        const vocabFound = await adapter.findNotes('deck:"Vocabulary" "dog"');
        expect(vocabFound.length).toBe(1);

        const wrongDeck = await adapter.findNotes('deck:"Vocabulary" "apple"');
        expect(wrongDeck.length).toBe(0);
    });

    it('should add note with audio mode native and include sound tag', async () => {
        const note: AnkiNote = {
            front: 'hello',
            frontPlain: 'hello',
            back: 'merhaba',
            backPlain: 'merhaba',
            tags: []
        };

        const result = await adapter.addNote(note, 'Default', 'native', 'en_us');
        expect(result.success).toBe(true);

        const entries = (adapter as unknown as { getEntries(): { note: AnkiNote }[] }).getEntries();
        expect(entries[0].note.back).toContain('[sound:tts_en_us:hello]');
    });

    it('should not include sound tag when audio mode is none', async () => {
        const note: AnkiNote = {
            front: 'hello',
            frontPlain: 'hello',
            back: 'merhaba',
            backPlain: 'merhaba',
            tags: []
        };

        const result = await adapter.addNote(note, 'Default', 'none');
        expect(result.success).toBe(true);

        const entries = (adapter as unknown as { getEntries(): { note: AnkiNote }[] }).getEntries();
        expect(entries[0].note.back).not.toContain('[sound:tts');
    });

    it('should persist data across adapter instances', async () => {
        const note: AnkiNote = {
            front: 'persist test',
            frontPlain: 'persist test',
            back: 'test body',
            backPlain: 'test body',
            tags: []
        };

        await adapter.addNote(note, 'Default');

        // New adapter instance should find the persisted note
        const adapter2 = new BrowserAnkiAdapter();
        const found = await adapter2.findNotes('persist test');
        expect(found.length).toBe(1);
    });

    it('should return all entries on empty query', async () => {
        const note: AnkiNote = {
            front: 'apple', frontPlain: 'apple', back: 'fruit', backPlain: 'fruit', tags: []
        };
        await adapter.addNote(note, 'Default');

        const found = await adapter.findNotes('');
        expect(found.length).toBe(1);
    });

    it('should handle invalid JSON in storage gracefully', async () => {
        localStorage.setItem('browser_anki_notes', 'not valid json');
        const found = await adapter.findNotes('anything');
        expect(found.length).toBe(0);
    });

    it('should handle valid non-array JSON in storage gracefully', async () => {
        localStorage.setItem('browser_anki_notes', '{"some":"object"}');
        const found = await adapter.findNotes('anything');
        expect(found.length).toBe(0);
    });

    it('should include separate sound tag for audioText when different from frontPlain', async () => {
        const note: AnkiNote = {
            front: 'hello',
            frontPlain: 'hello',
            back: 'merhaba',
            backPlain: 'merhaba',
            tags: [],
            audioText: 'example sentence'
        };

        const result = await adapter.addNote(note, 'Default', 'native', 'en_us');
        expect(result.success).toBe(true);

        const entries = (adapter as unknown as { getEntries(): { note: AnkiNote }[] }).getEntries();
        expect(entries[0].note.back).toContain('[sound:tts_en_us:example sentence]');
    });

    it('should not duplicate sound tag when audioText equals frontPlain', async () => {
        const note: AnkiNote = {
            front: 'hello',
            frontPlain: 'hello',
            back: 'merhaba',
            backPlain: 'merhaba',
            tags: [],
            audioText: 'hello'
        };

        const result = await adapter.addNote(note, 'Default', 'native', 'en_us');
        expect(result.success).toBe(true);

        const entries = (adapter as unknown as { getEntries(): { note: AnkiNote }[] }).getEntries();
        // Only one TTS tag (hello), not two
        expect(entries[0].note.back.match(/\[sound:tts/g)?.length).toBe(1);
    });

    it('should use audioText for TTS when frontPlain is empty', async () => {
        const note: AnkiNote = {
            front: 'hello',
            frontPlain: '',
            back: 'merhaba',
            backPlain: 'merhaba',
            tags: [],
            audioText: 'example sentence'
        };

        const result = await adapter.addNote(note, 'Default', 'native', 'en_us');
        expect(result.success).toBe(true);

        const entries = (adapter as unknown as { getEntries(): { note: AnkiNote }[] }).getEntries();
        // frontPlain is empty → no audioTrigger, but audioText provides backAudio
        expect(entries[0].note.back).toContain('[sound:tts_en_us:example sentence]');
    });

    it('should not include sound tag when audioMode is native but frontPlain is empty', async () => {
        const note: AnkiNote = {
            front: 'hello',
            frontPlain: '',
            back: 'merhaba',
            backPlain: 'merhaba',
            tags: []
        };

        const result = await adapter.addNote(note, 'Default', 'native', 'en_us');
        expect(result.success).toBe(true);

        const entries = (adapter as unknown as { getEntries(): { note: AnkiNote }[] }).getEntries();
        expect(entries[0].note.back).not.toContain('[sound:tts');
    });

    it('should increment note IDs across calls', async () => {
        const note: AnkiNote = {
            front: 'a', frontPlain: 'a', back: 'a', backPlain: 'a', tags: []
        };
        const result1 = await adapter.addNote(note, 'Default');
        expect(result1.success).toBe(true);

        const result2 = await adapter.addNote(note, 'Default');
        expect(result2.success).toBe(true);

        // Re-create adapter to verify IDs persisted
        const adapter2 = new BrowserAnkiAdapter();
        const all = await adapter2.findNotes('a');
        expect(all.length).toBe(2);
        expect(all[0]).not.toBe(all[1]);
    });

    it('should handle localStorage being undefined (L30 safeLocalStorage null branch)', async () => {
        const originalLocalStorage = (globalThis as any).localStorage;
        Object.defineProperty(globalThis, 'localStorage', {
            value: undefined, configurable: true, writable: true
        });

        const noStoreAdapter = new BrowserAnkiAdapter();
        
        const found = await noStoreAdapter.findNotes('anything');
        expect(found).toEqual([]);

        const note: AnkiNote = {
            front: 'test', frontPlain: 'test', back: 'test', backPlain: 'test', tags: []
        };
        const result = await noStoreAdapter.addNote(note, 'Default');
        expect(result.success).toBe(true);

        Object.defineProperty(globalThis, 'localStorage', {
            value: originalLocalStorage, configurable: true, writable: true
        });
    });

    it('should handle localStorage being undefined via getter throw (L30 + L150)', async () => {
        const originalDesc = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')!;
        Object.defineProperty(globalThis, 'localStorage', {
            get() { throw new Error('blocked'); },
            configurable: true
        });

        const noStoreAdapter = new BrowserAnkiAdapter();
        const found = await noStoreAdapter.findNotes('test');
        expect(found).toEqual([]);

        const note: AnkiNote = {
            front: 'test', frontPlain: 'test', back: 'test', backPlain: 'test', tags: []
        };
        const result = await noStoreAdapter.addNote(note, 'Default');
        expect(result.success).toBe(true);

        Object.defineProperty(globalThis, 'localStorage', originalDesc);
    });

    it('should handle localStorage.setItem throwing in nextId (L150 catch)', async () => {
        const throwingStore = {
            getItem: vi.fn((key: string) => {
                if (key === 'browser_anki_id_counter') return '5';
                return null;
            }),
            setItem: vi.fn(() => { throw new Error('quota exceeded'); }),
            removeItem: vi.fn(),
            clear: vi.fn(),
            get length() { return 0; },
            key: vi.fn()
        };
        const originalLocalStorage = (globalThis as any).localStorage;
        Object.defineProperty(globalThis, 'localStorage', {
            value: throwingStore, configurable: true, writable: true
        });

        const throwingAdapter = new BrowserAnkiAdapter();
        const note: AnkiNote = {
            front: 'test', frontPlain: 'test', back: 'test', backPlain: 'test', tags: []
        };
        const result = await throwingAdapter.addNote(note, 'Default');
        // Should still report success because nextId falls back to Date.now()
        expect(result.success).toBe(true);

        Object.defineProperty(globalThis, 'localStorage', {
            value: originalLocalStorage, configurable: true, writable: true
        });
    });

    it('should handle deck-only queries and content-only queries (L103, L119)', async () => {
        const note: AnkiNote = {
            front: 'dog', frontPlain: 'dog', back: 'animal', backPlain: 'animal', tags: []
        };
        await adapter.addNote(note, 'Vocabulary');

        // deck-only query (no content terms) — should match all in deck
        const deckOnly = await adapter.findNotes('deck:"Vocabulary"');
        expect(deckOnly.length).toBe(1);

        // content-only query (no deck filter) — should match across all decks
        const contentOnly = await adapter.findNotes('animal');
        expect(contentOnly.length).toBe(1);
    });

    it('should handle unquoted terms in query (L72/L103 match[4] branch)', async () => {
        const note: AnkiNote = {
            front: 'cat', frontPlain: 'cat', back: 'feline', backPlain: 'feline', tags: []
        };
        await adapter.addNote(note, 'Default');

        const found = await adapter.findNotes('cat');
        expect(found.length).toBe(1);
    });

    it('should handle note with empty backPlain and query (L92 || branch)', async () => {
        const note: AnkiNote = {
            front: 'empty-back', frontPlain: 'empty-back', back: '', backPlain: '', tags: []
        };
        await adapter.addNote(note, 'Default');
        const found = await adapter.findNotes('empty-back');
        expect(found.length).toBe(1);
    });

    it('should handle invalid counter value in nextId (L146 isNaN true)', async () => {
        localStorage.setItem('browser_anki_id_counter', 'invalid');
        const freshAdapter = new BrowserAnkiAdapter();
        const note: AnkiNote = {
            front: 'test', frontPlain: 'test', back: 'test', backPlain: 'test', tags: []
        };
        const result = await freshAdapter.addNote(note, 'Default');
        expect(result.success).toBe(true);
    });

    it('should handle deck:-prefixed terms in query (L68, L76 guards)', async () => {
        // match[3] path: quoted string '"deck:x"' → term='deck:x' → startsWith('deck:') true → filtered out
        const result1 = await adapter.findNotes('"deck:test"');
        expect(result1).toEqual([]);

        // match[4] path: unquoted word 'deck:x' → term='deck:x' → startsWith('deck:') true → filtered out
        const result2 = await adapter.findNotes('deck:test');
        expect(result2).toEqual([]);
    });

    it('should handle note with empty front (|| fallback)', async () => {
        const note: AnkiNote = {
            front: '', frontPlain: '', back: '', backPlain: 'searchable-text', tags: []
        };
        await adapter.addNote(note, 'Default');
        const found = await adapter.findNotes('searchable-text');
        expect(found.length).toBe(1);
    });
});
