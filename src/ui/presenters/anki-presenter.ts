import { AddMeaningsResult, VocabularyUseCase } from '../../application/use-cases';
import { Store, AppState } from '../state/store';
import { IAnkiView } from './view-interfaces';
import { TagGroup } from '../../domain/entities';

const QUICK_TAG_KEYS: (keyof AppState)[] = ['allTags', 'tagGroups', 'deckTags', 'deckSelectedGroupIds', 'lastSelectedDeck', 'autoPosTagging', 'hideSingularTags', 'deckTagGroupHistory', 'dashboardTagSearchQuery'];

export class AnkiPresenter {
    private lastDecksJson: string = '';
    private deckUpdateInterval: ReturnType<typeof setInterval> | null = null;
    private unsubscribers: (() => void)[] = [];

    constructor(
        private readonly useCase: VocabularyUseCase,
        private readonly store: Store,
        private readonly view: IAnkiView
    ) {
        this.setupSubscriptions();
    }

    dispose(): void {
        this.unsubscribers.forEach(fn => fn());
        this.unsubscribers = [];
        if (this.deckUpdateInterval) {
            clearInterval(this.deckUpdateInterval);
            this.deckUpdateInterval = null;
        }
        document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }

    private onVisibilityChange = () => {
        /* istanbul ignore next — jsdom always has visibilityState='visible' */
        if (document.visibilityState === 'visible') this.loadDecks();
    };

    /* istanbul ignore next */
    private setupSubscriptions() {
        this.unsubscribers.push(
            ...QUICK_TAG_KEYS.map(key =>
                this.store.subscribe(key, () => this.updateQuickTags(), false)
            ),
            this.store.subscribe('isAdding', (loading) => this.view.setAddingLoading(loading)),
            this.store.subscribe('language', (lang) => {
                this.view.setLanguage(lang);
                this.view.applyTranslations();
                this.updateQuickTags();
            })
        );
        this.updateQuickTags();
    }

    /* istanbul ignore next */
    private updateQuickTags() {
        const state = this.store.getState();
        this.view.updateQuickTags({
            allTags: state.allTags,
            groups: state.tagGroups,
            activeTags: state.deckTags[state.lastSelectedDeck || ''] || [],
            history: state.deckTagGroupHistory?.[state.lastSelectedDeck || ''] || [],
            autoPosActive: state.autoPosTagging,
            hideSingular: state.hideSingularTags,
            searchQuery: state.dashboardTagSearchQuery
        });
    }

    /* istanbul ignore next */
    async handleAddToAnki() {
        const state = this.store.getState();
        if (state.isAdding) return;
        if (state.selectedMeanings.size === 0) {
            this.view.showStatus('no_selection', 'error');
            return;
        }

        const selMeanings = Array.from(state.selectedMeanings)
            .filter(idx => !state.existingIndices.has(idx))
            .map(idx => state.searchResults[idx]);

        if (selMeanings.length === 0) {
            this.view.showStatus('all_already_exists', 'info');
            return;
        }

        const deckName = state.lastSelectedDeck;
        if (!deckName) {
            this.view.showStatus('select_deck_first', 'error');
            return;
        }

        this.store.update('isAdding', true);
        this.view.showStatus('adding', 'info');

        try {
            const result = await this.useCase.addMeaningsToAnki(selMeanings, deckName);
            const freshState = this.store.getState();
            
            if (result.success > 0) {
                await this.updateDeckHistory(deckName);
            }

            const { existing } = await this.useCase.checkExistingMeanings(freshState.searchResults, deckName);
            
            const newSelected = new Set(freshState.selectedMeanings);
            existing.forEach(idx => newSelected.delete(idx));

            this.store.updateMany({
                existingIndices: existing,
                selectedMeanings: newSelected
            });

            this.reportResult(result);
        } catch (e) {
            /* istanbul ignore next */
            console.error(e);
            /* istanbul ignore next */
            this.view.showStatus('error_occurred', 'error');
        } finally {
            this.store.update('isAdding', false);
        }
    }

    private async updateDeckHistory(deckName: string) {
        const state = this.store.getState();
        const activeGroupIds = state.deckSelectedGroupIds?.[deckName] || [];

        if (activeGroupIds.length > 0) {
            const history = { ...state.deckTagGroupHistory };
            if (!history[deckName]) history[deckName] = [];
            
            history[deckName] = [
                ...activeGroupIds,
                ...history[deckName].filter(id => !activeGroupIds.includes(id))
            ];

            await this.useCase.saveSetting('deckTagGroupHistory', history);
            this.store.update('deckTagGroupHistory', history);
        }
    }

    private reportResult(result: AddMeaningsResult) {
        /* istanbul ignore next */
        const params = {
            success: String(result.success),
            exists: String(result.exists),
            failed: String(result.failed)
        };
        if (result.success > 0 && result.failed === 0) {
            const msg = result.exists > 0 ? 'success_with_exists' : (result.success === 1 ? 'success_msg_singular' : 'success_msg');
            this.view.showStatus(msg, 'success', params);
        } else if (result.success > 0) {
            this.view.showStatus('success_partial', 'info', params);
        } else if (result.exists > 0) {
            this.view.showStatus('all_already_exists', 'info');
        } else {
            this.view.showStatus(result.errors[0] || 'error_occurred', 'error');
        }
    }

    async loadDecks() {
        try {
            const decks = await this.useCase.getAvailableDecks();
            const decksJson = JSON.stringify(decks);
            
            if (decksJson !== this.lastDecksJson) {
                this.lastDecksJson = decksJson;
                this.view.updateDecks(decks, this.store.getState().lastSelectedDeck);
            }
        } catch (e) {
            /* istanbul ignore next */
            console.error(e);
        }
    }

    startAutoUpdate() {
        if (this.deckUpdateInterval) clearInterval(this.deckUpdateInterval);
        this.deckUpdateInterval = setInterval(() => this.loadDecks(), 5000);
        document.addEventListener('visibilitychange', this.onVisibilityChange);
    }

    private calculateSelectedGroupIds(activeTags: string[], allGroups: TagGroup[]): string[] {
        const tagSet = new Set(activeTags.map(t => t.toLowerCase().trim()));
        return allGroups
            .filter(g => g.tags.length > 0 && g.tags.every((t: string) => tagSet.has(t.toLowerCase().trim())))
            .map(g => g.id);
    }

    async handleTagToggle(tag: string) {
        const state = this.store.getState();
        const deck = state.lastSelectedDeck;
        if (!deck) return;

        const newDeckTags = { ...state.deckTags };
        if (!newDeckTags[deck]) newDeckTags[deck] = [];
        
        const tagLower = tag.toLowerCase().trim();
        const existingIdx = newDeckTags[deck].findIndex(t => t.toLowerCase().trim() === tagLower);
        
        if (existingIdx === -1) {
            newDeckTags[deck].push(tag);
        } else {
            newDeckTags[deck].splice(existingIdx, 1);
        }

        const newSelectedGroupIds = this.calculateSelectedGroupIds(newDeckTags[deck], state.tagGroups);
        const deckSelectedGroupIds = { ...state.deckSelectedGroupIds || {}, [deck]: newSelectedGroupIds };

        await this.useCase.saveSettings({
            deckTags: newDeckTags,
            deckSelectedGroupIds: deckSelectedGroupIds
        });

        this.store.updateMany({
            deckTags: newDeckTags,
            deckSelectedGroupIds: deckSelectedGroupIds
        });
    }

    async handleGroupToggle(groupId: string) {
        const state = this.store.getState();
        const deck = state.lastSelectedDeck;
        if (!deck) return;

        const group = state.tagGroups.find(g => g.id === groupId);
        if (!group) return;

        const newDeckTags = { ...state.deckTags };
        if (!newDeckTags[deck]) newDeckTags[deck] = [];

        const currentTagsLower = new Set(newDeckTags[deck].map(t => t.toLowerCase().trim()));
        const isFull = group.tags.length > 0 && group.tags.every(t => currentTagsLower.has(t.toLowerCase().trim()));

        if (isFull) {
            // Turning OFF: Remove tags of this group 
            // EXCEPT those that belong to OTHER groups that are also currently FULL
            // AND are NOT nested with the current group (neither subset nor superset).
            const groupTagsLower = new Set(group.tags.map(t => t.toLowerCase().trim()));
            const allGroups = state.tagGroups;
            
            const otherActiveGroups = allGroups.filter(g => {
                if (g.id === groupId) return false;
                
                const otherTagsLower = new Set(g.tags.map(t => t.toLowerCase().trim()));
                const isOtherFull = g.tags.length > 0 && g.tags.every(t => currentTagsLower.has(t.toLowerCase().trim()));
                if (!isOtherFull) return false;

                // Nesting Check: Only protect if NOT a subset and NOT a superset
                const isSubset = g.tags.every(t => groupTagsLower.has(t.toLowerCase().trim()));
                const isSuperset = group.tags.every(t => otherTagsLower.has(t.toLowerCase().trim()));
                
                return !isSubset && !isSuperset;
            });

            const tagsToKeep = new Set(otherActiveGroups.flatMap(g => g.tags.map(t => t.toLowerCase().trim())));

            newDeckTags[deck] = newDeckTags[deck].filter(t => {
                const lowerT = t.toLowerCase().trim();
                return !groupTagsLower.has(lowerT) || tagsToKeep.has(lowerT);
            });
        } else {
            // Turning ON / Completing: Add missing tags
            group.tags.forEach(t => {
                if (!currentTagsLower.has(t.toLowerCase().trim())) {
                    newDeckTags[deck].push(t);
                }
            });
        }

        const newSelectedGroupIds = this.calculateSelectedGroupIds(newDeckTags[deck], state.tagGroups);
        const deckSelectedGroupIds = { ...state.deckSelectedGroupIds || {}, [deck]: newSelectedGroupIds };

        await this.useCase.saveSettings({
            deckTags: newDeckTags,
            deckSelectedGroupIds: deckSelectedGroupIds
        });

        this.store.updateMany({
            deckTags: newDeckTags,
            deckSelectedGroupIds: deckSelectedGroupIds
        });
        
        await this.updateDeckHistory(deck);
    }

    async handleAutoPosToggle() {
        const state = this.store.getState();
        const newVal = !state.autoPosTagging;
        await this.useCase.saveSetting('autoPosTagging', newVal);
        this.store.update('autoPosTagging', newVal);
    }
}
