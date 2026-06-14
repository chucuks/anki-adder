import { AppSettings, DEFAULT_SETTINGS } from '../../../domain/entities';
import { ISettingsRepository } from '../../../application/ports';
import { detectSystemLanguage } from '../../../helpers/detect-language';

const STORAGE_KEY = 'adder_settings';

function safeLocalStorage(): Storage | null {
    try {
        return typeof localStorage !== 'undefined' ? localStorage : null;
    } catch {
        return null;
    }
}

export class BrowserSettingsAdapter implements ISettingsRepository {
    private cachedSettings: AppSettings | null = null;

    async getSettings(): Promise<AppSettings> {
        if (this.cachedSettings) return { ...this.cachedSettings };

        const store = safeLocalStorage();
        if (!store) {
            this.cachedSettings = { ...DEFAULT_SETTINGS, language: detectSystemLanguage() };
            return { ...this.cachedSettings };
        }

        try {
            const raw = store.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw) as AppSettings;
                this.cachedSettings = { ...DEFAULT_SETTINGS, ...parsed };
                return { ...this.cachedSettings };
            }
        } catch {
            // fall through
        }

        this.cachedSettings = { ...DEFAULT_SETTINGS, language: detectSystemLanguage() };
        return { ...this.cachedSettings };
    }

    async saveSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> {
        await this.saveSettings({ [key]: value } as Partial<AppSettings>);
    }

    async saveSettings(updates: Partial<AppSettings>): Promise<void> {
        const store = safeLocalStorage();
        if (!store) return;

        const existing = this.cachedSettings ? { ...this.cachedSettings } : await this.getSettings();
        const merged = { ...existing, ...updates };

        try {
            store.setItem(STORAGE_KEY, JSON.stringify(merged));
            this.cachedSettings = { ...merged };
        } catch {
            // silently ignore
        }
    }
}
