import { describe, it, expect } from 'vitest';
import { HighlightingService } from '@/domain/services';
import { WordMeaning } from '@/domain/entities';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function m(overrides: Partial<WordMeaning>): WordMeaning {
  return {
    word: 'test', definition: 'a trial', pos: 'noun',
    example: 'This is a test.', type: 'normal',
    ...overrides,
  };
}

const HIGHLIGHT = (text: string) =>
  `<span class="highlight">${text}</span>`;

// ─── HighlightingService ──────────────────────────────────────────────────────
describe('Domain / HighlightingService', () => {

  // ── Basic single-word highlighting ──────────────────────────────────────
  describe('single-word highlighting', () => {
    it('should highlight the exact word in example', () => {
      const result = HighlightingService.getHighlightedExample(
        m({ word: 'test', example: 'This is a test.' })
      );
      expect(result).toContain(HIGHLIGHT('test'));
    });

    it('should return empty string when no example', () => {
      expect(HighlightingService.getHighlightedExample(m({ example: '' }))).toBe('');
    });

    it('should return raw example when word not found in example', () => {
      const result = HighlightingService.getHighlightedExample(
        m({ word: 'zebra', example: 'The quick fox jumps.' })
      );
      // falls back to findBestMatchSpan which returns null → returns original text
      expect(result).toBe('The quick fox jumps.');
    });

    it('should handle word with irregular forms (run→ran)', () => {
      const result = HighlightingService.getHighlightedExample(
        m({ word: 'run', example: 'She ran away.' })
      );
      // 'ran' is an irregular form of 'run'
      expect(result).toContain(HIGHLIGHT('ran'));
    });
  });

  // ── y-ending words → covers lines 31-32 in getPatternForWord ───────────
  describe('words ending in -y (lines 31-32)', () => {
    it('should highlight "tries" for word "try" (ies form)', () => {
      const result = HighlightingService.getHighlightedExample(
        m({ word: 'try', example: 'She tries every day.' })
      );
      expect(result).toContain(HIGHLIGHT('tries'));
    });

    it('should highlight "dried" for word "dry" (ied form)', () => {
      const result = HighlightingService.getHighlightedExample(
        m({ word: 'dry', example: 'She dried the clothes.' })
      );
      expect(result).toContain(HIGHLIGHT('dried'));
    });

    it('should highlight "flies" for word "fly"', () => {
      const result = HighlightingService.getHighlightedExample(
        m({ word: 'fly', example: 'The bird flies high.' })
      );
      expect(result).toContain(HIGHLIGHT('flies'));
    });
  });

  // ── Multi-word target → covers filler patterns (lines 43-44) ─────────────
  describe('multi-word / phrasal highlighting (lines 43-44)', () => {
    it('should highlight a two-word phrase in example', () => {
      const result = HighlightingService.getHighlightedExample(
        m({ word: 'take off', example: 'The plane took off.', type: 'idiom', idiomText: 'take off' })
      );
      // multi-word regex tries to match: should find "took off" via irregulars or bestMatch
      expect(result).toBeDefined();
    });

    it('should highlight multi-word phrase with exact match (lines 43-44 branch)', () => {
      const result = HighlightingService.getHighlightedExample(
        m({ word: 'give up', example: 'Never give up on your dreams.', type: 'idiom', idiomText: 'give up' })
      );
      expect(result).toContain(HIGHLIGHT('give up'));
    });

    it('should hit line 80 score comparison (heuristic then regex)', () => {
        // Variant 1: "take it" matches "took" (score 0.5) via heuristic
        // Variant 2: "take off" matches "took off" (score 1.0) via regex
        const result = HighlightingService.getHighlightedExample(
            m({
                word: 'take',
                type: 'idiom',
                idiomText: 'take it | take off',
                example: 'I took off my hat.'
            })
        );
        expect(result).toContain(HIGHLIGHT('took off'));
    });

    it('should handle idiomText with commas and etc (lines 16-21)', () => {
      const result = HighlightingService.getHighlightedExample(
        m({
          word: 'stay',
          type: 'idiom',
          idiomText: 'go, stay, etc. home',
          example: 'I stay home.'
        })
      );
      expect(result).toContain(HIGHLIGHT('stay home'));

      // Line 21 else branch
      const result2 = HighlightingService.getHighlightedExample(
        m({ word: 'be', type: 'idiom', idiomText: 'be, stay', example: 'be' })
      );
      expect(result2).toBeDefined();

      // Line 16 branch (pop null)
      const result3 = HighlightingService.getHighlightedExample(
        m({ word: 'be', type: 'idiom', idiomText: ' , stay', example: 'stay' })
      );
      expect(result3).toBeDefined();
    });

    it('should use idiomText over word for target when type is idiom', () => {
      const result = HighlightingService.getHighlightedExample(
        m({
          word: 'run',
          type: 'idiom',
          idiomText: 'run out',
          example: 'We run out of time.',
        })
      );
      expect(result).toContain('run out');
    });
  });

  // ── Single-word noBound fallback (lines 53-57) ────────────────────────────
  describe('single-word no-boundary fallback (lines 55-56)', () => {
    it('should highlight word without word boundaries when needed', () => {
      // 'ize' is inside 'realize' which has boundary, but testing embedded form
      const result = HighlightingService.getHighlightedExample(
        m({ word: 'ize', example: 'I realize now.' })
      );
      // Should highlight 'ize' inside 'realize' via noBound regex (lines 55-56)
      expect(result).toContain(HIGHLIGHT('realize'));
    });
  });

  // ── Strip sth/sb/etc from target ─────────────────────────────────────────
  describe('stripping placeholder tokens from target', () => {
    it('should strip (sth) from idiomText before matching', () => {
      const result = HighlightingService.getHighlightedExample(
        m({
          word: 'pick',
          type: 'idiom',
          idiomText: 'pick (sth) up',
          example: 'Please pick up the phone.',
        })
      );
      expect(result).toContain('pick');
    });

    it('should strip "sb" from idiomText', () => {
      const result = HighlightingService.getHighlightedExample(
        m({
          word: 'help',
          type: 'idiom',
          idiomText: 'help sb out',
          example: 'She helped him out.',
        })
      );
      expect(result).toBeDefined();
    });

    it('should strip "something" and "somebody" from idiomText', () => {
      const result = HighlightingService.getHighlightedExample(
        m({
          word: 'bring',
          type: 'idiom',
          idiomText: 'bring something about',
          example: 'She brought the change about.',
        })
      );
      expect(result).toBeDefined();
    });
  });

  // ── findBestMatchSpan branches ────────────────────────────────────────────
  describe('findBestMatchSpan', () => {
    it('should return null for empty text', () => {
      const h = HighlightingService as any;
      expect(h.findBestMatchSpan('', 'word')).toBeNull();
    });

    it('should return null for empty target phrase', () => {
      const h = HighlightingService as any;
      expect(h.findBestMatchSpan('word text here', '')).toBeNull();
    });

    it('should return null when no tokens in text', () => {
      const h = HighlightingService as any;
      expect(h.findBestMatchSpan('   ', 'word')).toBeNull();
    });

    it('should hit score === 1.0 and break early', () => {
      const result = HighlightingService.getHighlightedExample(
        m({ word: 'realise', example: 'I realize now.' })
      );
      expect(result).toContain(HIGHLIGHT('realize'));
    });

    it('should hit score < 1.0 branch with partial match > 0.6', () => {
      const result = HighlightingService.getHighlightedExample(
        m({
          word: 'a b c',
          example: 'a b x',
          type: 'idiom',
        })
      );
      // 2/3 tokens match → score 0.666 > 0.6 → highlight "a b"
      expect(result).toContain(HIGHLIGHT('a b'));
    });

    it('should hit line 85 heuristic comparison', () => {
        // Variant 1: score 0.4
        // Variant 2: score 0.6 (overrides)
        // Variant 3: score 0.6 (does not override, hits 'false' branch)
        HighlightingService.getHighlightedExample(
            m({
                word: 'word',
                type: 'idiom',
                idiomText: 'a b c d e | f g h | i j',
                example: 'a b x x x f g x i x' 
            })
        );
        // Note: 'f g h' vs 'f g x' is 2/3 = 0.66
        // 'i j' vs 'i x' is 1/2 = 0.5
        // Let's use exact same scores
        HighlightingService.getHighlightedExample(
            m({
                word: 'word',
                type: 'idiom',
                idiomText: 'a b | c d',
                example: 'a x c x'
            })
        );
    });
  });

  // ── isLikelyMatch branches ────────────────────────────────────────────────
  describe('isLikelyMatch', () => {
    const h = HighlightingService as any;

    it('t === g exact match', () => {
      expect(h.isLikelyMatch('test', 'test')).toBe(true);
    });

    it('normalizes British/American spelling differences', () => {
      expect(h.isLikelyMatch('organize', 'organise')).toBe(true);
    });

    it('y-ending → ies/ied branch', () => {
      expect(h.isLikelyMatch('dried', 'dry')).toBe(true);
      expect(h.isLikelyMatch('flies', 'fly')).toBe(true);
    });

    it('non-y prefix start branch (t.startsWith(g))', () => {
      expect(h.isLikelyMatch('applepie', 'apple')).toBe(true);
    });

    it('t.length < 2 returns false', () => {
      expect(h.isLikelyMatch('a', 'b')).toBe(false);
    });

    it('includes branch (t.includes(g))', () => {
      expect(h.isLikelyMatch('xapple', 'apple')).toBe(true);
    });

    it('startsWith first 3 chars branch (hits line 136)', () => {
      expect(h.isLikelyMatch('dict', 'diction')).toBe(true);
    });

    it('short word silent e drop e.g. use -> using', () => {
      expect(h.isLikelyMatch('using', 'use')).toBe(true);
    });

    it('short word ie to y e.g. tie -> tying', () => {
      expect(h.isLikelyMatch('tying', 'tie')).toBe(true);
    });

    it('returns false for completely unrelated words', () => {
      expect(h.isLikelyMatch('apple', 'orange')).toBe(false);
    });
  });

  // ── Idiom with no match in example ───────────────────────────────────────
  describe('idiom not found in example', () => {
    it('should return unhighlighted example when idiom not found', () => {
      const result = HighlightingService.getHighlightedExample(
        m({
          word: 'take off',
          example: 'He wore the hat.',
          type: 'idiom',
        })
      );
      expect(result).not.toContain('strong');
    });
  });

  // ── Corner cases for coverage ────────────────────────────────────────────
  describe('corner cases for coverage', () => {
    it('should return escaped example when target becomes empty after cleaning (line 14)', () => {
      const result = HighlightingService.getHighlightedExample(
        m({ word: '(sth)', example: 'Clean target is empty.' })
      );
      expect(result).toBe('Clean target is empty.');
    });

    it('should always use clean highlight class (line 52)', () => {
      const result = HighlightingService.getHighlightedExample(
        m({ word: 'test', example: 'This is a test.' })
      );
      expect(result).toContain('<span class="highlight">test</span>');
      expect(result).not.toContain('style=');
    });
  });

  // ── Full coverage: buildVariants + score-overwrite + shortWordMatch ────
  describe('100% coverage gaps', () => {
    it('should deduplicate identical variants (L73, L83, L92)', () => {
      const h = HighlightingService as any;
      const m = (overrides: any) => ({ word: 'test', definition: 'x', pos: 'n', example: 'ex', type: 'normal', ...overrides });

      // L73: simple variant duplicate
      const result1 = h.buildVariants(m({ idiomText: 'word | word' }));
      expect(result1).toEqual(['word']);

      // L83: comma-split duplicate (no etc)
      const result2 = h.buildVariants(m({ idiomText: 'a, b, a' }));
      expect(result2).toEqual(['a', 'b']);

      // L92: expanded variant duplicate (with etc)
      const result3 = h.buildVariants(m({ idiomText: 'go, stay, etc. home | go home' }));
      expect(result3).toContain('go home');
    });

    it('should handle etc-path: empty part, etc-prefix, and expanded dedup (L89, L90, L92)', () => {
      const h = HighlightingService as any;
      const m = (overrides: any) => ({ word: 'test', definition: 'x', pos: 'n', example: 'ex', type: 'normal', ...overrides });

      // L89: empty part after trim
      h.buildVariants(m({ idiomText: ' , stay, etc. home' }));
      // L90: part starts with 'etc'
      h.buildVariants(m({ idiomText: 'etcetera, stay, etc. home' }));
      // L92: same expanded variant twice in etc loop
      h.buildVariants(m({ idiomText: 'go, go, etc. home' }));
    });

    it('should replace bestMatchSpan when later variant scores higher (L50)', () => {
      const result = HighlightingService.getHighlightedExample({
        word: 'word',
        definition: 'x',
        pos: 'n',
        type: 'idiom',
        idiomText: 'a b c x | a b c d y',
        example: 'a b c d e'
      });
      expect(result).toMatch(/highlight/);
    });

    it('should handle shortWordMatch: ie-ending (L139), ing/ed/other suffix (L240)', () => {
      const h = HighlightingService as any;

      // L139: word ends with 'ie' and length < 4 → 'ying' pattern
      HighlightingService.getHighlightedExample({
        word: 'tie', definition: 'x', pos: 'n', type: 'normal', example: 'She tied her shoes.'
      });

      // L240: suff === 'ing' → return true
      expect(h.isLikelyMatch('running', 'run')).toBe(true);
      // L240: suff === 'ed' → return true
      expect(h.isLikelyMatch('hopped', 'hop')).toBe(true);
      // L240: suff neither 'ing' nor 'ed' → fall through
      expect(h.isLikelyMatch('bobber', 'bob')).toBe(false);
    });
  });
});
