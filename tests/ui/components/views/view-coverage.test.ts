import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnkiView } from '@/ui/components/views/anki-view';
import { TagManagerView } from '@/ui/components/views/tag-manager-view';
import { ResultListView } from '@/ui/components/views/result-list-view';
import { SearchView } from '@/ui/components/views/search-view';
import { SettingsView } from '@/ui/components/views/settings-view';
import { AnkiPresenter } from '@/ui/presenters/anki-presenter';
import { SearchPresenter } from '@/ui/presenters/search-presenter';
import { Store } from '@/ui/state/store';

describe('UI Views Coverage', () => {
  let store: Store;
  
  beforeEach(() => {
    document.body.innerHTML = `
      <select id="deckSelect"></select>
      <button id="addBtn"></button>
      <div id="quickTagList"></div>
      <div id="tagManagerOverlay"></div>
      <div id="globalTagList"></div>
      <div id="globalGroupList"></div>
      <div id="toggleTagDeleteMode"></div>
      <div id="toggleGroupDeleteMode"></div>
      <div id="meaningsList"></div>
      <div id="resultCard"></div>
      <div id="initialEmptyState"></div>
      <div id="existingWordCount"></div>
      <input id="wordInput" />
      <button id="searchBtn"></button>
      <div id="clearWordBtn"></div>
      <div id="settingsOverlay"></div>
      <div id="statusBox"></div>
      <select id="langSelect"></select>
      <select id="fontSelect"></select>
      <input id="fontSizeInput" />
      <input id="autoSearchDelayInput" />
      <button id="decreaseFont"></button>
      <button id="increaseFont"></button>
      <select id="frontSideSelect"></select>
      <select id="audioModeSelect"></select>
      <input id="autoSearchSwitch" type="checkbox" />
      <input id="showIdiomsSwitch" type="checkbox" />
      <input id="autoPosTaggingSwitch" type="checkbox" />
      <input id="hideSingularTagsSwitch" type="checkbox" />
      <button id="toggleDelayUnitBtn"></button>
    `;
    store = new Store({
        theme: 'standard', font: 'outfit', language: 'en', fontSize: 16, autoSearchDelay: 1000,
        allTags: [], tagGroups: [], deckTags: {}, selectedMeanings: new Set(),
        searchResults: [], isSearching: false, isAdding: false,
        existingIndices: new Set(), totalExistingCount: 0, currentWord: '',
        selectedGroupInManagerId: null, tagDeleteMode: false, groupDeleteMode: false,
        globalTagSearchQuery: '', globalGroupSearchQuery: '', hideExistingResults: false,
        autoSearchDelayUnit: 'ms', showIdioms: true, autoSearchEnabled: true,
        frontSideMode: 'example', audioMode: 'none', autoPosTagging: false,
        hideSingularTags: false, deckTagGroupHistory: {}, dashboardTagSearchQuery: ''
    });
  });

  it('AnkiView: should cover common methods', () => {
    const view = new AnkiView();
    view.showStatus('test', 'success');
    view.updateDecks(['Deck 1'], 'Deck 1');
    view.setAddingLoading(true);
    
    const tagSpy = vi.fn();
    const groupSpy = vi.fn();
    const autoPosSpy = vi.fn();
    view.onTagToggle = tagSpy;
    view.onGroupToggle = groupSpy;
    view.onAutoPosToggle = autoPosSpy;
    
    view.updateQuickTags({
        allTags: ['t1', 't2'],
        groups: [{id: 'g1', name: 'G1', tags: ['t1']}],
        activeTags: ['t1', 't2'],
        history: ['g1'],
        autoPosActive: true,
        hideSingular: false
    });
    
    (document.querySelector('.auto-pos-pill') as HTMLElement)?.click();
    expect(autoPosSpy).toHaveBeenCalled();

    (document.querySelector('.group-pill') as HTMLElement)?.click();
    expect(groupSpy).toHaveBeenCalledWith('g1');

    (document.querySelector('.tag-toggle-pill') as HTMLElement)?.click();
    expect(tagSpy).toHaveBeenCalledWith('t1');
  });

  it('TagManagerView: should cover common methods', () => {
    const view = new TagManagerView();
    view.showStatus('test', 'info');
    view.toggleOverlay(true);
    
    const tagSpy = vi.fn();
    view.onTagClick = tagSpy;
    view.renderTags(['t1'], { id: 'g1', name: 'G1', tags: ['t1'] }, false);
    const chip = document.querySelector('.tag-chip') as HTMLElement;
    if (chip) chip.click();
    expect(tagSpy).toHaveBeenCalledWith('t1');

    const groupSpy = vi.fn();
    view.onGroupClick = groupSpy;
    view.renderGroups([{ id: 'g1', name: 'G1', tags: [] }], 'g1', false);
    const groupItem = document.querySelector('[data-group-id]') as HTMLElement;
    if (groupItem) groupItem.click();
    expect(groupSpy).toHaveBeenCalledWith('g1');
  });

  it('ResultListView: should cover common methods', () => {
    const view = new ResultListView();
    const spy = vi.fn();
    view.onMeaningClick = spy;
    view.renderMeanings([{ word: 'test', definition: 'def', example: 'ex', pos: 'verb', type: 'normal' }], new Set([0]), new Set(), true);
    const item = document.querySelector('.meaning-item') as HTMLElement;
    if (item) item.click();
    expect(spy).toHaveBeenCalledWith(0);
  });

  it('SettingsView: should cover common methods', () => {
    const view = new SettingsView();
    view.updateSettingsUI(store.getState() as any);
    view.updateDelayUnit('sec');
  });

  it('Presenters: Branch Coverage Push', async () => {
      const mockUseCase = {
          addMeaningsToAnki: vi.fn().mockResolvedValue({ success: 1, failed: 0, exists: 0, errors: [] }),
          checkExistingMeanings: vi.fn().mockResolvedValue({ existing: new Set() }),
          getAvailableDecks: vi.fn().mockResolvedValue([]),
          saveSetting: vi.fn().mockResolvedValue(undefined),
          saveSettings: vi.fn().mockResolvedValue(undefined),
          searchWord: vi.fn().mockResolvedValue({ meanings: [], error: null })
      };
      const ankiView = new AnkiView();
      const ankiPresenter = new AnkiPresenter(mockUseCase as any, store, ankiView);
      
      await ankiPresenter.handleAddToAnki();
      store.update('lastSelectedDeck', 'Deck');
      await ankiPresenter.handleAddToAnki();
      
      const searchView = new SearchView();
      const resultView = new ResultListView();
      const searchPresenter = new SearchPresenter(mockUseCase as any, store, searchView, resultView);
      
      searchPresenter.handleToggleSelect();
      searchPresenter.handleMeaningClick(0);
      searchPresenter.handleToggleExisting();
      
      mockUseCase.addMeaningsToAnki.mockResolvedValue({ success: 0, failed: 1, exists: 0, errors: ['err'] });
      await ankiPresenter.handleAddToAnki();
  });
});
