import { describe, it, expect, beforeEach } from 'vitest';
import { BrowserSettingsAdapter } from '../../../../src/infrastructure/adapters/settings/browser-settings';

const lsStore: Record<string, string> = {};
beforeEach(() => {
    Object.keys(lsStore).forEach(k => delete lsStore[k]);
});

Object.defineProperty(globalThis, 'localStorage', {
    value: {
        getItem: (k: string) => lsStore[k] || null,
        setItem: (k: string, v: string) => { lsStore[k] = v; },
        clear: () => { Object.keys(lsStore).forEach(k => delete lsStore[k]); },
        removeItem: (k: string) => { delete lsStore[k]; },
    },
    configurable: true,
    writable: true,
});

describe('Infrastructure / BrowserSettingsAdapter', () => {
    let adapter: BrowserSettingsAdapter;

    beforeEach(() => {
        adapter = new BrowserSettingsAdapter();
    });

    it('should return default settings on first call', async () => {
        const s = await adapter.getSettings();
        expect(s.theme).toBe('standard');
        expect(s.hideExistingResults).toBe(false);
        expect(s.autoSearchDelayUnit).toBe('ms');
    });

    it('should save and load a setting', async () => {
        await adapter.saveSetting('hideExistingResults', true);
        const s = await adapter.getSettings();
        expect(s.hideExistingResults).toBe(true);
    });

    it('should save and load multiple settings', async () => {
        await adapter.saveSettings({ theme: 'midnight', hideExistingResults: true });
        const s = await adapter.getSettings();
        expect(s.theme).toBe('midnight');
        expect(s.hideExistingResults).toBe(true);
    });

    it('should persist across adapter instances', async () => {
        await adapter.saveSetting('hideExistingResults', true);
        const adapter2 = new BrowserSettingsAdapter();
        const s = await adapter2.getSettings();
        expect(s.hideExistingResults).toBe(true);
    });

    it('should merge with defaults for missing keys', async () => {
        await adapter.saveSetting('theme', 'dracula');
        const s = await adapter.getSettings();
        expect(s.theme).toBe('dracula');
        expect(s.hideExistingResults).toBe(false); // still default
        expect(s.frontSideMode).toBe('example'); // still default
    });

    it('should handle localStorage being unavailable', async () => {
        const orig = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')!;
        Object.defineProperty(globalThis, 'localStorage', {
            get() { throw new Error('blocked'); },
            configurable: true,
        });

        const noStoreAdapter = new BrowserSettingsAdapter();
        const s = await noStoreAdapter.getSettings();
        expect(s.theme).toBe('standard');
        expect(s.hideExistingResults).toBe(false);

        // save should not throw
        await noStoreAdapter.saveSetting('theme', 'midnight');

        Object.defineProperty(globalThis, 'localStorage', orig);
    });

    it('should save without prior getSettings (uncached path)', async () => {
        const adapter2 = new BrowserSettingsAdapter();
        await adapter2.saveSetting('hideExistingResults', true);
        const s = await adapter2.getSettings();
        expect(s.hideExistingResults).toBe(true);
    });

    it('should use cache when getSettings precedes save', async () => {
        await adapter.getSettings();
        await adapter.saveSetting('hideExistingResults', true);
        const s = await adapter.getSettings();
        expect(s.hideExistingResults).toBe(true);
    });

    it('should handle localStorage being undefined', async () => {
        Object.defineProperty(globalThis, 'localStorage', {
            value: undefined, configurable: true, writable: true,
        });

        const noStoreAdapter = new BrowserSettingsAdapter();
        const s = await noStoreAdapter.getSettings();
        expect(s.theme).toBe('standard');

        Object.defineProperty(globalThis, 'localStorage', {
            value: lsStore, configurable: true, writable: true,
        });
    });
});
