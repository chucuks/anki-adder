import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OxfordScraperAdapter } from '@/infrastructure/adapters/oxford/scraper';

vi.mock('@capacitor/core', () => ({
  CapacitorHttp:  { get: vi.fn() },
  registerPlugin: vi.fn(() => ({})),
}));

import { CapacitorHttp } from '@capacitor/core';
const mockGet = CapacitorHttp.get as any;

// ─── DOMParser setup ─────────────────────────────────────────────────────────
function setupDOMParser() {
  global.DOMParser = class {
    parseFromString(html: string, _type: string) {
      const doc = document.createElement('div');
      doc.innerHTML = html;
      return {
        querySelector:    (s: string) => doc.querySelector(s),
        querySelectorAll: (s: string) => doc.querySelectorAll(s),
      } as unknown as Document;
    }
  } as unknown as typeof DOMParser;
}

// ─── HTML fixtures ────────────────────────────────────────────────────────────
const NORMAL_PAGE_HTML = `
<html><body>
  <div class="webtop"><span class="pos">noun</span></div>
  <ul>
    <li class="sense">
      <span class="def">a procedure to establish quality</span>
      <span class="x">The test was difficult.</span>
    </li>
    <li class="sense">
      <span class="def">an examination</span>
    </li>
  </ul>
</body></html>`;

/** Covers phrasal verb parsing (lines 44-52) */
const PHRASAL_VERB_PAGE_HTML = `
<html><body>
  <div class="webtop"><span class="pos">verb</span></div>
  <ul>
    <li class="sense">
      <span class="def">primary definition</span>
      <span class="x">She runs every day.</span>
    </li>
  </ul>
  <div class="pv-g">
    <span class="pv">run away</span>
    <ul>
      <li class="sense">
        <span class="def">to flee quickly</span>
        <span class="x">The thief ran away.</span>
      </li>
    </ul>
  </div>
  <div class="pv-g">
    <span class="pv">run out</span>
    <ul>
      <li class="sense">
        <span class="def">to be exhausted</span>
      </li>
    </ul>
  </div>
</body></html>`;

/** Covers idiom parsing (lines 54-63) */
const IDIOM_PAGE_HTML = `
<html><body>
  <div class="webtop"><span class="pos">verb</span></div>
  <ul>
    <li class="sense">
      <span class="def">primary definition</span>
    </li>
  </ul>
  <div class="idioms">
    <div class="idm-g">
      <span class="idm">at the drop of a hat</span>
      <ul>
        <li class="sense">
          <span class="def">immediately and without hesitation</span>
          <span class="x">She would help at the drop of a hat.</span>
        </li>
      </ul>
    </div>
    <div class="idm-g">
      <span class="idm">kick the bucket</span>
      <ul>
        <li class="sense">
          <span class="def">to die</span>
        </li>
      </ul>
    </div>
  </div>
</body></html>`;

/** Covers senses inside idioms div being skipped (line 37) */
const SENSE_IN_IDIOMS_DIV = `
<html><body>
  <div class="webtop"><span class="pos">noun</span></div>
  <div class="idioms">
    <li class="sense">
      <span class="def">should be skipped</span>
    </li>
    <div class="idm-g">
      <span class="idm">a bird in the hand</span>
      <ul>
        <li class="sense">
          <span class="def">it is better to be safe than sorry</span>
        </li>
      </ul>
    </div>
  </div>
</body></html>`;

/** Covers getBestExample with multiple examples and punctuation preference */
const MULTIPLE_EXAMPLES_HTML = `
<html><body>
  <div class="webtop"><span class="pos">noun</span></div>
  <ul>
    <li class="sense">
      <span class="def">a trial</span>
      <span class="x">First example without punctuation</span>
      <span class="x">Second example with punctuation.</span>
    </li>
  </ul>
</body></html>`;

/** Covers sense with .pos override */
const SENSE_WITH_POS_HTML = `
<html><body>
  <div class="webtop"><span class="pos">noun</span></div>
  <ul>
    <li class="sense">
      <span class="pos">verb</span>
      <span class="def">to test something</span>
      <span class="x">She tested the theory.</span>
    </li>
  </ul>
</body></html>`;

// ─── OxfordScraperAdapter tests ───────────────────────────────────────────────
describe('Infrastructure / OxfordScraperAdapter', () => {
  let scraper: OxfordScraperAdapter;

  beforeEach(() => {
    scraper = new OxfordScraperAdapter('https://www.oxfordlearnersdictionaries.com/definition/english/');
    vi.clearAllMocks();
    setupDOMParser();
  });

  // ── Happy path ────────────────────────────────────────────────────────
  describe('getWordData - success cases', () => {
    it('should return meanings on 200 response', async () => {
      mockGet.mockResolvedValue({ status: 200, data: NORMAL_PAGE_HTML });
      const { meanings, error } = await scraper.getWordData('test');
      expect(error).toBeNull();
      expect(meanings.length).toBeGreaterThan(0);
      expect(meanings[0].word).toBe('test');
      expect(meanings[0].type).toBe('normal');
    });

    it('should use mainPos when sense has no .pos', async () => {
      mockGet.mockResolvedValue({ status: 200, data: NORMAL_PAGE_HTML });
      const { meanings } = await scraper.getWordData('test');
      expect(meanings[0].pos).toBe('noun');
    });

    it('should use sense-level .pos when present', async () => {
      mockGet.mockResolvedValue({ status: 200, data: SENSE_WITH_POS_HTML });
      const { meanings } = await scraper.getWordData('test');
      expect(meanings[0].pos).toBe('verb');
    });

    it('should skip senses without a definition (line 39)', async () => {
      const html = `<html><body><div class="webtop"><span class="pos">noun</span></div><ul><li class="sense"></li></ul></body></html>`;
      mockGet.mockResolvedValue({ status: 200, data: html });
      const { meanings } = await scraper.getWordData('test');
      expect(meanings).toHaveLength(0);
    });

    it('should skip phrasal verb senses without a definition (line 49)', async () => {
      const html = `<html><body><div class="pv-g"><span class="pv">run out</span><ul><li class="sense"></li></ul></div></body></html>`;
      mockGet.mockResolvedValue({ status: 200, data: html });
      const { meanings } = await scraper.getWordData('test');
      expect(meanings).toHaveLength(0);
    });

    it('should skip idiom senses without a definition (line 60)', async () => {
      const html = `<html><body><div class="idm-g"><span class="idm">hat</span><ul><li class="sense"></li></ul></div></body></html>`;
      mockGet.mockResolvedValue({ status: 200, data: html });
      const { meanings } = await scraper.getWordData('test');
      expect(meanings).toHaveLength(0);
    });

    it('should handle missing .def element in sense', async () => {
      const html = `<html><body><div class="webtop"><span class="pos">noun</span></div><ul><li class="sense"><span class="not-def">oops</span></li></ul></body></html>`;
      mockGet.mockResolvedValue({ status: 200, data: html });
      const { meanings } = await scraper.getWordData('test');
      expect(meanings).toHaveLength(0);
    });
  });

  // ── Phrasal verbs (lines 44-52) ──────────────────────────────────────
  describe('getWordData - phrasal verbs (lines 44-52)', () => {
    it('should parse phrasal verb groups', async () => {
      mockGet.mockResolvedValue({ status: 200, data: PHRASAL_VERB_PAGE_HTML });
      const { meanings, error } = await scraper.getWordData('run');
      expect(error).toBeNull();
      const pvMeanings = meanings.filter(m => m.type === 'idiom' && m.pos === 'phrasal verb');
      expect(pvMeanings.length).toBeGreaterThan(0);
    });

    it('should set idiomText to the phrasal verb text', async () => {
      mockGet.mockResolvedValue({ status: 200, data: PHRASAL_VERB_PAGE_HTML });
      const { meanings } = await scraper.getWordData('run');
      const pv = meanings.find(m => m.idiomText === 'run away');
      expect(pv).toBeDefined();
      expect(pv?.definition).toBe('to flee quickly');
    });

    it('should skip pv-g without a pv element (no phrasal verb type added)', async () => {
      const htmlWithEmptyPvGroup = `
      <html><body>
        <div class="webtop"><span class="pos">verb</span></div>
        <ul><li class="sense"><span class="def">primary</span></li></ul>
        <div class="pv-g">
          <!-- no .pv element -->
          <ul><li class="sense"><span class="def">orphan sense</span></li></ul>
        </div>
      </body></html>`;
      mockGet.mockResolvedValue({ status: 200, data: htmlWithEmptyPvGroup });
      const { meanings } = await scraper.getWordData('test');
      // No meanings should have pos === 'phrasal verb' since pv-g has no .pv text
      expect(meanings.every(m => m.pos !== 'phrasal verb')).toBe(true);
    });
  });

  // ── Idioms (lines 54-63) ─────────────────────────────────────────────
  describe('getWordData - idioms (lines 54-63)', () => {
    it('should parse idiom groups', async () => {
      mockGet.mockResolvedValue({ status: 200, data: IDIOM_PAGE_HTML });
      const { meanings, error } = await scraper.getWordData('hat');
      expect(error).toBeNull();
      const idiomMeanings = meanings.filter(m => m.type === 'idiom' && m.pos === 'idiom');
      expect(idiomMeanings.length).toBeGreaterThan(0);
    });

    it('should set idiomText to the idiom text', async () => {
      mockGet.mockResolvedValue({ status: 200, data: IDIOM_PAGE_HTML });
      const { meanings } = await scraper.getWordData('hat');
      const idiom = meanings.find(m => m.idiomText === 'at the drop of a hat');
      expect(idiom).toBeDefined();
      expect(idiom?.definition).toBe('immediately and without hesitation');
    });

    it('should skip idm-g without an .idm element', async () => {
      const htmlWithEmptyIdmGroup = `
      <html><body>
        <div class="webtop"><span class="pos">noun</span></div>
        <ul><li class="sense"><span class="def">primary</span></li></ul>
        <div class="idioms">
          <div class="idm-g">
            <!-- no .idm element -->
            <ul><li class="sense"><span class="def">should not appear</span></li></ul>
          </div>
        </div>
      </body></html>`;
      mockGet.mockResolvedValue({ status: 200, data: htmlWithEmptyIdmGroup });
      const { meanings } = await scraper.getWordData('test');
      expect(meanings.every(m => m.definition !== 'should not appear')).toBe(true);
    });

    it('should skip senses inside idioms div that are NOT inside idm-g', async () => {
      mockGet.mockResolvedValue({ status: 200, data: SENSE_IN_IDIOMS_DIV });
      const { meanings } = await scraper.getWordData('bird');
      expect(meanings.every(m => m.definition !== 'should be skipped')).toBe(true);
    });

    it('should skip idiom sense without definition (line 62)', async () => {
      const html = `
      <html><body>
        <div class="idioms">
          <div class="idm-g">
            <span class="idm">idiom</span>
            <ul><li class="sense"></li></ul>
          </div>
        </div>
      </body></html>`;
      mockGet.mockResolvedValue({ status: 200, data: html });
      const { meanings } = await scraper.getWordData('test');
      expect(meanings).toHaveLength(0);
    });
  });

  // ── getBestExample ────────────────────────────────────────────────────
  describe('getBestExample', () => {
    it('should prefer example ending with punctuation', async () => {
      mockGet.mockResolvedValue({ status: 200, data: MULTIPLE_EXAMPLES_HTML });
      const { meanings } = await scraper.getWordData('test');
      expect(meanings[0].example).toBe('Second example with punctuation.');
    });

    it('should return first example if none end with punctuation (line 77)', async () => {
      const html = `
      <html><body>
        <div class="webtop"><span class="pos">noun</span></div>
        <ul>
          <li class="sense">
            <span class="def">a trial</span>
            <span class="x">no punctuation here</span>
            <span class="x">also no punctuation</span>
          </li>
        </ul>
      </body></html>`;
      mockGet.mockResolvedValue({ status: 200, data: html });
      const { meanings } = await scraper.getWordData('test');
      expect(meanings[0].example).toBe('no punctuation here');
    });

    it('should return empty string when no example elements (line 77)', async () => {
      const html = `
      <html><body>
        <div class="webtop"><span class="pos">noun</span></div>
        <ul>
          <li class="sense">
            <span class="def">no example</span>
          </li>
        </ul>
      </body></html>`;
      mockGet.mockResolvedValue({ status: 200, data: html });
      const { meanings } = await scraper.getWordData('test');
      expect(meanings[0].example).toBe('');
    });

    it('should return empty string when example elements are empty (covers line 79 fallback)', async () => {
      const html = `
      <html><body>
        <div class="webtop"><span class="pos">noun</span></div>
        <ul>
          <li class="sense">
            <span class="def">empty example</span>
            <span class="x"></span>
          </li>
        </ul>
      </body></html>`;
      mockGet.mockResolvedValue({ status: 200, data: html });
      const { meanings } = await scraper.getWordData('test');
      expect(meanings[0].example).toBe('');
    });
  });

  // ── Error paths ───────────────────────────────────────────────────────
  describe('error handling', () => {
    it('should retry on 404 and succeed if retry returns 200', async () => {
      mockGet
        .mockResolvedValueOnce({ status: 404, data: '' })
        .mockResolvedValueOnce({ status: 200, data: NORMAL_PAGE_HTML });
      const { meanings, error } = await scraper.getWordData('retry');
      expect(error).toBeNull();
      expect(meanings.length).toBeGreaterThan(0);
    });

    it('should retry on 404 and fail with err_http if retry also fails', async () => {
      mockGet
        .mockResolvedValueOnce({ status: 404, data: '' })
        .mockResolvedValueOnce({ status: 404, data: '' });
      const { error } = await scraper.getWordData('xyzzy');
      expect(error).toBe('err_http_404');
    });

    it('should return err_http for non-200 non-404 status', async () => {
      mockGet.mockResolvedValue({ status: 500, data: '' });
      const { error } = await scraper.getWordData('test');
      expect(error).toBe('err_http_500');
    });

    it('should return err_not_found when no meanings extracted from page', async () => {
      mockGet.mockResolvedValue({ status: 200, data: '<html><body></body></html>' });
      const { meanings, error } = await scraper.getWordData('test');
      expect(meanings).toHaveLength(0);
      expect(error).toBe('err_not_found');
    });

    it('should return err_connection on network error', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));
      const { error } = await scraper.getWordData('test');
      expect(error).toBe('err_connection');
    });

    it('should handle whitespace and case in word formatting', async () => {
      mockGet.mockResolvedValue({ status: 200, data: NORMAL_PAGE_HTML });
      await scraper.getWordData('  TAKE OFF  ');
      // Should call with formatted URL
      expect(mockGet).toHaveBeenCalledWith(
        expect.objectContaining({ url: expect.stringContaining('take-off') })
      );
    });
  });
});
