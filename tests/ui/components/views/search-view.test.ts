
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SearchView } from '../../../../src/ui/components/views/search-view';

describe('SearchView', () => {
  let view: SearchView;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="statusBox" class="hidden"></div>
      <button id="searchBtn"></button>
      <input id="wordInput" />
      <div id="meaningsList"></div>
      <div id="resultCard" class="hidden"></div>
      <div id="initialEmptyState"></div>
      <button id="clearWordBtn" class="hidden"></button>
      <div data-i18n="search"></div>
      <input data-i18n-placeholder="search_placeholder" />
    `;
    view = new SearchView();
  });

  it('should show status', () => {
    vi.useFakeTimers();
    view.showStatus('added', 'success');
    const box = document.getElementById('statusBox')!;
    expect(box.classList.contains('hidden')).toBe(false);
    expect(box.classList.contains('success')).toBe(true);
    expect(box.textContent).toBe('Added'); 

    vi.advanceTimersByTime(5000);
    expect(box.classList.contains('hidden')).toBe(true);
    vi.useRealTimers();
  });

  it('should apply translations', () => {
    view.setLanguage('en');
    view.applyTranslations();
    const el = document.querySelector('[data-i18n="search"]')!;
    expect(el.textContent).toBe('SEARCH');
    const input = document.querySelector('[data-i18n-placeholder="search_placeholder"]')! as HTMLInputElement;
    expect(input.placeholder).toBe('Search word...');
  });

  it('should set search loading state', () => {
    view.setSearchLoading(true);
    expect((document.getElementById('searchBtn') as HTMLButtonElement).disabled).toBe(true);
    expect((document.getElementById('wordInput') as HTMLInputElement).disabled).toBe(true);

    view.setSearchLoading(false);
    expect((document.getElementById('searchBtn') as HTMLButtonElement).disabled).toBe(false);
  });

  it('should clear results', () => {
    const list = document.getElementById('meaningsList')!;
    list.innerHTML = '<span>result</span>';
    view.clearResults();
    expect(list.innerHTML).toBe('');
    expect(document.getElementById('resultCard')!.classList.contains('hidden')).toBe(true);
    expect(document.getElementById('initialEmptyState')!.classList.contains('hidden')).toBe(false);
  });

  it('should get and set word input', () => {
    const input = document.getElementById('wordInput') as HTMLInputElement;
    input.value = 'test';
    expect(view.getWordInput()).toBe('test');

    view.setWordInput('new');
    expect(input.value).toBe('new');
    expect(document.getElementById('clearWordBtn')!.classList.contains('hidden')).toBe(false);

    view.setWordInput('');
    expect(document.getElementById('clearWordBtn')!.classList.contains('hidden')).toBe(true);
  });

  it('should handle missing elements gracefully (null guards)', () => {
    document.body.innerHTML = '';
    const brokenView = new SearchView(); // Created when elements are null
    
    // Should not throw and cover null branches
    brokenView.showStatus('test', 'success');
    brokenView.setSearchLoading(true);
    brokenView.clearResults();
    expect(brokenView.getWordInput()).toBe('');
    brokenView.setWordInput('test');
    brokenView.updateClearButton('test');
    brokenView.toggleResultVisibility(true);

    // render() with null elements covers L74, L88, L91
    brokenView.render();
  });
});
