export interface WordMeaning {
    word: string;
    definition: string;
    example: string;
    pos: string;
    type: 'normal' | 'idiom';
    idiomText?: string;
}

export type ThemeType = 'standard' | 'light' | 'midnight' | 'solarized' | 'dracula' | 'forest';
export type FontType = 'outfit' | 'inter' | 'roboto' | 'serif' | 'montserrat' | 'poppins';
export type Language = 'tr' | 'en' | 'es' | 'de' | 'fr' | 'it' | 'pt' | 'ru' | 'zh' | 'hi' | 'ar' | 'bn' | 'ja' | 'ko' | 'id' | 'vi' | 'ur' | 'th' | 'mr' | 'te' | 'ta' | 'pcm' | 'yue' | 'tl' | 'wuu' | 'fa' | 'ha' | 'sw' | 'jv' | 'pa' | 'kn' | 'gu' | 'am' | 'bho' | 'nan' | 'cjy' | 'yo' | 'hak' | 'my' | 'om' | 'ps' | 'mai' | 'uk' | 'su' | 'pl' | 'uz' | 'sd' | 'ml' | 'az' | 'ro' | 'nl' | 'ku';

export interface AppSettings {
    theme: ThemeType;
    font: FontType;
    fontSize: number; // Precisely in pixels
    language: Language;
    showIdioms: boolean;
    audioMode: 'none' | 'native';
    autoSearchEnabled: boolean;
    autoSearchDelay: number;
    lastSelectedDeck?: string;
    frontSideMode: 'example' | 'word';
    allTags: string[];
    tagGroups: TagGroup[];
    deckTags: Record<string, string[]>;
    deckManualTags?: Record<string, string[]>;
    deckSelectedGroupIds?: Record<string, string[]>;
    deckTagGroupHistory?: Record<string, string[]>;
    autoPosTagging: boolean;
    hideSingularTags: boolean;
    autoSearchDelayUnit: 'ms' | 'sec';
    hideExistingResults: boolean;
}

export interface TagGroup {
    id: string;
    name: string;
    tags: string[];
}

export const DEFAULT_SETTINGS = Object.freeze({
    theme: 'standard' as ThemeType,
    font: 'outfit' as FontType,
    fontSize: 16,
    language: 'en' as Language,
    showIdioms: true,
    audioMode: 'native' as 'none' | 'native',
    autoSearchEnabled: true,
    autoSearchDelay: 1000,
    frontSideMode: 'example' as 'example' | 'word',
    allTags: [] as string[],
    tagGroups: [] as TagGroup[],
    deckTags: {} as Record<string, string[]>,
    deckManualTags: {} as Record<string, string[]>,
    deckSelectedGroupIds: {} as Record<string, string[]>,
    deckTagGroupHistory: {} as Record<string, string[]>,
    autoPosTagging: true,
    hideSingularTags: false,
    autoSearchDelayUnit: 'ms' as 'ms' | 'sec',
    hideExistingResults: false,
} satisfies AppSettings);

export interface AnkiNote {
    front: string;
    back: string;
    frontPlain: string;
    backPlain: string;
    tags: string[];
    audioText?: string;
}
