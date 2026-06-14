import { describe, it, expect } from 'vitest';
import { DefaultAnkiNoteFormatter } from '@/infrastructure/adapters/anki/default-anki-note-formatter';
import { WordMeaning } from '@/domain/entities';

describe('Infrastructure / Adapters / Anki / DefaultAnkiNoteFormatter', () => {
    const formatter = new DefaultAnkiNoteFormatter();
    const meaning: WordMeaning = {
        word: 'test',
        definition: 'def > "',
        pos: 'verb',
        example: 'test & <',
        type: 'normal'
    };

    it('should format note with word front side', () => {
        const result = formatter.format(meaning, {
            frontSideMode: 'word',
            autoPosTagging: true,
            tags: ['tag1']
        });

        expect(result.front).toBe('test');
        expect(result.back).toContain('<b>test</b>');
        expect(result.back).toContain('def &gt; &quot;');
        expect(result.tags).toContain('tag1');
        expect(result.tags).toContain('verb');
    });

    it('should format note with example front side', () => {
        const result = formatter.format(meaning, {
            frontSideMode: 'example',
            autoPosTagging: false,
            tags: []
        });

        // Front uses inline style for Anki compatibility
        expect(result.front).toContain('test');
        expect(result.front).toContain('style="color:#ff4444;font-weight:bold"');
        expect(result.front).toContain('&amp; &lt;');

        // Example should NOT be duplicated on the back
        expect(result.back).not.toContain('style="color:#ff4444;font-weight:bold"');
        expect(result.back).not.toContain('&amp; &lt;');
    });

    it('should include highlighted example on the back with inline style', () => {
        const result = formatter.format(meaning, {
            frontSideMode: 'word',
            autoPosTagging: false,
            tags: []
        });

        expect(result.back).toContain('style="color:#ff4444;font-weight:bold"');
        expect(result.back).toContain('&amp; &lt;');
    });

    it('should handle optional and null/undefined options', () => {
        const result = formatter.format(meaning, {
            frontSideMode: 'word',
            autoPosTagging: false,
            tags: null as any // Test line 11
        });
        expect(result.tags).toEqual([]);

        const result2 = formatter.format(meaning, {
            frontSideMode: 'example',
            autoPosTagging: true,
            tags: undefined as any
        });
        expect(result2.tags).toContain('verb');
    });

    it('should handle idiomText', () => {
        const idiom: WordMeaning = { ...meaning, idiomText: 'idiom' };
        const result = formatter.format(idiom, {
            frontSideMode: 'word',
            autoPosTagging: false,
            tags: []
        });
        expect(result.front).toBe('idiom');
        expect(result.back).toContain('<b>idiom</b>');
    });

    it('should handle multi-line definitions', () => {
        const multiLine: WordMeaning = { ...meaning, definition: 'line1\nline2' };
        const result = formatter.format(multiLine, {
            frontSideMode: 'word',
            autoPosTagging: false,
            tags: []
        });
        expect(result.back).toContain('line1<br>line2');
    });

    it('should escape HTML correctly for all entities', () => {
        const weird: WordMeaning = { ...meaning, word: "& < > \" '" };
        const result = formatter.format(weird, {
            frontSideMode: 'word',
            autoPosTagging: false,
            tags: []
        });
        expect(result.back).toContain('<b>&amp; &lt; &gt; &quot; &#039;</b>');
    });

    it('should handle empty or null input for escapeHTML', () => {
        // @ts-ignore
        const result = formatter.format({ word: '', definition: '', pos: '', example: '', type: 'normal' }, {
            frontSideMode: 'word',
            autoPosTagging: false,
            tags: []
        });
        expect(result.back).toBe('<b></b><br><br><br><br><i>()</i>');
    });
    it('should fallback to word if example is missing', () => {
        const noEx: WordMeaning = { ...meaning, example: '' };
        const result = formatter.format(noEx, {
            frontSideMode: 'example',
            autoPosTagging: false,
            tags: []
        });
        expect(result.front).toBe('test');
        expect(result.back).not.toContain('color:#ff4444');
    });
});
