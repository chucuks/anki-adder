import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnkiDroidAdapter } from '@/infrastructure/adapters/anki/client';
import { AnkiNote } from '@/domain/entities';

vi.mock('@capacitor/core', () => ({
  Preferences:    { get: vi.fn(), set: vi.fn(), remove: vi.fn() },
  registerPlugin: vi.fn(() => ({})),
  CapacitorHttp:  { get: vi.fn() },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────
function basePlugin() {
  return {
    isAvailable:        vi.fn().mockResolvedValue({ available: true, packageName: 'com.ichi2.anki' }),
    checkPermission:    vi.fn().mockResolvedValue({ granted: true }),
    requestPermission:  vi.fn().mockResolvedValue({ granted: true }),
    getDecks:           vi.fn().mockResolvedValue({ decks: [{ id: 1, name: 'Default' }] }),
    getBasicModelId:    vi.fn().mockResolvedValue({ modelId: 100 }),
    getAudioModelId:    vi.fn().mockResolvedValue({ modelId: 200 }),
    addOrGetDeck:       vi.fn().mockResolvedValue({ deckId: 10 }),
    findDuplicateNotes: vi.fn().mockResolvedValue({ duplicateIds: [] }),
    findNotes:          vi.fn().mockResolvedValue({ noteIds: [] }),
    addNote:            vi.fn().mockResolvedValue({ success: true, noteId: 42 }),
    addMedia:           vi.fn().mockResolvedValue({ success: true }),
  };
}

const NOTE: AnkiNote = { front: 'f', back: 'b', frontPlain: 'fp', backPlain: 'bp', tags: ['AnkiAdder'] };

// ─── AnkiDroidAdapter tests ───────────────────────────────────────────────────
describe('Infrastructure / AnkiDroidAdapter', () => {

  // ── Constructor ───────────────────────────────────────────────────────
  describe('Constructor', () => {
    it('should use default plugin if none provided', () => {
      const adapter = new AnkiDroidAdapter();
      expect(adapter).toBeDefined();
    });
  });

  // ── isAvailable ───────────────────────────────────────────────────────
  describe('isAvailable', () => {
    it('should return true when plugin says available', async () => {
      const adapter = new AnkiDroidAdapter(basePlugin() as any);
      expect(await adapter.isAvailable()).toBe(true);
    });

    it('should return false when plugin says unavailable', async () => {
      const plugin = basePlugin();
      plugin.isAvailable.mockResolvedValue({ available: false, packageName: null });
      const adapter = new AnkiDroidAdapter(plugin as any);
      expect(await adapter.isAvailable()).toBe(false);
    });

    it('should return false when plugin throws', async () => {
      const plugin = basePlugin();
      plugin.isAvailable.mockRejectedValue(new Error('crash'));
      const adapter = new AnkiDroidAdapter(plugin as any);
      expect(await adapter.isAvailable()).toBe(false);
    });
  });

  // ── checkAndRequestPermission ─────────────────────────────────────────
  describe('checkAndRequestPermission', () => {
    it('should return true if already granted', async () => {
      const adapter = new AnkiDroidAdapter(basePlugin() as any);
      expect(await adapter.checkAndRequestPermission()).toBe(true);
    });

    it('should request permission if not already granted', async () => {
      const plugin = basePlugin();
      plugin.checkPermission.mockResolvedValue({ granted: false });
      plugin.requestPermission.mockResolvedValue({ granted: true });
      const adapter = new AnkiDroidAdapter(plugin as any);
      expect(await adapter.checkAndRequestPermission()).toBe(true);
      expect(plugin.requestPermission).toHaveBeenCalled();
    });

    it('should return false if both check and request are denied', async () => {
      const plugin = basePlugin();
      plugin.checkPermission.mockResolvedValue({ granted: false });
      plugin.requestPermission.mockResolvedValue({ granted: false });
      const adapter = new AnkiDroidAdapter(plugin as any);
      expect(await adapter.checkAndRequestPermission()).toBe(false);
    });

    it('should return false when plugin throws', async () => {
      const plugin = basePlugin();
      plugin.checkPermission.mockRejectedValue(new Error('crash'));
      const adapter = new AnkiDroidAdapter(plugin as any);
      expect(await adapter.checkAndRequestPermission()).toBe(false);
    });
  });

  // ── getDecks ──────────────────────────────────────────────────────────
  describe('getDecks', () => {
    it('should return deck names when available', async () => {
      const adapter = new AnkiDroidAdapter(basePlugin() as any);
      const decks = await adapter.getDecks();
      expect(decks).toContain('Default');
    });

    it('should return empty array when Anki not available', async () => {
      const plugin = basePlugin();
      plugin.isAvailable.mockResolvedValue({ available: false, packageName: null });
      const adapter = new AnkiDroidAdapter(plugin as any);
      const decks = await adapter.getDecks();
      expect(decks).toEqual([]);
    });

    it('should return empty array when permission denied', async () => {
      const plugin = basePlugin();
      plugin.checkPermission.mockResolvedValue({ granted: false });
      plugin.requestPermission.mockResolvedValue({ granted: false });
      const adapter = new AnkiDroidAdapter(plugin as any);
      const decks = await adapter.getDecks();
      expect(decks).toEqual([]);
    });

    it('should return fallback decks when getDecks returns empty', async () => {
      const plugin = basePlugin();
      plugin.getDecks.mockResolvedValue({ decks: [] });
      const adapter = new AnkiDroidAdapter(plugin as any);
      const decks = await adapter.getDecks();
      expect(decks).toContain('Default');
    });

    it('should return empty array when getDecks throws', async () => {
      const plugin = basePlugin();
      plugin.getDecks.mockRejectedValue(new Error('crash'));
      const adapter = new AnkiDroidAdapter(plugin as any);
      const decks = await adapter.getDecks();
      expect(decks).toEqual([]);
    });
  });

  // ── findNotes ─────────────────────────────────────────────────────────
  describe('findNotes', () => {
    it('should return note IDs for a query', async () => {
      const plugin = basePlugin();
      plugin.findNotes.mockResolvedValue({ noteIds: [10, 20] });
      const adapter = new AnkiDroidAdapter(plugin as any);
      const ids = await adapter.findNotes('test query');
      expect(ids).toEqual([10, 20]);
    });

    it('should return empty array when plugin throws', async () => {
      const plugin = basePlugin();
      plugin.findNotes.mockRejectedValue(new Error('crash'));
      const adapter = new AnkiDroidAdapter(plugin as any);
      const ids = await adapter.findNotes('query');
      expect(ids).toEqual([]);
    });

    it('should return empty array when noteIds is undefined', async () => {
      const plugin = basePlugin();
      plugin.findNotes.mockResolvedValue({});
      const adapter = new AnkiDroidAdapter(plugin as any);
      const ids = await adapter.findNotes('query');
      expect(ids).toEqual([]);
    });
  });

  // ── addNote ───────────────────────────────────────────────────────────
  describe('addNote', () => {
    it('should add a basic note (no audio)', async () => {
      const plugin = basePlugin();
      const adapter = new AnkiDroidAdapter(plugin as any);
      const res = await adapter.addNote(NOTE, 'Default', 'none');
      expect(res.success).toBe(true);
      expect(res.error).toBeNull();
      // Unified Model Policy: Always 5 fields
      const call = plugin.addNote.mock.calls[0][0];
      expect(call.fields).toHaveLength(5);
    });

    it('should add an audio note with 5 fields', async () => {
      const plugin = basePlugin();
      const adapter = new AnkiDroidAdapter(plugin as any);
      const res = await adapter.addNote(NOTE, 'Default', 'native');
      expect(res.success).toBe(true);
      // Audio model: 5 fields
      const call = plugin.addNote.mock.calls[0][0];
      expect(call.fields).toHaveLength(5);
      expect(call.fields[2]).toContain('[sound:tts_en_us:fp]');
    });

    it('should include back audio when audioText differs from frontPlain', async () => {
      const plugin = basePlugin();
      const adapter = new AnkiDroidAdapter(plugin as any);
      const noteWithAudio = { ...NOTE, audioText: 'example sentence' };
      const res = await adapter.addNote(noteWithAudio, 'Default', 'native');
      expect(res.success).toBe(true);
      const call = plugin.addNote.mock.calls[0][0];
      expect(call.fields[2]).toContain('[sound:tts_en_us:fp]');
      expect(call.fields[2]).toContain('[sound:tts_en_us:example sentence]');
    });

    it('should not duplicate audio when audioText equals frontPlain', async () => {
      const plugin = basePlugin();
      const adapter = new AnkiDroidAdapter(plugin as any);
      const noteWithAudio = { ...NOTE, audioText: 'fp' };
      const res = await adapter.addNote(noteWithAudio, 'Default', 'native');
      expect(res.success).toBe(true);
      const call = plugin.addNote.mock.calls[0][0];
      // Only one TTS tag should be present in merged audio
      expect(call.fields[2].match(/\[sound:tts/g)).toHaveLength(1);
    });

    it('should return error when plugin addNote fails (line 107)', async () => {
      const plugin = basePlugin();
      plugin.addNote.mockResolvedValue({ success: false, error: 'err_add_failed' });
      const adapter = new AnkiDroidAdapter(plugin as any);
      const res = await adapter.addNote(NOTE, 'Default');
      expect(res.success).toBe(false);
      expect(res.error).toBe('err_add_failed');
    });

    it('should return fallback error text if plugin error is undefined', async () => {
      const plugin = basePlugin();
      plugin.addNote.mockResolvedValue({ success: false });
      const adapter = new AnkiDroidAdapter(plugin as any);
      const res = await adapter.addNote(NOTE, 'Default');
      expect(res.error).toBe('err_add_failed');
    });

    it('should pass tags as a space-separated string', async () => {
      const plugin = basePlugin();
      const adapter = new AnkiDroidAdapter(plugin as any);
      const noteWithTags = { ...NOTE, tags: ['tag1', 'tag2', 'tag3'] };
      await adapter.addNote(noteWithTags, 'Default', 'none');
      const call = plugin.addNote.mock.calls[0][0];
      expect(typeof call.tags).toBe('string');
      expect(call.tags).toBe('tag1 tag2 tag3');
    });

    it('should return error when plugin throws in addNote', async () => {
      const plugin = basePlugin();
      plugin.addOrGetDeck.mockRejectedValue(new Error('deck error'));
      const adapter = new AnkiDroidAdapter(plugin as any);
      const res = await adapter.addNote(NOTE, 'Default', 'none');
      expect(res.success).toBe(false);
      expect(res.error).toBe('err_connection');
    });

    it('should return error when ensureDeckAndModel returns null (modelId null)', async () => {
      const plugin = basePlugin();
      // Unified model policy always asks for Audio model (true)
      plugin.getAudioModelId.mockRejectedValue(new Error('no model'));
      const adapter = new AnkiDroidAdapter(plugin as any);
      const res = await adapter.addNote(NOTE, 'Default', 'none');
      expect(res.success).toBe(false);
      expect(res.error).toBe('err_deck_model_create');
    });
  });

  // ── getModelId ────────────────────────────────────────────────────────
  describe('getModelId', () => {
    it('should return basic model ID', async () => {
      const adapter = new AnkiDroidAdapter(basePlugin() as any);
      const id = await adapter.getModelId(false);
      expect(id).toBe(100);
    });

    it('should return audio model ID', async () => {
      const adapter = new AnkiDroidAdapter(basePlugin() as any);
      const id = await adapter.getModelId(true);
      expect(id).toBe(200);
    });

    it('should return cached model when same audioMode', async () => {
      const plugin = basePlugin();
      const adapter = new AnkiDroidAdapter(plugin as any);
      await adapter.getModelId(false);
      await adapter.getModelId(false);
      // Should only call once due to caching
      expect(plugin.getBasicModelId).toHaveBeenCalledTimes(1);
    });

    it('should re-fetch when audioMode changes', async () => {
      const plugin = basePlugin();
      const adapter = new AnkiDroidAdapter(plugin as any);
      await adapter.getModelId(false);
      await adapter.getModelId(true);
      expect(plugin.getBasicModelId).toHaveBeenCalledTimes(1);
      expect(plugin.getAudioModelId).toHaveBeenCalledTimes(1);
    });

    it('should return null when plugin throws (line 119)', async () => {
      const plugin = basePlugin();
      plugin.getBasicModelId.mockRejectedValue(new Error('crash'));
      const adapter = new AnkiDroidAdapter(plugin as any);
      const id = await adapter.getModelId(false);
      expect(id).toBeNull();
    });
  });

  // ── ensureDeckAndModel (private, tested via addNote) ──────────────────
  describe('ensureDeckAndModel (via addNote caching)', () => {
    it('should reuse cached deck on second call to addNote', async () => {
      const plugin = basePlugin();
      const adapter = new AnkiDroidAdapter(plugin as any);
      await adapter.addNote(NOTE, 'Default');
      await adapter.addNote(NOTE, 'Default');
      // addOrGetDeck called only once due to caching
      expect(plugin.addOrGetDeck).toHaveBeenCalledTimes(1);
    });

    it('should re-fetch deck when deck name changes', async () => {
      const plugin = basePlugin();
      const adapter = new AnkiDroidAdapter(plugin as any);
      await adapter.addNote(NOTE, 'Default');
      await adapter.addNote(NOTE, 'English');
      expect(plugin.addOrGetDeck).toHaveBeenCalledTimes(2);
    });

    it('should switch models when audio mode changes between calls', async () => {
      const plugin = basePlugin();
      const adapter = new AnkiDroidAdapter(plugin as any);
      // First call (audio: none)
      await adapter.addNote(NOTE, 'Default', 'none');
      // Second call (audio: native)
      await adapter.addNote(NOTE, 'Default', 'native');
      
      // In Unified policy, it always asks for Audio model (true)
      // Since it's the same useAudio=true, caching will skip the second getAudioModelId call
      expect(plugin.getAudioModelId).toHaveBeenCalledTimes(1);
    });
  });
});
