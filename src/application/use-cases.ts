import { WordMeaning, AppSettings, AnkiNote } from '../domain/entities';
import { IScraperRepository, IAnkiRepository, ISettingsRepository, INoteFormatter } from './ports';

export type WordDataResult = { meanings: WordMeaning[]; error: string | null };
export type AddMeaningsResult = { success: number; failed: number; exists: number; errors: string[] };
export type ExistingResult = { existing: Set<number>; totalExistingCount: number };

export class VocabularyUseCase {
    constructor(
        private scraper: IScraperRepository,
        private anki: IAnkiRepository,
        private settings: ISettingsRepository,
        private formatter: INoteFormatter
    ) { }

    async searchWord(word: string): Promise<WordDataResult> {
        if (!word || !word.trim()) return { meanings: [], error: 'err_empty_word' };
        const normalized = word.trim().toLowerCase();
        return this.scraper.getWordData(normalized);
    }

    private escapeAnkiQuery(text: string): string {
        return text
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\*/g, '\\*')
            .replace(/_/g, '\\_')
            .replace(/:/g, '\\:')
            .replace(/\(/g, '\\(')
            .replace(/\)/g, '\\)')
            .trim();
    }

    private buildDuplicateQuery(wordOrIdiom: string, definition: string, deckName?: string): string {
        const escapedWord = this.escapeAnkiQuery(wordOrIdiom);
        const deckFilter = deckName ? `deck:"${this.escapeAnkiQuery(deckName)}" ` : '';
        const defLines = definition
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => `"${this.escapeAnkiQuery(line)}"`);
        return `${deckFilter}note:"Anki Adder*" "${escapedWord}" ${defLines.join(' ')}`;
    }

    async addMeaningsToAnki(meanings: WordMeaning[], deckName: string): Promise<AddMeaningsResult> {
        if (!deckName) return { success: 0, failed: meanings.length, exists: 0, errors: ['err_deck_not_selected'] };
        const settings = await this.settings.getSettings();

        const [isAvailable, hasPermission] = await Promise.all([
            this.anki.isAvailable(),
            this.anki.checkAndRequestPermission()
        ]);
        if (!isAvailable) return { success: 0, failed: meanings.length, exists: 0, errors: ['err_anki_not_available'] };
        if (!hasPermission) return { success: 0, failed: meanings.length, exists: 0, errors: ['err_no_permission'] };

        let success = 0, failed = 0, exists = 0;
        const errors: string[] = [];
        const CONCURRENCY = 3;

        for (let i = 0; i < meanings.length; i += CONCURRENCY) {
            const batch = meanings.slice(i, i + CONCURRENCY);
            const results = await Promise.all(batch.map(async (m) => {
                try {
                    if (!m || !m.definition) return { type: 'skip' as const };
                    const wordOrIdiom = m.idiomText ?? m.word;
                    if (!wordOrIdiom) return { type: 'skip' as const };

                    const def = m.definition.trim();
                    if (!def) return { type: 'skip' as const };

                    const query = this.buildDuplicateQuery(wordOrIdiom, def, deckName);
                    const notes = await this.anki.findNotes(query);

                    if (notes.length > 0) return { type: 'exists' as const };

                    const note = this.formatter.format(m, {
                        frontSideMode: settings.frontSideMode,
                        autoPosTagging: settings.autoPosTagging,
                        tags: settings.deckTags?.[deckName] || []
                    });

                    const result = await this.anki.addNote(note, deckName, settings.audioMode, settings.language);
                    if (result.success) return { type: 'success' as const };
                    return { type: 'failed' as const, error: result.error || 'err_add_failed' };
                } catch (e) {
                    console.error('[addMeaningsToAnki] Failed:', e);
                    return { type: 'failed' as const, error: 'err_add_failed' };
                }
            }));

            for (const r of results) {
                if (r.type === 'success') success++;
                else if (r.type === 'exists') exists++;
                else if (r.type === 'failed') { failed++; errors.push(r.error); }
            }
        }

        return { success, failed, exists, errors };
    }

    async checkExistingMeanings(meanings: WordMeaning[], deckName?: string): Promise<ExistingResult> {
        const existing = new Set<number>();
        const CONCURRENCY = 5;

        for (let i = 0; i < meanings.length; i += CONCURRENCY) {
            const batch = meanings.slice(i, i + CONCURRENCY);
            const results = await Promise.all(batch.map(async (m, batchIdx) => {
                try {
                    const idx = i + batchIdx;
                    const def = m.definition.trim();
                    if (!def) return { i: idx, exists: false };

                    const query = this.buildDuplicateQuery(m.idiomText ?? m.word, def, deckName);
                    const notes = await this.anki.findNotes(query);
                    return { i: idx, exists: notes.length > 0 };
                } catch (e) {
                    console.error('[checkExistingMeanings] Failed:', e);
                    return { i: i + batchIdx, exists: false };
                }
            }));

            for (const r of results) {
                if (r.exists) existing.add(r.i);
            }
        }

        return { existing, totalExistingCount: existing.size };
    }

    async countExistingCards(word: string, deckName?: string): Promise<number> {
        if (!word) return 0;
        const escapedWord = this.escapeAnkiQuery(word);
        const deckFilter = deckName ? `deck:"${this.escapeAnkiQuery(deckName)}" ` : '';
        const query = word.includes(' ') ? `${deckFilter}"${escapedWord}"` : `${deckFilter}${escapedWord}`;
        const results = await this.anki.findNotes(query);
        return results ? results.length : 0;
    }

    async getSettings(): Promise<AppSettings> { return this.settings.getSettings(); }
    async saveSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> { await this.settings.saveSetting(key, value); }
    async saveSettings(updates: Partial<AppSettings>): Promise<void> { await this.settings.saveSettings(updates); }
    async getAvailableDecks(): Promise<string[]> { return this.anki.getDecks(); }
}
