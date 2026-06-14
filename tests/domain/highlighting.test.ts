import { describe, it, expect } from 'vitest';
import { HighlightingService } from '../../src/domain/services';
import { WordMeaning } from '../../src/domain/entities';

function m(overrides: Partial<WordMeaning>): WordMeaning {
    return {
        word: 'test', definition: 'def', pos: 'noun',
        example: 'example', type: 'normal',
        ...overrides,
    };
}

describe('HighlightingService - Bug Reproduction', () => {
    it('should highlight words with suffixes (-ing, -s)', () => {
        const res1 = HighlightingService.getHighlightedExample(m({ word: 'play', example: 'He is playing now.' }));
        expect(res1).toContain('playing');
        
        const res2 = HighlightingService.getHighlightedExample(m({ word: 'box', example: 'She has many boxes.' }));
        expect(res2).toContain('boxes');
    });

    it('should highlight irregular forms correctly', () => {
        const res = HighlightingService.getHighlightedExample(m({ word: 'go', example: 'They went home.' }));
        expect(res).toContain('went');
    });

    it('should highlight idioms with intermediate words', () => {
        const res = HighlightingService.getHighlightedExample(m({ 
            word: 'take into account', 
            type: 'idiom', 
            idiomText: 'take something into account',
            example: 'I took his advice into account.' 
        }));
        expect(res).toContain('took his advice into account');
    });

    it('should highlight idioms with suffixes on components', () => {
        const res = HighlightingService.getHighlightedExample(m({ 
            word: 'get used to', 
            type: 'idiom', 
            idiomText: 'get used to (sth)',
            example: 'I am finally getting used to it.' 
        }));
        expect(res).toContain('getting used to');
    });

    it('should handle complex idiom variants with commas and etc', () => {
        const meaning = m({
            word: 'come',
            example: 'Success came easily to her.',
            idiomText: 'come easily, naturally, etc. to somebody'
        });
        const result = HighlightingService.getHighlightedExample(meaning);
        expect(result).toContain('came easily to');
    });

    it('should handle multiple variants with pipes', () => {
        const meaning = m({
            word: 'come',
            example: 'The plan came to nothing.',
            idiomText: 'come to nothing | not come to anything'
        });
        const result = HighlightingService.getHighlightedExample(meaning);
        expect(result).toContain('came to nothing');
    });

    it('should return escaped example if no match found', () => {
        const meaning = m({
            example: 'No match here.',
            idiomText: 'missing'
        });
        const result = HighlightingService.getHighlightedExample(meaning);
        expect(result).toBe('No match here.');
    });

    it('should handle y endings with ies/ied', () => {
        const meaning = m({ word: 'study', example: 'They studies.' }); // Exact match for studies if word is study? 
        // g='study', t='studies' -> g.slice(0,-1)='stud', t.startsWith('stud')=true, t.endsWith('ies')=true.
        expect(HighlightingService.getHighlightedExample(meaning)).toContain('studies');

        const meaning2 = m({ word: 'study', example: 'They studied.' });
        expect(HighlightingService.getHighlightedExample(meaning2)).toContain('studied');
    });

    it('should handle 1-character tokens that do not match', () => {
        // g='test', t='a' -> t.length < 2 -> false.
        const meaning = m({ word: 'test', example: 'a test' });
        expect(HighlightingService.getHighlightedExample(meaning)).toContain('test');
    });

    it('should handle prefix matches and length limits', () => {
        // Line 173: t.includes(g)
        const meaning = m({ word: 'happy', example: 'She was unhappily.' }); // g='happy', t='unhappily' -> t.includes(g) is true.
        expect(HighlightingService.getHighlightedExample(meaning)).toContain('unhappily');

        // Line 174: t.startsWith(g.substring(0,3))
        const meaning2 = m({ word: 'create', example: 'The creativ.' }); // g='create', t='creativ' -> t.startsWith('cre') is true.
        expect(HighlightingService.getHighlightedExample(meaning2)).toContain('creativ');
    });

    it('should trigger score break on exact match', () => {
        const meaning = m({ word: 'test', example: 'test' });
        expect(HighlightingService.getHighlightedExample(meaning)).toContain('test');
    });

    it('should NOT match carrot/carpet for car, and NOT match cater for cat', () => {
        const meaningCarrot = m({ word: 'car', example: 'I ate a carrot.' });
        expect(HighlightingService.getHighlightedExample(meaningCarrot)).toBe('I ate a carrot.');

        const meaningCarpet = m({ word: 'car', example: 'The carpet is red.' });
        expect(HighlightingService.getHighlightedExample(meaningCarpet)).toBe('The carpet is red.');

        const meaningCater = m({ word: 'cat', example: 'We cater to them.' });
        expect(HighlightingService.getHighlightedExample(meaningCater)).toBe('We cater to them.');
    });

    it('should correctly handle burn and burst irregular mappings', () => {
        const meaningBurned = m({ word: 'burn', example: 'It burned down.' });
        expect(HighlightingService.getHighlightedExample(meaningBurned)).toContain('burned');

        const meaningBurst = m({ word: 'burst', example: 'He burst into tears.' });
        expect(HighlightingService.getHighlightedExample(meaningBurst)).toContain('burst');
    });

    it('should highlight short words under 4 characters with advanced grammatical inflections', () => {
        // Silent 'e' dropping
        const meaningUse = m({ word: 'use', example: 'I am using it.' });
        expect(HighlightingService.getHighlightedExample(meaningUse)).toContain('using');

        // 'ie' to 'y'
        const meaningTie = m({ word: 'tie', example: 'He was tying his shoes.' });
        expect(HighlightingService.getHighlightedExample(meaningTie)).toContain('tying');

        // Consonant doubling
        const meaningFit = m({ word: 'fit', example: 'We are fitting a pipe.' });
        expect(HighlightingService.getHighlightedExample(meaningFit)).toContain('fitting');

        const meaningFit2 = m({ word: 'fit', example: 'It fitted perfectly.' });
        expect(HighlightingService.getHighlightedExample(meaningFit2)).toContain('fitted');
    });
});
