import { VocabularyUseCase } from '../../application/use-cases';
import { Store } from '../state/store';
import { ISearchView, IResultListView } from './view-interfaces';

export class SearchPresenter {
    private autoSearchTimeout: ReturnType<typeof setTimeout> | null = null;
    private lastSearchedWord: string = '';
    private unsubscribers: (() => void)[] = [];

    constructor(
        private readonly useCase: VocabularyUseCase,
        private readonly store: Store,
        private readonly view: ISearchView,
        private readonly resultView: IResultListView
    ) {
        this.setupSubscriptions();
    }

    dispose(): void {
        this.unsubscribers.forEach(fn => fn());
        this.unsubscribers = [];
        if (this.autoSearchTimeout) {
            clearTimeout(this.autoSearchTimeout);
            this.autoSearchTimeout = null;
        }
    }

    /* istanbul ignore next */
    private setupSubscriptions() {
        this.unsubscribers.push(
            this.store.subscribe('selectedMeanings', () => {
                this.renderResults();
            }),
            this.store.subscribe('searchResults', () => this.renderResults()),
            this.store.subscribe('showIdioms', () => this.renderResults()),
            this.store.subscribe('language', () => this.renderResults()),
            this.store.subscribe('isSearching', (loading) => this.view.setSearchLoading(loading)),
            this.store.subscribe('existingIndices', () => this.resultView.showExistingHint(this.computeVisibleExistingCount())),
            this.store.subscribe('hideExistingResults', (hide) => {
                this.resultView.toggleExistingBadgeActive(hide);
                this.resultView.setHideExistingClass(hide);
            }),
            this.store.subscribe('language', (lang) => {
                this.resultView.setLanguage(lang);
            }, false),
            this.store.subscribe('lastSelectedDeck', async (deckName) => {
                try {
                    const state = this.store.getState();
                    if (state.searchResults.length > 0) {
                        const { existing } = await this.useCase.checkExistingMeanings(state.searchResults, deckName);
                        this.store.update('existingIndices', existing);
                    }
                } catch (e) {
                    console.error('[SearchPresenter] checkExistingMeanings failed on deck change:', e);
                }
            })
        );
        this.renderResults();
    }

    /* istanbul ignore next */
    private renderResults() {
        const state = this.store.getState();
        const results = state.searchResults || [];
        const hasResults = results.length > 0;
        
        this.view.toggleResultVisibility(hasResults);
        this.resultView.renderMeanings(results, state.selectedMeanings, state.existingIndices, state.showIdioms);
        this.resultView.updateSelectButton(results.length > 0 && state.selectedMeanings.size === results.length, state.language);
        this.resultView.showExistingHint(this.computeVisibleExistingCount());
    }

    private computeVisibleExistingCount(): number {
        const state = this.store.getState();
        if (!state.searchResults.length) return 0;
        if (state.showIdioms) return state.existingIndices.size;
        return [...state.existingIndices].filter(i => state.searchResults[i]?.type !== 'idiom').length;
    }

    /* istanbul ignore next */
    async handleSearch(force = false) {
        const state = this.store.getState();
        if (state.isSearching || state.isAdding) return;
        if (this.autoSearchTimeout) clearTimeout(this.autoSearchTimeout);

        const word = this.view.getWordInput().trim();
        
        if (!word) {
            this.clearSearch();
            return;
        }

        if (!force && word.toLowerCase() === this.lastSearchedWord.toLowerCase()) return;

        this.lastSearchedWord = word;
        this.store.updateMany({ isSearching: true, currentWord: word });
        this.view.showStatus('searching', 'info');

        try {
            const { meanings, error } = await this.useCase.searchWord(word);

            if (error) {
                this.view.showStatus(error, 'error');
                this.store.updateMany({
                    searchResults: [],
                    selectedMeanings: new Set()
                });
                return;
            }

            const { existing } = await this.useCase.checkExistingMeanings(meanings, state.lastSelectedDeck);

            this.store.updateMany({
                searchResults: meanings,
                existingIndices: existing,
                selectedMeanings: new Set()
            });

        } catch (err) {
            this.lastSearchedWord = '';
            console.error(err);
            this.view.showStatus('error_occurred', 'error');
        } finally {
            this.store.update('isSearching', false);
        }
    }

    /* istanbul ignore next */
    handleAutoSearch() {
        if (this.autoSearchTimeout) clearTimeout(this.autoSearchTimeout);
        const state = this.store.getState();
        if (!state.autoSearchEnabled) return;

        const word = this.view.getWordInput().trim();
        if (!word || word === this.lastSearchedWord) return;

        const delay = state.autoSearchDelayUnit === 'sec' ? state.autoSearchDelay * 1000 : state.autoSearchDelay;
        this.autoSearchTimeout = setTimeout(() => this.handleSearch(), delay);
    }

    handleMeaningClick(idx: number) {
        const state = this.store.getState();
        const selected = new Set(state.selectedMeanings);
        if (selected.has(idx)) selected.delete(idx);
        else selected.add(idx);
        this.store.update('selectedMeanings', selected);
    }

    handleToggleSelect() {
        const state = this.store.getState();
        const results = state.searchResults;
        const isAllSelected = results.length > 0 && state.selectedMeanings.size === results.length;
        if (isAllSelected) this.store.update('selectedMeanings', new Set());
        else this.store.update('selectedMeanings', new Set(results.map((_, i) => i)));
    }

    handleToggleExisting() {
        const current = this.store.getState().hideExistingResults;
        const newVal = !current;
        this.store.update('hideExistingResults', newVal);
        this.useCase.saveSetting('hideExistingResults', newVal);
    }

    clearSearch() {
        this.lastSearchedWord = '';
        this.view.setWordInput('');
        this.store.updateMany({
            searchResults: [],
            selectedMeanings: new Set(),
            currentWord: ''
        });
        this.view.clearResults();
    }
}
