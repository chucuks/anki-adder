import { Store, AppState } from '../state/store';
import { VocabularyUseCase } from '../../application/use-cases';
import { SearchPresenter } from '../presenters/search-presenter';
import { SettingsPresenter } from '../presenters/settings-presenter';
import { TagManagerPresenter } from '../presenters/tag-manager-presenter';
import { AnkiPresenter } from '../presenters/anki-presenter';
import { AppSettings, DEFAULT_SETTINGS } from '../../domain/entities';

import { SearchView } from '../components/views/search-view';
import { ResultListView } from '../components/views/result-list-view';
import { SettingsView } from '../components/views/settings-view';
import { TagManagerView } from '../components/views/tag-manager-view';
import { AnkiView } from '../components/views/anki-view';

import { ThemeService } from '../services/theme-service';
import { makeInteractive } from '../components/base-component';

export class AppController {
    private store: Store | null = null;
    private themeService: ThemeService | null = null;
    private cleanups: (() => void)[] = [];
    
    private searchPresenter: SearchPresenter | null = null;
    private settingsPresenter: SettingsPresenter | null = null;
    private tagPresenter: TagManagerPresenter | null = null;
    private ankiPresenter: AnkiPresenter | null = null;

    private searchView: SearchView | null = null;
    private resultListView: ResultListView | null = null;
    private settingsView: SettingsView | null = null;
    private tagView: TagManagerView | null = null;
    private ankiView: AnkiView | null = null;

    constructor(private readonly useCase: VocabularyUseCase) {}

    private createInitialState(settings?: AppSettings): AppState {
        const merged: Partial<AppSettings> = {};
        if (settings) {
            for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof AppSettings)[]) {
                if (settings[key] !== undefined) merged[key] = settings[key] as never;
            }
        }
        return {
            ...DEFAULT_SETTINGS,
            ...merged,
            selectedMeanings: new Set<number>(),
            searchResults: [],
            highlightedExamples: [],
            isSearching: false,
            isAdding: false,
            existingIndices: new Set<number>(),
            totalExistingCount: 0,
            currentWord: '',
            selectedGroupInManagerId: null,
            tagDeleteMode: false,
            groupDeleteMode: false,
            globalTagSearchQuery: '',
            globalGroupSearchQuery: '',
            dashboardTagSearchQuery: ''
        };
    }

    async init() {
        try {
            const settings = await this.useCase.getSettings();
            this.store = new Store(this.createInitialState(settings));
        } catch (e) {
            console.error('[AppController] Failed to load settings, using defaults:', e);
            this.store = new Store(this.createInitialState());
        }

        this.searchView = new SearchView();
        this.resultListView = new ResultListView();
        this.settingsView = new SettingsView();
        this.tagView = new TagManagerView();
        this.ankiView = new AnkiView();

        this.themeService = new ThemeService(this.store);
        
        this.searchPresenter = new SearchPresenter(this.useCase, this.store, this.searchView, this.resultListView);
        this.settingsPresenter = new SettingsPresenter(this.useCase, this.store, this.settingsView);
        this.tagPresenter = new TagManagerPresenter(this.useCase, this.store, this.tagView);
        this.ankiPresenter = new AnkiPresenter(this.useCase, this.store, this.ankiView);

        this.setupEventBindings();

        try { await this.settingsPresenter.loadInitialSettings(); } catch (e) {
            console.error('[AppController] loadInitialSettings failed:', e);
            this.searchView?.showStatus('error_occurred', 'error');
        }
        this.ankiPresenter.startAutoUpdate();

        this.settingsView.render();
        this.tagView.render();
        this.ankiView.render();
        this.searchView.render();
        this.resultListView.render();

        await this.ankiPresenter.loadDecks();
    }

    dispose() {
        this.ankiPresenter?.dispose();
        this.searchPresenter?.dispose();
        this.settingsPresenter?.dispose();
        this.tagPresenter?.dispose();
        this.themeService?.dispose();
        this.searchView?.dispose();
        this.ankiView?.dispose();
        this.cleanups.forEach(fn => fn());
        this.cleanups = [];
    }

    private setupEventBindings() {
        this.searchView!.onSearch = () => this.searchPresenter!.handleSearch(true);
        this.searchView!.onClear = () => this.searchPresenter!.clearSearch();
        this.searchView!.onInput = () => this.searchPresenter!.handleAutoSearch();
        this.resultListView!.onMeaningClick = (idx) => this.searchPresenter!.handleMeaningClick(idx);
        this.settingsView!.onSettingChange = (key, val) => this.settingsPresenter!.handleSettingChange(key, val);

        this.tagView!.onTagClick = (tag) => {
            const state = this.store!.getState();
            if (state.tagDeleteMode) this.tagPresenter!.deleteTag(tag);
            else if (state.selectedGroupInManagerId) this.tagPresenter!.toggleTagInGroup(state.selectedGroupInManagerId, tag);
        };
        this.tagView!.onGroupClick = (id) => {
            const state = this.store!.getState();
            if (state.groupDeleteMode) {
                if (window.confirm(this.tagView!.t('confirm_delete'))) {
                    this.tagPresenter!.deleteGroup(id);
                }
            }
            else this.tagPresenter!.selectGroup(id);
        };

        this.ankiView!.onTagToggle = (tag) => this.ankiPresenter!.handleTagToggle(tag);
        this.ankiView!.onGroupToggle = (id) => this.ankiPresenter!.handleGroupToggle(id);
        this.ankiView!.onAutoPosToggle = () => this.ankiPresenter!.handleAutoPosToggle();
        this.ankiView!.onSearchChange = (query) => this.store!.update('dashboardTagSearchQuery', query);
        this.ankiView!.onDeckChange = (deckName) => {
            this.store!.update('lastSelectedDeck', deckName);
            this.useCase.saveSetting('lastSelectedDeck', deckName);
        };

        const bindClick = (id: string, fn: () => void) => {
            const el = document.getElementById(id);
            if (!el) return;
            makeInteractive(el, fn);
            this.cleanups.push(() => el.removeEventListener('click', fn));
        };

        bindClick('addBtn', () => this.ankiPresenter!.handleAddToAnki());
        bindClick('settingsBtn', () => this.settingsPresenter!.toggleSettings(true));
        bindClick('closeSettings', () => this.settingsPresenter!.toggleSettings(false));
        bindClick('openTagManager', () => this.tagPresenter!.open());
        bindClick('closeTagManager', () => this.tagView!.toggleOverlay(false));
        bindClick('addTagBtn', this.handleAddTagClick.bind(this));
        bindClick('addGroupBtn', this.handleAddGroupClick.bind(this));
        bindClick('toggleTagDeleteMode', () => this.tagPresenter!.toggleTagDeleteMode());
        bindClick('toggleGroupDeleteMode', () => this.tagPresenter!.toggleGroupDeleteMode());
        bindClick('toggleSelectBtn', () => this.searchPresenter!.handleToggleSelect());
        bindClick('toggleDelayUnitBtn', () => this.settingsPresenter!.toggleDelayUnit());
        bindClick('existingWordCount', () => this.searchPresenter!.handleToggleExisting());

        const tagInput = document.getElementById('newTagName') as HTMLInputElement | null;
        if (tagInput) {
            const onTagInput = () => this.tagPresenter!.searchTags(tagInput.value);
            tagInput.addEventListener('input', onTagInput);
            this.cleanups.push(() => tagInput.removeEventListener('input', onTagInput));
        }
        const groupInput = document.getElementById('newGroupName') as HTMLInputElement | null;
        if (groupInput) {
            const onGroupInput = () => this.tagPresenter!.searchGroups(groupInput.value);
            groupInput.addEventListener('input', onGroupInput);
            this.cleanups.push(() => groupInput.removeEventListener('input', onGroupInput));
        }
    }

    private handleAddTagClick() {
        const newTagName = document.getElementById('newTagName') as HTMLInputElement;
        if (newTagName) {
            this.tagPresenter!.addTag(newTagName.value);
            newTagName.value = '';
            this.tagPresenter!.searchTags('');
        }
    }

    private handleAddGroupClick() {
        const newGroupName = document.getElementById('newGroupName') as HTMLInputElement;
        if (newGroupName) {
            this.tagPresenter!.addGroup(newGroupName.value);
            newGroupName.value = '';
            this.tagPresenter!.searchGroups('');
        }
    }

    async handleSharedText(text: string): Promise<void> {
        if (!text) return;
        this.searchView!.setWordInput(text.trim());
        await this.searchPresenter!.handleSearch(true);
    }
}
