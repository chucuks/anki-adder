import { BaseComponent } from '../base-component';
import { IResultListView } from '../../presenters/view-interfaces';
import { WordMeaning, Language } from '../../../domain/entities';
import { HighlightingService } from '../../../domain/services';

export class ResultListView extends BaseComponent implements IResultListView {
    private elements: {
        meaningsList: HTMLElement | null;
        existingWordCount: HTMLElement | null;
        toggleSelectBtn: HTMLElement | null;
    };

    onMeaningClick?: (index: number) => void;

    constructor() {
        super();
        this.elements = {
            meaningsList: this.getEl('meaningsList'),
            existingWordCount: this.getEl('existingWordCount'),
            toggleSelectBtn: this.getEl('toggleSelectBtn')
        };
    }

    renderMeanings(meanings: WordMeaning[], selectedIndices: Set<number>, existingIndices: Set<number>, showIdioms: boolean, highlightedExamples?: string[]): void {
        if (!this.elements.meaningsList) return;

        if (meanings.length === 0) {
            this.elements.meaningsList.innerHTML = `<div class="empty-state">${this.t('no_meaning')}</div>`;
            return;
        }

        // Sort: existing first (to group status), non-existing after. Also: normal type before idiom type.
        const sorted = meanings.map((m, i) => ({ m, i })).sort((a, b) => {
            const aExists = existingIndices.has(a.i);
            const bExists = existingIndices.has(b.i);
            if (aExists !== bExists) return aExists ? -1 : 1;
            
            const aIsIdiom = a.m.type === 'idiom';
            const bIsIdiom = b.m.type === 'idiom';
            if (aIsIdiom !== bIsIdiom) return aIsIdiom ? 1 : -1;
            
            return a.i - b.i;
        });

        const fragment = document.createDocumentFragment();
        sorted.forEach(({ m, i }) => {
            if (m.type === 'idiom' && !showIdioms) return;

            try {
                const item = document.createElement('div');
                item.className = 'meaning-item';
                item.setAttribute('data-index', i.toString());
                if (selectedIndices.has(i)) item.classList.add('selected');
                if (existingIndices.has(i)) item.classList.add('existing');

                const posClass = m.pos.toLowerCase().replace(/[^a-z\s-]/g, '').replace(/\s+/g, '-');
                const highlightedExample = highlightedExamples?.[i] ?? HighlightingService.getHighlightedExample(m);

                item.innerHTML = `
                    <div class="meaning-header">
                        ${m.type === 'idiom' ? 
                            `<span class="pos-badge idiom">${this.escapeHTML(m.idiomText || 'IDIOM')}</span>` : 
                            `<span class="pos-badge ${posClass}">${this.escapeHTML(m.pos)}</span>`
                        }
                    </div>
                    <div class="definition">${this.escapeHTML(m.definition).replace(/\n/g, '<br>')}</div>
                    ${highlightedExample ? `<div class="example-text">${highlightedExample}</div>` : ''}
                    ${existingIndices.has(i) ? `<div class="already-added">${this.t('exists')}</div>` : ''}
                `;

                this.makeInteractive(item, () => this.onMeaningClick?.(i));
                fragment.appendChild(item);
            } catch (e) {
                console.error('[ResultListView] Failed to render meaning item', i, e);
                const fallback = document.createElement('div');
                fallback.className = 'meaning-item';
                fallback.setAttribute('data-index', i.toString());
                fallback.innerHTML = `<div class="definition">${this.escapeHTML(m?.definition || '?')}</div>`;
                fragment.appendChild(fallback);
            }
        });

        this.elements.meaningsList.innerHTML = '';
        this.elements.meaningsList.appendChild(fragment);
    }

    showExistingHint(count: number): void {
        const badge = this.elements.existingWordCount;
        if (!badge) return;
        
        if (count > 0) {
            badge.classList.remove('hidden');
            badge.textContent = `${count} ${this.t(count === 1 ? 'cards_exist_singular' : 'cards_exist')}`;
        } else {
            badge.classList.add('hidden');
        }
    }

    updateSelectButton(allSelected: boolean, lang: Language): void {
        const btn = this.elements.toggleSelectBtn;
        if (!btn) return;
        this.setLanguage(lang);
        btn.textContent = this.t(allSelected ? 'deselect_all' : 'select_all');
    }

    toggleExistingBadgeActive(active: boolean): void {
        this.elements.existingWordCount?.classList.toggle('active', active);
    }

    setHideExistingClass(hide: boolean): void {
        this.elements.meaningsList?.classList.toggle('hide-existing', hide);
    }

    render(): void {
        // Initial render logic
    }
}
