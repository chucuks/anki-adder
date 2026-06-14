import { VocabularyUseCase } from '../../application/use-cases';
import { Store, AppState } from '../state/store';
import { ITagManagerView } from './view-interfaces';

const TAG_MANAGER_KEYS: (keyof AppState)[] = ['allTags', 'tagGroups', 'selectedGroupInManagerId', 'tagDeleteMode', 'groupDeleteMode', 'globalTagSearchQuery', 'globalGroupSearchQuery'];

export class TagManagerPresenter {
    private unsubscribers: (() => void)[] = [];

    constructor(
        private readonly useCase: VocabularyUseCase,
        private readonly store: Store,
        private readonly view: ITagManagerView
    ) {
        this.setupSubscriptions();
    }

    dispose(): void {
        this.unsubscribers.forEach(fn => fn());
        this.unsubscribers = [];
    }

    /* istanbul ignore next */
    private setupSubscriptions() {
        this.unsubscribers.push(
            ...TAG_MANAGER_KEYS.map(key =>
                this.store.subscribe(key, () => this.render(), false)
            ),
            this.store.subscribe('language', (lang) => {
                this.view.setLanguage(lang);
                this.view.applyTranslations();
                this.render();
            }, false)
        );
        this.render();
    }

    async addTag(name: string) {
        if (!name.trim()) return;

        const state = this.store.getState();
        const newTags = name.split(/[,\s]+/)
            .map(t => t.trim().replace(/[^\p{L}\p{N}_-]/gu, '_'))
            .filter(t => t.length > 0)
            .map(t => t.length > 32 ? t.substring(0, 32) : t);

        const currentTags = [...state.allTags];
        let added = false;

        newTags.forEach(tag => {
            if (!currentTags.some(t => t.toLowerCase() === tag.toLowerCase())) {
                currentTags.push(tag);
                added = true;
            }
        });

        if (added) {
            await this.useCase.saveSetting('allTags', currentTags);
            this.store.update('allTags', currentTags);
        }
    }

    async addGroup(name: string) {
        const groupName = name.trim().substring(0, 32);
        const state = this.store.getState();

        if (!groupName || state.tagGroups.some(g => g.name.toLowerCase() === groupName.toLowerCase())) return;

        const newGroup = {
            id: crypto.randomUUID(),
            name: groupName,
            tags: []
        };

        const newGroups = [...state.tagGroups, newGroup];
        await this.useCase.saveSetting('tagGroups', newGroups);
        this.store.update('tagGroups', newGroups);
    }

    async deleteTag(tag: string) {
        const state = this.store.getState();
        const tagLower = tag.toLowerCase();
        const newAllTags = state.allTags.filter(t => t.toLowerCase() !== tagLower);
        const newGroups = state.tagGroups.map(g => ({ ...g, tags: g.tags.filter(t => t.toLowerCase() !== tagLower) }));
        const newDeckTags = { ...state.deckTags };
        
        Object.keys(newDeckTags).forEach(d => {
            newDeckTags[d] = newDeckTags[d].filter(t => t.toLowerCase() !== tagLower);
        });

        await this.useCase.saveSettings({
            allTags: newAllTags,
            tagGroups: newGroups,
            deckTags: newDeckTags
        });

        this.store.updateMany({
            allTags: newAllTags,
            tagGroups: newGroups,
            deckTags: newDeckTags
        });
    }

    async deleteGroup(id: string) {
        const state = this.store.getState();
        const newGroups = state.tagGroups.filter(g => g.id !== id);
        const updates: Partial<AppState> = { tagGroups: newGroups };
        
        if (state.selectedGroupInManagerId === id) {
            updates.selectedGroupInManagerId = null;
        }

        await this.useCase.saveSetting('tagGroups', newGroups);
        this.store.updateMany(updates);
    }

    /* istanbul ignore next */
    async toggleTagInGroup(groupId: string, tag: string) {
        const state = this.store.getState();
        const newGroups = state.tagGroups.map(g => {
            if (g.id !== groupId) return g;
            const tags = [...g.tags];
            const idx = tags.indexOf(tag);
            if (idx === -1) tags.push(tag);
            else tags.splice(idx, 1);
            return { ...g, tags };
        });

        await this.useCase.saveSetting('tagGroups', newGroups);
        this.store.update('tagGroups', newGroups);
    }

    toggleTagDeleteMode() {
        const current = this.store.getState().tagDeleteMode;
        this.store.update('tagDeleteMode', !current);
    }

    toggleGroupDeleteMode() {
        const current = this.store.getState().groupDeleteMode;
        this.store.update('groupDeleteMode', !current);
    }

    selectGroup(id: string | null) {
        const current = this.store.getState().selectedGroupInManagerId;
        this.store.update('selectedGroupInManagerId', current === id ? null : id);
    }

    searchTags(query: string) {
        this.store.update('globalTagSearchQuery', query);
    }

    searchGroups(query: string) {
        this.store.update('globalGroupSearchQuery', query);
    }

    /* istanbul ignore next */
    render() {
        const state = this.store.getState();
        const selectedGroup = state.selectedGroupInManagerId ? state.tagGroups.find(g => g.id === state.selectedGroupInManagerId) : null;

        this.view.renderTags(state.allTags, selectedGroup || null, state.tagDeleteMode, state.globalTagSearchQuery);
        this.view.renderGroups(state.tagGroups, state.selectedGroupInManagerId, state.groupDeleteMode, state.globalGroupSearchQuery);
        this.view.updateDeleteModes(state.tagDeleteMode, state.groupDeleteMode);
    }

    open() {
        this.view.toggleOverlay(true);
        this.render();
    }
}
