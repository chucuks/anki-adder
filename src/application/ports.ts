import { WordMeaning, AppSettings, AnkiNote } from '../domain/entities';

export interface IScraperRepository {
    getWordData(word: string): Promise<{ meanings: WordMeaning[]; error: string | null }>;
}

export interface IAnkiRepository {
    isAvailable(): Promise<boolean>;
    checkAndRequestPermission(): Promise<boolean>;
    getDecks(): Promise<string[]>;
    findNotes(query: string): Promise<number[]>;
    addNote(note: AnkiNote, deckName: string, audioMode?: 'none' | 'native', locale?: string): Promise<{ success: boolean; error: string | null }>;
}

export interface ISettingsRepository {
    getSettings(): Promise<AppSettings>;
    saveSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void>;
    saveSettings(updates: Partial<AppSettings>): Promise<void>;
}

export interface INoteFormatter {
    format(meaning: WordMeaning, options: { frontSideMode: 'example' | 'word', autoPosTagging: boolean, tags: string[] }): AnkiNote;
}
