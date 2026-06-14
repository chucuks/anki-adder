import { AnkiNote } from '../../../domain/entities';
import { IAnkiRepository } from '../../../application/ports';

interface StoredNoteEntry {
    id: number;
    note: AnkiNote;
    deckName: string;
}

function unescapeQueryTerm(text: string): string {
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/\\\\/g, '\\')
        .replace(/\\"/g, '"')
        .replace(/\\\*/g, '*')
        .replace(/\\_/g, '_')
        .replace(/\\:/g, ':')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')');
}

function safeLocalStorage(): Storage | null {
    try {
        return typeof localStorage !== 'undefined' ? localStorage : null;
    } catch {
        return null;
    }
}

export class BrowserAnkiAdapter implements IAnkiRepository {
    private storageKey = 'browser_anki_notes';
    private idCounterKey = 'browser_anki_id_counter';

    async isAvailable(): Promise<boolean> {
        return true;
    }

    async checkAndRequestPermission(): Promise<boolean> {
        return true;
    }

    async getDecks(): Promise<string[]> {
        return ['Default', 'English', 'Vocabulary', 'Mock Deck'];
    }

    async findNotes(query: string): Promise<number[]> {
        const entries = this.getEntries();

        let deckFilter: string | null = null;
        const contentTerms: string[] = [];

        const regex = /(\w+):"([^"]*)"|"([^"]*)"|(\S+)/g;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(query)) !== null) {
            if (match[1] && match[2] !== undefined) {
                const prefix = match[1];
                const value = match[2];
                if (prefix === 'deck') {
                    deckFilter = value;
                }
            } else if (match[3] !== undefined) {
                const term = unescapeQueryTerm(match[3]);
                if (!term.startsWith('Anki Adder') && !term.startsWith('deck:')) {
                    contentTerms.push(term);
                }
            } else {
                /* istanbul ignore if — regex always captures one of groups 1, 3, or 4 */
                if (match[4] !== undefined) {
                    const term = unescapeQueryTerm(match[4]);
                    if (!term.startsWith('Anki Adder') && !term.startsWith('deck:')) {
                        contentTerms.push(term);
                    }
                }
            }
        }

        let result = entries;

        if (deckFilter !== null) {
            result = result.filter(e => e.deckName === deckFilter);
        }

        if (contentTerms.length > 0) {
            result = result.filter(e => {
                return contentTerms.every(term => {
                    const termLower = term.toLowerCase();
                    const frontLower = (e.note.front || '').toLowerCase();
                    const backPlainLower = (e.note.backPlain || '').toLowerCase();
                    return frontLower.includes(termLower) || backPlainLower.includes(termLower);
                });
            });
        }

        return result.map(e => e.id);
    }

    async addNote(note: AnkiNote, deckName: string, _audioMode?: string, _locale?: string): Promise<{ success: boolean; error: string | null }> {
        const entries = this.getEntries();
        const id = this.nextId();

        let audioTrigger = '';
        if (_audioMode === 'native' && note.frontPlain) {
            /* istanbul ignore next — template literal coverage quirk */
            audioTrigger = `[sound:tts_${(_locale || 'en_us').toLowerCase()}:${note.frontPlain}]`;
        }

        let backAudio = '';
        if (_audioMode === 'native' && note.audioText && note.audioText !== note.frontPlain) {
            /* istanbul ignore next — template literal coverage quirk */
            backAudio = `[sound:tts_${(_locale || 'en_us').toLowerCase()}:${note.audioText}]`;
        }

        let audioBack = note.back;
        const frontAudio = audioTrigger || backAudio;
        if (frontAudio) {
            audioBack = note.back + '\n' + (backAudio || audioTrigger);
        }

        const augmentedNote: AnkiNote = {
            ...note,
            back: audioBack,
        };

        entries.push({ id, note: augmentedNote, deckName });
        this.saveEntries(entries);

        return { success: true, error: null };
    }

    private getEntries(): StoredNoteEntry[] {
        const store = safeLocalStorage();
        if (!store) return [];
        try {
            const stored = store.getItem(this.storageKey);
            if (!stored) return [];
            const parsed = JSON.parse(stored);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    private saveEntries(entries: StoredNoteEntry[]): void {
        const store = safeLocalStorage();
        if (!store) return;
        try {
            store.setItem(this.storageKey, JSON.stringify(entries));
        } catch {
            // silently ignore
        }
    }

    private nextId(): number {
        const store = safeLocalStorage();
        if (!store) return Date.now();
        try {
            const raw = store.getItem(this.idCounterKey);
            const current = raw ? parseInt(raw, 10) : 0;
            const next = isNaN(current) ? 1 : current + 1;
            store.setItem(this.idCounterKey, String(next));
            return next;
        } catch {
            return Date.now();
        }
    }
}
