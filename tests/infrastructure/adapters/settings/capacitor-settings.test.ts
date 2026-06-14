import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CapacitorSettingsAdapter } from '@/infrastructure/adapters/settings/capacitor-settings';
import { Preferences } from '@capacitor/preferences';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn().mockResolvedValue(undefined)
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────
function mockPreferences(values: Record<string, string | null>) {
  (Preferences.get as any).mockImplementation(({ key }: { key: string }) => {
    if (key === 'settings_config') {
      const consolidated = values['settings_config'] ?? null;
      return Promise.resolve({ value: consolidated });
    }
    const suffix = key.replace('settings_', '');
    const value = values[suffix] ?? null;
    return Promise.resolve({ value });
  });
}

// ─── CapacitorSettingsAdapter tests ──────────────────────────────────────────
describe('Infrastructure / CapacitorSettingsAdapter', () => {
  let adapter: CapacitorSettingsAdapter;

  beforeEach(() => {
    adapter = new CapacitorSettingsAdapter();
    vi.clearAllMocks();
  });

  // ── getSettings defaults ──────────────────────────────────────────────
  describe('getSettings - defaults', () => {
    it('should return default settings when all preferences are null', async () => {
      (Preferences.get as any).mockResolvedValue({ value: null });
      const s = await adapter.getSettings();
      expect(s.theme).toBe('standard');
      expect(s.font).toBe('outfit');
      expect(s.fontSize).toBe(16);
      expect(s.language).toBe('en');
      expect(s.showIdioms).toBe(true);
      expect(s.audioMode).toBe('native');
      expect(s.autoSearchEnabled).toBe(true);
      expect(s.autoSearchDelay).toBe(1000);
      expect(s.lastSelectedDeck).toBeUndefined();
      expect(s.autoPosTagging).toBe(true);
      expect(s.hideSingularTags).toBe(false);
    });
  });

  // ── getSettings with stored values ───────────────────────────────────
  describe('getSettings - stored values', () => {
    it('should parse and return stored theme', async () => {
      mockPreferences({ theme: 'midnight' });
      const s = await adapter.getSettings();
      expect(s.theme).toBe('midnight');
    });

    it('should parse and return stored font', async () => {
      mockPreferences({ font: 'inter' });
      const s = await adapter.getSettings();
      expect(s.font).toBe('inter');
    });

    it('should parse numeric fontSize', async () => {
      mockPreferences({ fontSize: '24' });
      const s = await adapter.getSettings();
      expect(s.fontSize).toBe(24);
    });

    it('should parse stored language', async () => {
      mockPreferences({ language: 'tr' });
      const s = await adapter.getSettings();
      expect(s.language).toBe('tr');
    });

    it('should parse showIdioms = false', async () => {
      mockPreferences({ showIdioms: 'false' });
      const s = await adapter.getSettings();
      expect(s.showIdioms).toBe(false);
    });

    it('should parse autoSearchEnabled = false', async () => {
      mockPreferences({ autoSearchEnabled: 'false' });
      const s = await adapter.getSettings();
      expect(s.autoSearchEnabled).toBe(false);
    });

    it('should parse autoSearchDelay numeric value (line 31)', async () => {
      mockPreferences({ autoSearchDelay: '2000' });
      const s = await adapter.getSettings();
      expect(s.autoSearchDelay).toBe(2000);
    });

    it('should parse lastSelectedDeck', async () => {
      mockPreferences({ lastSelectedDeck: 'English' });
      const s = await adapter.getSettings();
      expect(s.lastSelectedDeck).toBe('English');
    });

    it('should return undefined for lastSelectedDeck when null', async () => {
      (Preferences.get as any).mockResolvedValue({ value: null });
      const s = await adapter.getSettings();
      expect(s.lastSelectedDeck).toBeUndefined();
    });

    it('should parse autoSearchEnabled = true', async () => {
      mockPreferences({ autoSearchEnabled: 'true' });
      const s = await adapter.getSettings();
      expect(s.autoSearchEnabled).toBe(true);
    });

    it('should parse autoPosTagging legacy value', async () => {
      mockPreferences({ autoPosTagging: 'true' });
      const s = await adapter.getSettings();
      expect(s.autoPosTagging).toBe(true);
    });

    it('should parse hideSingularTags legacy value', async () => {
      mockPreferences({ hideSingularTags: 'true' });
      const s = await adapter.getSettings();
      expect(s.hideSingularTags).toBe(true);
    });

    it('should parse hideExistingResults legacy value', async () => {
      mockPreferences({ hideExistingResults: 'true' });
      const s = await adapter.getSettings();
      expect(s.hideExistingResults).toBe(true);
    });
  });

  // ── audioMode normalization ──────────────────────────────────
  describe('audioMode normalization', () => {
    it('should default to "native" when audioMode is null', async () => {
      (Preferences.get as any).mockResolvedValue({ value: null });
      const s = await adapter.getSettings();
      expect(s.audioMode).toBe('native');
    });

    it('should keep "none" as is', async () => {
      mockPreferences({ audioMode: 'none' });
      const s = await adapter.getSettings();
      expect(s.audioMode).toBe('none');
    });

    it('should keep "native" as is', async () => {
      mockPreferences({ audioMode: 'native' });
      const s = await adapter.getSettings();
      expect(s.audioMode).toBe('native');
    });
  });

  // ── saveSetting ───────────────────────────────────────────────────────
  describe('saveSetting', () => {
    it('should call Preferences.set with settings_config key and stringified value', async () => {
      (Preferences.get as any).mockResolvedValue({ value: null });
      await adapter.saveSetting('theme', 'midnight');
      expect(Preferences.set).toHaveBeenCalledWith(expect.objectContaining({
        key: 'settings_config',
      }));
      const calls = (Preferences.set as any).mock.calls;
      const callArg = calls[calls.length - 1][0];
      const parsed = JSON.parse(callArg.value);
      expect(parsed.theme).toBe('midnight');
    });

    it('should save numeric values inside JSON', async () => {
      (Preferences.get as any).mockResolvedValue({ value: null });
      await adapter.saveSetting('fontSize', 20);
      const calls = (Preferences.set as any).mock.calls;
      const callArg = calls[calls.length - 1][0];
      const parsed = JSON.parse(callArg.value);
      expect(parsed.fontSize).toBe(20);
    });

    it('should save boolean values inside JSON', async () => {
      (Preferences.get as any).mockResolvedValue({ value: null });
      await adapter.saveSetting('showIdioms', false);
      const calls = (Preferences.set as any).mock.calls;
      const callArg = calls[calls.length - 1][0];
      const parsed = JSON.parse(callArg.value);
      expect(parsed.showIdioms).toBe(false);
    });

    it('should save language inside JSON', async () => {
      (Preferences.get as any).mockResolvedValue({ value: null });
      await adapter.saveSetting('language', 'de');
      const calls = (Preferences.set as any).mock.calls;
      const callArg = calls[calls.length - 1][0];
      const parsed = JSON.parse(callArg.value);
      expect(parsed.language).toBe('de');
    });

    it('should save complex objects inside JSON', async () => {
      (Preferences.get as any).mockResolvedValue({ value: null });
      const groups = [{ id: '1', name: 'Group', tags: [] }];
      await adapter.saveSetting('tagGroups', groups);
      const calls = (Preferences.set as any).mock.calls;
      const callArg = calls[calls.length - 1][0];
      const parsed = JSON.parse(callArg.value);
      expect(parsed.tagGroups).toEqual(groups);
    });

    it('should perform bulk saveSettings updates in a single write operation', async () => {
      (Preferences.get as any).mockResolvedValue({ value: null });
      const updates = { theme: 'midnight' as any, fontSize: 22, language: 'es' as any };
      await adapter.saveSettings(updates);
      const calls = (Preferences.set as any).mock.calls;
      const callArg = calls[calls.length - 1][0];
      const parsed = JSON.parse(callArg.value);
      expect(parsed.theme).toBe('midnight');
      expect(parsed.fontSize).toBe(22);
      expect(parsed.language).toBe('es');
    });
  });

  // ── parsing edge cases ───────────────────────────────────────────────
  describe('getSettings - parsing edge cases', () => {
    it('should return default value on invalid JSON in consolidated config', async () => {
      mockPreferences({ settings_config: 'invalid-json' });
      const s = await adapter.getSettings();
      expect(s.theme).toBe('standard');
    });

    it('should return default value on invalid JSON in legacy config', async () => {
      mockPreferences({ settings_config: null, tagGroups: 'invalid-json' });
      const s = await adapter.getSettings();
      expect(s.tagGroups).toEqual([]);
    });

    it('should parse valid JSON for tags in legacy config', async () => {
      const tags = ['tag1', 'tag2'];
      mockPreferences({ settings_config: null, allTags: JSON.stringify(tags) });
      const s = await adapter.getSettings();
      expect(s.allTags).toEqual(tags);
    });

    it('should parse valid JSON from consolidated config', async () => {
      const config = { theme: 'forest', fontSize: 18, tagGroups: [{ id: 'g1', name: 'Group' }] };
      mockPreferences({ settings_config: JSON.stringify(config) });
      const s = await adapter.getSettings();
      expect(s.theme).toBe('forest');
      expect(s.fontSize).toBe(18);
      expect(s.tagGroups).toEqual([{ id: 'g1', name: 'Group' }]);
    });
  });

  // ── cached settings + error paths ─────────────────────────────────────
  describe('coverage: cached settings + error paths', () => {
    beforeEach(() => {
      // Isolate mock state from prior tests that set mockRejectedValue
      (Preferences.get as any).mockReset();
      (Preferences.set as any).mockReset();
      (Preferences.remove as any).mockReset();
      (Preferences.get as any).mockResolvedValue(undefined);
      (Preferences.set as any).mockResolvedValue(undefined);
      (Preferences.remove as any).mockResolvedValue(undefined);
    });

    it('should return cached settings on second call (L12)', async () => {
      (Preferences.get as any).mockResolvedValue({ value: null });
      await adapter.getSettings();

      (Preferences.get as any).mockClear();
      const s = await adapter.getSettings();
      expect(s.theme).toBe('standard');
      expect(Preferences.get).not.toHaveBeenCalled();
    });

    it('should use cached settings in saveSettings when available (L38)', async () => {
      (Preferences.get as any).mockResolvedValue({ value: null });
      await adapter.getSettings(); // populate cache

      (Preferences.get as any).mockClear();
      await adapter.saveSetting('theme', 'midnight');

      const lastCall = (Preferences.set as any).mock.calls.at(-1)[0];
      expect(JSON.parse(lastCall.value).theme).toBe('midnight');
    });

    it('should handle Preferences.set failure in saveSettings (L45-47)', async () => {
      (Preferences.get as any).mockResolvedValue({ value: null });
      (Preferences.set as any).mockRejectedValue(new Error('write failed'));

      await expect(adapter.saveSetting('theme', 'midnight')).rejects.toThrow('write failed');
    });

    it('should handle invalid JSON in loadRawSettings catch (L58)', async () => {
      (Preferences.get as any).mockImplementation(({ key }: { key: string }) => {
        if (key === 'settings_config') return Promise.resolve({ value: 'bad-json' });
        return Promise.resolve({ value: null });
      });
      // saveSetting triggers loadRawSettings (cachedSettings is null after fresh start)
      await adapter.saveSetting('theme', 'midnight');
      const lastCall = (Preferences.set as any).mock.calls.at(-1)[0];
      expect(JSON.parse(lastCall.value).theme).toBe('midnight');
    });

    it('should handle legacy cleanup failure (L117)', async () => {
      (Preferences.get as any).mockResolvedValue({ value: null });
      (Preferences.remove as any).mockRejectedValue(new Error('cleanup failed'));

      const s = await adapter.getSettings();
      expect(s.theme).toBe('standard');
    });

    it('should cover false branches of legacy cond-exprs (L91, L95)', async () => {
      // Force migration via saveSettings: cachedSettings is null → loadRawSettings → migrateFromLegacy
      // audioMode will be null → L91 cond-expr false → {}
      // frontSideMode will be falsy → L95 cond-expr false → {}
      const freshAdapter = new CapacitorSettingsAdapter();
      (Preferences.get as any).mockImplementation(({ key }: { key: string }) => {
        if (key === 'settings_config') return Promise.resolve({ value: null });
        const suffix = key.replace('settings_', '');
        if (suffix === 'audioMode') return Promise.resolve({ value: null });
        if (suffix === 'frontSideMode') return Promise.resolve({ value: null });
        return Promise.resolve({ value: null });
      });
      await freshAdapter.saveSetting('theme', 'midnight');
    });
  });
});
