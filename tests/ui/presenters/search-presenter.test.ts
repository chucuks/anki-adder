import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchPresenter } from '@/ui/presenters/search-presenter';
import { Store } from '@/ui/state/store';
import { ISearchView, IResultListView } from '@/ui/presenters/view-interfaces';

describe('UI / Presenters / SearchPresenter', () => {
    let presenter: SearchPresenter;
    let mockUseCase: any;
    let store: Store;
    let mockView: ISearchView;
    let mockResultView: IResultListView;

    const initialState: any = {
        theme: 'standard', language: 'en',
        autoSearchEnabled: true, autoSearchDelay: 100,
        lastSelectedDeck: 'Default',
        isSearching: false,
        searchResults: [],
        selectedMeanings: new Set(),
        currentWord: '',
        existingIndices: new Set(),
        showIdioms: true,
        hideExistingResults: false
    };

    beforeEach(() => {
        mockUseCase = {
            searchWord: vi.fn().mockResolvedValue({ meanings: [{ id: 1, word: 'test' }], error: null }),
            checkExistingMeanings: vi.fn().mockResolvedValue({ existing: new Set() })
        };
        store = new Store(initialState);
        mockView = {
            showStatus: vi.fn(),
            setSearchLoading: vi.fn(),
            clearResults: vi.fn(),
            getWordInput: vi.fn().mockReturnValue('test'),
            setWordInput: vi.fn(),
            applyTranslations: vi.fn(),
            toggleResultVisibility: vi.fn(),
            updateClearButton: vi.fn(),
            setLanguage: vi.fn()
        };
        mockResultView = {
            showStatus: vi.fn(),
            applyTranslations: vi.fn(),
            renderMeanings: vi.fn(),
            showExistingHint: vi.fn(),
            updateSelectButton: vi.fn(),
            toggleExistingBadgeActive: vi.fn(),
            setHideExistingClass: vi.fn(),
            setLanguage: vi.fn()
        };
        presenter = new SearchPresenter(mockUseCase as any, store, mockView, mockResultView);
    });

    it('should perform search and handle errors', async () => {
        await presenter.handleSearch();
        expect(store.getState().searchResults).toHaveLength(1);
        expect(mockResultView.renderMeanings).toHaveBeenCalled();

        mockUseCase.searchWord.mockResolvedValue({ meanings: [], error: 'err_not_found' });
        await presenter.handleSearch(true);
        expect(mockView.showStatus).toHaveBeenCalledWith('err_not_found', 'error');
    });

    it('should handle auto-search delays', async () => {
        vi.useFakeTimers();
        presenter.handleAutoSearch();
        vi.advanceTimersByTime(100);
        expect(mockUseCase.searchWord).toHaveBeenCalled();
        vi.useRealTimers();
    });

    it('should handle selection toggles', () => {
        store.update('searchResults', [
            { word: 'test1', definition: 'def1', example: 'ex1', pos: 'noun', type: 'normal' },
            { word: 'test2', definition: 'def2', example: 'ex2', pos: 'verb', type: 'normal' }
        ]);
        presenter.handleToggleSelect();
        expect(store.getState().selectedMeanings.size).toBe(2);

        // Call again to deselect all (line 127 branch)
        presenter.handleToggleSelect();
        expect(store.getState().selectedMeanings.size).toBe(0);

        presenter.handleMeaningClick(0);
        expect(store.getState().selectedMeanings.has(0)).toBe(true);
        presenter.handleMeaningClick(0);
        expect(store.getState().selectedMeanings.has(0)).toBe(false); // toggled off
    });

    it('should handle input variations', async () => {
        (mockView.getWordInput as any).mockReturnValue('');
        await presenter.handleSearch();
        expect(mockView.clearResults).toHaveBeenCalled();
    });

    it('should dispose and clear timeout', () => {
        presenter.dispose();
    });

    it('should handle search with undefined word input', async () => {
        (mockView.getWordInput as any).mockReturnValue('   ');
        await presenter.handleSearch();
        expect(mockView.clearResults).toHaveBeenCalled();
    });

    it('should clear autoSearchTimeout in dispose (L23-24)', () => {
        vi.useFakeTimers();
        presenter.handleAutoSearch();
        presenter.dispose();
        vi.useRealTimers();
    });

    it('should show existing count respecting showIdioms filter', async () => {
        mockUseCase.checkExistingMeanings.mockResolvedValue({ existing: new Set([0, 2]) });
        mockUseCase.searchWord.mockResolvedValue({
            meanings: [
                { word: 'test', definition: 'def1', example: 'ex1', pos: 'noun', type: 'normal' },
                { word: 'test', definition: 'def2', example: 'ex2', pos: 'verb', type: 'normal' },
                { word: 'test', definition: 'def3', example: 'ex3', pos: 'idiom', type: 'idiom', idiomText: 'test idiom' }
            ],
            error: null
        });

        store.update('showIdioms', false);
        await presenter.handleSearch(true);

        const lastCallArg = mockResultView.showExistingHint.mock.lastCall?.[0];
        expect(lastCallArg).toBe(1);
    });

    it('should include idioms in existing count when showIdioms is true', async () => {
        mockUseCase.checkExistingMeanings.mockResolvedValue({ existing: new Set([0, 2]) });
        mockUseCase.searchWord.mockResolvedValue({
            meanings: [
                { word: 'test', definition: 'def1', example: 'ex1', pos: 'noun', type: 'normal' },
                { word: 'test', definition: 'def2', example: 'ex2', pos: 'verb', type: 'normal' },
                { word: 'test', definition: 'def3', example: 'ex3', pos: 'idiom', type: 'idiom', idiomText: 'test idiom' }
            ],
            error: null
        });

        store.update('showIdioms', true);
        await presenter.handleSearch(true);

        const lastCallArg = mockResultView.showExistingHint.mock.lastCall?.[0];
        expect(lastCallArg).toBe(2);
    });

    it('should handle null searchResults safely', () => {
        store.update('searchResults', null as any);
        expect(mockResultView.showExistingHint.mock.lastCall?.[0]).toBe(0);
    });

    it('should handle out-of-bounds existing indices', () => {
        store.update('searchResults', [
            { word: 'a', definition: 'd', example: 'e', pos: 'n', type: 'normal' }
        ]);
        store.update('existingIndices', new Set([0, 5]));
        store.update('showIdioms', false);
        const lastCallArg = mockResultView.showExistingHint.mock.lastCall?.[0];
        expect(lastCallArg).toBe(2);
    });
});
