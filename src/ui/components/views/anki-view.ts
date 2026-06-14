import { BaseComponent } from '../base-component';
import { IAnkiView } from '../../presenters/view-interfaces';
import { TagGroup } from '../../../domain/entities';

export class AnkiView extends BaseComponent implements IAnkiView {
    private elements: {
        deckSelect: HTMLSelectElement | null;
        tagSearchInput: HTMLInputElement | null;
        addBtn: HTMLButtonElement | null;
        quickTagList: HTMLElement | null;
    };

    onTagToggle?: (tag: string) => void;
    onGroupToggle?: (id: string) => void;
    onAutoPosToggle?: () => void;
    onSearchChange?: (query: string) => void;
    onDeckChange?: (deckName: string) => void;

    constructor() {
        super();
        this.elements = {
            deckSelect: this.getEl('deckSelect'),
            tagSearchInput: this.getEl('tagSearchInput'),
            addBtn: this.getEl('addBtn'),
            quickTagList: this.getEl('quickTagList')
        };

        if (this.elements.deckSelect) {
            const onChange = () => {
                this.onDeckChange?.(this.elements.deckSelect!.value);
            };
            this.elements.deckSelect.addEventListener('change', onChange);
            this.cleanup(() => this.elements.deckSelect?.removeEventListener('change', onChange));
        }
        if (this.elements.tagSearchInput) {
            const onInput = () => {
                this.onSearchChange?.(this.elements.tagSearchInput?.value || '');
            };
            this.elements.tagSearchInput.addEventListener('input', onInput);
            this.cleanup(() => this.elements.tagSearchInput?.removeEventListener('input', onInput));
        }
    }

    dispose(): void {
        this.cleanAll();
    }

    updateDecks(decks: string[], selectedDeck?: string): void {
        const select = this.elements.deckSelect;
        if (!select) return;

        const currentVal = selectedDeck || select.value;
        select.innerHTML = `<option value="" disabled ${!currentVal ? 'selected' : ''} hidden>${this.t('deck_placeholder')}</option>`;
        
        decks.forEach(deck => {
            const opt = document.createElement('option');
            opt.value = deck;
            opt.textContent = deck;
            if (deck === currentVal) opt.selected = true;
            select.appendChild(opt);
        });
    }

    setAddingLoading(loading: boolean): void {
        const btn = this.elements.addBtn;
        if (!btn) return;
        btn.disabled = loading;
        btn.textContent = loading ? this.t('adding') : this.t('add_to_anki');
    }

    updateQuickTags(data: {
        allTags: string[];
        groups: TagGroup[];
        activeTags: string[];
        history: string[];
        autoPosActive: boolean;
        hideSingular: boolean;
        searchQuery?: string;
    }): void {
        const list = this.elements.quickTagList;
        if (!list) return;

        const fragment = document.createDocumentFragment();
        const query = (data.searchQuery || '').toLowerCase().trim();

        // Sort groups: Alphabetical by name
        const sortedGroups = [...data.groups].sort((a, b) => a.name.localeCompare(b.name));

        // Normalize active tags for faster case-insensitive lookup
        const normalizedActiveTags = new Set(data.activeTags.map(t => t.toLowerCase().trim()));

        // Calculate active groups (deprecated auto-selection logic removed)
        // Groups are now ONLY selected if explicitly clicked (present in activeGroupIds)

        const autoPosBtn = document.createElement('div');
        autoPosBtn.className = `tag-pill auto-pos-pill ${data.autoPosActive ? 'active' : ''}`;
        autoPosBtn.innerHTML = '✨';
        this.makeInteractive(autoPosBtn, () => this.onAutoPosToggle?.());
        fragment.appendChild(autoPosBtn);

        sortedGroups.forEach(group => {
            const matches = !query || 
                group.name.toLowerCase().includes(query) || 
                group.tags.some(t => t.toLowerCase().includes(query));
            
            if (!matches) return;

            // Calculate state
            const groupTagsLower = group.tags.map(t => t.toLowerCase().trim());
            const matchingCount = groupTagsLower.filter(t => normalizedActiveTags.has(t)).length;
            
            const pill = document.createElement('div');
            pill.className = 'tag-pill group-pill';
            
            if (matchingCount === group.tags.length && group.tags.length > 0) {
                pill.classList.add('active');
            } else if (matchingCount > 0) {
                pill.classList.add('partial-active');
            }
            
            pill.textContent = group.name;
            this.makeInteractive(pill, () => this.onGroupToggle?.(group.id));
            fragment.appendChild(pill);
        });

        // Individual Tags (All tags, but prioritized by selection)
        if (!data.hideSingular) {
            const individualTags = [...data.allTags].sort((a, b) => {
                const aActive = normalizedActiveTags.has(a.toLowerCase().trim());
                const bActive = normalizedActiveTags.has(b.toLowerCase().trim());
                if (aActive !== bActive) return aActive ? -1 : 1;
                return a.localeCompare(b);
            });

            individualTags.forEach(tag => {
                const matches = !query || tag.toLowerCase().includes(query);
                if (!matches) return;

                const isActive = normalizedActiveTags.has(tag.toLowerCase().trim());
                
                // Optional: If you want to hide tags that are part of an active group to save space
                // But user asked to color them and move to left, which implies they should be visible.
                // If it's part of an active group, it's already "active" and will be on the left.

                const pill = document.createElement('div');
                pill.className = `tag-pill tag-toggle-pill ${isActive ? 'active' : ''}`;
                pill.textContent = tag;
                this.makeInteractive(pill, () => this.onTagToggle?.(tag));
                fragment.appendChild(pill);
            });
        }

        list.innerHTML = '';
        list.appendChild(fragment);
    }

    render(): void {
        // Events are bound in constructor
    }
}
