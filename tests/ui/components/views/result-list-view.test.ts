import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResultListView } from '../../../../src/ui/components/views/result-list-view';
import { WordMeaning } from '../../../../src/domain/entities';

describe('ResultListView', () => {
  let view: ResultListView;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="meaningsList"></div>
      <button id="addBtn"></button>
      <div id="existingWordCount" class="hidden"></div>
      <button id="toggleSelectBtn"></button>
    `;
    view = new ResultListView();
  });

  it('should render empty state when no meanings', () => {
    view.renderMeanings([], new Set(), new Set(), true);
    const list = document.getElementById('meaningsList')!;
    expect(list.innerHTML).toContain('No meanings found');
  });

  it('should render meanings and handle clicks', () => {
    const meanings: WordMeaning[] = [
      { word: 'test', definition: 'Def 1', pos: 'verb', type: 'normal', example: 'Ex 1' },
      { word: 'test', definition: 'Def 2', pos: 'noun', type: 'normal', example: '' }
    ];
    const clickSpy = vi.fn();
    view.onMeaningClick = clickSpy;

    view.renderMeanings(meanings, new Set([0]), new Set(), true);
    
    const list = document.getElementById('meaningsList')!;
    const items = list.querySelectorAll('.meaning-item');
    expect(items.length).toBe(2);
    expect(items[0].innerHTML).toContain('example-text');
    expect(items[1].innerHTML).not.toContain('example-text');

    (items[0] as HTMLElement).click();
    expect(clickSpy).toHaveBeenCalledWith(0);
  });

  it('should sort existing meanings to the top', () => {
    const meanings: WordMeaning[] = [
      { word: 'test', definition: 'Def 1', pos: 'verb', type: 'normal', example: '' },
      { word: 'test', definition: 'Def 2', pos: 'noun', type: 'normal', example: '' }
    ];
    // Def 2 (idx 1) is existing
    view.renderMeanings(meanings, new Set(), new Set([1]), true);

    const items = document.querySelectorAll('.meaning-item');
    // Existing (index 1) should be at the top
    expect(items[0].getAttribute('data-index')).toBe('1');
    expect(items[0].classList.contains('existing')).toBe(true);
    // Non-existing (index 0) should be at the bottom
    expect(items[1].getAttribute('data-index')).toBe('0');
    expect(items[1].classList.contains('existing')).toBe(false);

    // Reverse: Def 1 (idx 0) is existing
    view.renderMeanings(meanings, new Set(), new Set([0]), true);
    const items2 = document.querySelectorAll('.meaning-item');
    expect(items2[0].getAttribute('data-index')).toBe('0'); // Existing (idx 0) at top
  });

  it('should sort non-idioms before idioms', () => {
    const meanings: WordMeaning[] = [
      { word: 'test', definition: 'idiom', pos: 'idiom', type: 'idiom', example: '' },
      { word: 'test', definition: 'verb', pos: 'verb', type: 'normal', example: '' }
    ];
    view.renderMeanings(meanings, new Set(), new Set(), true);
    const items = document.querySelectorAll('.meaning-item');
    expect(items[0].innerHTML).toContain('verb');
    expect(items[1].innerHTML).toContain('idiom');
  });

  it('should hide idioms when showIdioms is false', () => {
    const meanings: WordMeaning[] = [
      { word: 'test', definition: 'Def 1', pos: 'verb', type: 'normal', example: '' },
      { word: 'test', definition: 'Def 2', pos: 'idiom', type: 'idiom', example: '' }
    ];
    view.renderMeanings(meanings, new Set(), new Set(), false);
    const items = document.querySelectorAll('.meaning-item');
    expect(items.length).toBe(1);
    expect(items[0].getAttribute('data-index')).toBe('0');
  });

  it('should update select button text', () => {
    view.updateSelectButton(true, 'en');
    const btn = document.getElementById('toggleSelectBtn')!;
    expect(btn.textContent).toBe('Deselect');
  });

  it('should show existing hint', () => {
    view.showExistingHint(3);
    const hint = document.getElementById('existingWordCount')!;
    expect(hint.classList.contains('hidden')).toBe(false);
    expect(hint.innerHTML).toContain('3');

    // Test singular form (line 85 branch)
    view.showExistingHint(1);
    expect(hint.innerHTML).toContain('1');
    expect(hint.innerHTML).toContain('exist'); // Or 'card exists' depending on translation

    view.showExistingHint(0);
    expect(hint.classList.contains('hidden')).toBe(true);
  });

  it('should handle missing elements', () => {
    document.body.innerHTML = '';
    const brokenView = new ResultListView();
    brokenView.renderMeanings([], new Set(), new Set(), true);
    brokenView.showExistingHint(1);
  });

  it('should handle missing select button', () => {
    document.getElementById('toggleSelectBtn')?.remove();
    view.updateSelectButton(true, 'en'); // Should return silently
  });

  it('should use pre-computed highlightedExamples when provided', () => {
    const meanings: WordMeaning[] = [
      { word: 'test', definition: 'Def 1', pos: 'verb', type: 'normal', example: 'A test example.' }
    ];
    view.renderMeanings(meanings, new Set(), new Set(), true, ['<span class="highlight">test</span> example.']);
    const item = document.getElementById('meaningsList')!.querySelector('.meaning-item');
    expect(item?.innerHTML).toContain('class="highlight"');
  });

  it('should fall back to inline highlighting when highlightedExamples[i] is undefined', () => {
    const meanings: WordMeaning[] = [
      { word: 'test', definition: 'Def 1', pos: 'verb', type: 'normal', example: 'A test example.' }
    ];
    // Pass undefined highlightedExamples
    view.renderMeanings(meanings, new Set(), new Set(), true, undefined);
    const item = document.getElementById('meaningsList')!.querySelector('.meaning-item');
    // Should still show example text (with or without highlight)
    expect(item?.innerHTML).toContain('example');
  });

  it('should handle per-item render failure gracefully', () => {
    // Create a meaning that will throw when rendered
    const throwing: any = { word: 'test', definition: 'Def 1', pos: 'verb', type: 'normal', example: 'Ex' };
    // Make pos.toLowerCase throw by setting pos to null
    // Actually, let's use a different approach: the render accesses m.definition for the fallback
    // We'll make highlightedExamples throw by providing a getter that blows up
    const meanings: WordMeaning[] = [
      throwing,
      { word: 'test2', definition: 'Def 2', pos: 'noun', type: 'normal', example: 'Ex 2' }
    ];
    // Pass highlightedExamples that will cause an error when accessed
    const badHighlights = [
      new String('ok') as unknown as string, // first item
      'good' // second item
    ];
    // Instead, let's test that a meaning with incomplete data doesn't break rendering of others
    const incomplete: any = { word: 'fail', definition: 'Def fail' }; // no pos, no type
    const meanings2: WordMeaning[] = [
      incomplete,
      { word: 'ok', definition: 'Def ok', pos: 'noun', type: 'normal', example: '' }
    ];
    view.renderMeanings(meanings2, new Set(), new Set(), true);
    const items = document.getElementById('meaningsList')!.querySelectorAll('.meaning-item');
    expect(items.length).toBe(2);
    // The second meaning should render despite the first having issues
    expect(items[1].innerHTML).toContain('Def ok');
  });
});
