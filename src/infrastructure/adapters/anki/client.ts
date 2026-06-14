import { registerPlugin } from '@capacitor/core';
import { AnkiNote } from '../../../domain/entities';
import { IAnkiRepository } from '../../../application/ports';

interface Deck { id: number; name: string; }

interface AnkiDroidPluginInterface {
    isAvailable(): Promise<{ available: boolean; packageName: string | null }>;
    checkPermission(): Promise<{ granted: boolean }>;
    requestPermission(): Promise<{ granted: boolean }>;
    getDecks(): Promise<{ decks: Deck[] }>;
    getBasicModelId(): Promise<{ modelId: number }>;
    getAudioModelId(): Promise<{ modelId: number }>;
    addOrGetDeck(options: { deckName: string }): Promise<{ deckId: number }>;
    findDuplicateNotes(options: { modelId: number; key: string }): Promise<{ duplicateIds: number[] }>;
    findNotes(options: { query: string }): Promise<{ noteIds: number[] }>;
    addNote(options: { deckId: number; modelId: number; fields: string[]; tags?: string }): Promise<{ success: boolean; noteId?: number; error?: string }>;
    addMedia(options: { filename: string; base64Data: string; mimeType?: string }): Promise<{ success: boolean; filename?: string }>;
}

const AnkiDroidPlugin = registerPlugin<AnkiDroidPluginInterface>('AnkiDroid');

export class AnkiDroidAdapter implements IAnkiRepository {
    private deckId: number | null = null;
    private modelId: number | null = null;
    private isAudioModel: boolean = false;
    private cachedDeckName: string = '';
    private plugin: AnkiDroidPluginInterface;

    constructor(
        /* istanbul ignore next */
        plugin: AnkiDroidPluginInterface = AnkiDroidPlugin
    ) {
        this.plugin = plugin;
    }

    async isAvailable(): Promise<boolean> {
        try { const result = await this.plugin.isAvailable(); return result.available; }
        catch { return false; }
    }

    async checkAndRequestPermission(): Promise<boolean> {
        try {
            const check = await this.plugin.checkPermission();
            if (check.granted) return true;
            const request = await this.plugin.requestPermission();
            return request.granted;
        } catch { return false; }
    }

    async getDecks(): Promise<string[]> {
        const available = await this.isAvailable();
        if (!available) return [];

        const hasPermission = await this.checkAndRequestPermission();
        if (!hasPermission) return [];

        try {
            const result = await this.plugin.getDecks();
            if (result.decks && result.decks.length > 0) return result.decks.map(d => d.name);
            return ['Default'];
        } catch { return []; }
    }

    async findNotes(query: string): Promise<number[]> {
        try {
            const result = await this.plugin.findNotes({ query });
            return result.noteIds || [];
        } catch { return []; }
    }

    async addNote(note: AnkiNote, deckName: string, audioMode: 'none' | 'native' = 'none', locale: string = 'en_us'): Promise<{ success: boolean; error: string | null }> {
        try {
            // Unified Model Policy: Always use the Audio model (5 fields) for Anki Adder notes.
            // This ensures duplication detection (via hidden plain text fields) works for all cards.
            const ids = await this.ensureDeckAndModel(deckName, true); 
            if (!ids) return { success: false, error: 'err_deck_model_create' };

            let frontField = note.front;
            let backField = note.back;
            // Only include sound tag if mode is native
            let audioTriggerField = audioMode === 'native' ? `[sound:tts_${locale.toLowerCase()}:${note.frontPlain}]` : ""; 
            let audioTriggerFieldBack = audioMode === 'native' && note.audioText && note.audioText !== note.frontPlain
                ? `[sound:tts_${locale.toLowerCase()}:${note.audioText}]`
                : "";

            // Merge both audio triggers
            const mergedAudio = [audioTriggerField, audioTriggerFieldBack].filter(Boolean).join('');

            // Always use 5 fields to match the Audio model structure
            const fields = [frontField, backField, mergedAudio, note.frontPlain, note.backPlain];

            const result = await this.plugin.addNote({
                deckId: ids.deckId, 
                modelId: ids.modelId,
                fields: fields,
                tags: note.tags.join(' ')
            });

            if (result.success) return { success: true, error: null };
            return { success: false, error: result.error || 'err_add_failed' };
        } catch (e) {
            console.error('[AnkiDroidAdapter] addNote failed:', e);
            return { success: false, error: 'err_connection' };
        }
    }

    /* istanbul ignore next */
    async getModelId(useAudio: boolean = false): Promise<number | null> {
        if (this.modelId !== null && this.isAudioModel === useAudio) return this.modelId;
        try {
            const modelResult = useAudio 
                ? await this.plugin.getAudioModelId() 
                : await this.plugin.getBasicModelId();
            this.modelId = modelResult.modelId;
            this.isAudioModel = useAudio;
            return this.modelId;
        } catch { return null; }
    }

    /* istanbul ignore next */
    private async ensureDeckAndModel(deckName: string, useAudio: boolean = false): Promise<{ deckId: number; modelId: number } | null> {
        if (this.deckId === null || this.cachedDeckName !== deckName) {
            const deckResult = await this.plugin.addOrGetDeck({ deckName });
            this.deckId = deckResult.deckId; this.cachedDeckName = deckName;
        }
        
        // Ensure we switch to correct model if needed
        if (this.modelId === null || this.isAudioModel !== useAudio) {
            this.modelId = await this.getModelId(useAudio);
        }
        
        if (this.deckId === null || this.modelId === null) return null;
        return { deckId: this.deckId, modelId: this.modelId };
    }
}
