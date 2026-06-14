import { WordMeaning, TagGroup, Language, ThemeType, FontType, AppSettings } from '../../domain/entities';

export interface IBaseView {
    showStatus(message: string, type: 'success' | 'error' | 'info', params?: Record<string, string>): void;
    setLanguage(lang: Language): void;
    applyTranslations(): void;
}

export interface ISearchView extends IBaseView {
    setSearchLoading(loading: boolean): void;
    clearResults(): void;
    getWordInput(): string;
    setWordInput(word: string): void;
    updateClearButton(word: string): void;
    toggleResultVisibility(hasResults: boolean): void;
}

export interface IResultListView extends IBaseView {
    renderMeanings(meanings: WordMeaning[], selectedIndices: Set<number>, existingIndices: Set<number>, showIdioms: boolean): void;
    showExistingHint(count: number): void;
    updateSelectButton(allSelected: boolean, lang: Language): void;
    toggleExistingBadgeActive(active: boolean): void;
    setHideExistingClass(hide: boolean): void;
    onMeaningClick?: (index: number) => void;
}

export interface ISettingsView extends IBaseView {
    toggleOverlay(open: boolean): void;
    updateSettingsUI(settings: Pick<AppSettings, 'theme' | 'font' | 'fontSize' | 'language' | 'showIdioms' | 'audioMode' | 'autoSearchEnabled' | 'autoSearchDelay' | 'frontSideMode' | 'autoPosTagging' | 'hideSingularTags'>): void;
    updateDelayUnit(unit: string): void;
    onSettingChange?: (key: keyof AppSettings, value: string | boolean | number) => void;
}

export interface ITagManagerView extends IBaseView {
    onTagClick: (tag: string) => void;
    onGroupClick: (id: string) => void;
    toggleOverlay: (open: boolean) => void;
    renderTags: (tags: string[], selectedGroup: TagGroup | null, deleteMode: boolean, query?: string) => void;
    renderGroups: (groups: TagGroup[], selectedGroupId: string | null, deleteMode: boolean, query?: string) => void;
    updateDeleteModes(tagDeleteMode: boolean, groupDeleteMode: boolean): void;
}

export interface IAnkiView extends IBaseView {
    updateDecks(decks: string[], selectedDeck?: string): void;
    setAddingLoading(loading: boolean): void;
    updateQuickTags(data: {
        allTags: string[];
        groups: TagGroup[];
        activeTags: string[];
        history: string[];
        autoPosActive: boolean;
        hideSingular: boolean;
        searchQuery?: string;
    }): void;
    onTagToggle?: (tag: string) => void;
    onGroupToggle?: (id: string) => void;
    onAutoPosToggle?: () => void;
}
