import { BaseComponent } from '../base-component';
import { ISearchView } from '../../presenters/view-interfaces';

export class SearchView extends BaseComponent implements ISearchView {
    private elements: {
        statusBox: HTMLElement | null;
        searchBtn: HTMLButtonElement | null;
        wordInput: HTMLInputElement | null;
        clearWordBtn: HTMLElement | null;
        meaningsList: HTMLElement | null;
        resultCard: HTMLElement | null;
        initialEmptyState: HTMLElement | null;
    };

    onSearch?: () => void;
    onClear?: () => void;
    onInput?: () => void;
    onToggleSelect?: () => void;
    onToggleExisting?: () => void;

    constructor() {
        super();
        this.elements = {
            statusBox: this.getEl('statusBox'),
            searchBtn: this.getEl('searchBtn'),
            wordInput: this.getEl('wordInput'),
            clearWordBtn: this.getEl('clearWordBtn'),
            meaningsList: this.getEl('meaningsList'),
            resultCard: this.getEl('resultCard'),
            initialEmptyState: this.getEl('initialEmptyState')
        };
    }

    dispose(): void {
        this.cleanAll();
    }

    setSearchLoading(loading: boolean): void {
        if (this.elements.searchBtn) this.elements.searchBtn.disabled = loading;
        if (this.elements.wordInput) this.elements.wordInput.disabled = loading;
        const container = this.elements.searchBtn?.closest('.search-container');
        if (container) {
            container.classList.toggle('loading', loading);
        }
    }

    clearResults(): void {
        if (this.elements.meaningsList) this.elements.meaningsList.innerHTML = '';
        this.elements.resultCard?.classList.add('hidden');
        this.elements.initialEmptyState?.classList.remove('hidden');
    }

    getWordInput(): string {
        /* istanbul ignore next */
        return this.elements.wordInput?.value || '';
    }

    setWordInput(word: string): void {
        /* istanbul ignore next */
        if (this.elements.wordInput) {
            this.elements.wordInput.value = word;
            this.updateClearButton(word);
        }
    }

    updateClearButton(word: string): void {
        if (this.elements.clearWordBtn) {
            this.elements.clearWordBtn.classList.toggle('hidden', !word);
        }
    }

    toggleResultVisibility(hasResults: boolean): void {
        this.elements.resultCard?.classList.toggle('hidden', !hasResults);
        this.elements.initialEmptyState?.classList.toggle('hidden', hasResults);
    }

    render(): void {
        if (this.elements.wordInput) {
            const onKeydown = (e: KeyboardEvent) => {
                if (e.key === 'Enter') this.onSearch?.();
            };
            this.elements.wordInput.addEventListener('keydown', onKeydown);
            this.cleanup(() => this.elements.wordInput?.removeEventListener('keydown', onKeydown));

            const onInput = () => {
                this.updateClearButton(this.elements.wordInput!.value);
                this.onInput?.();
            };
            this.elements.wordInput.addEventListener('input', onInput);
            this.cleanup(() => this.elements.wordInput?.removeEventListener('input', onInput));
        }
        if (this.elements.searchBtn) {
            this.makeInteractive(this.elements.searchBtn, () => this.onSearch?.());
        }
        if (this.elements.clearWordBtn) {
            this.makeInteractive(this.elements.clearWordBtn, () => this.onClear?.());
        }
    }
}
