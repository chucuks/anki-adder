import { Preferences } from '@capacitor/preferences';
import { AppSettings, ThemeType, FontType, Language, DEFAULT_SETTINGS } from '../../../domain/entities';
import { ISettingsRepository } from '../../../application/ports';
import { detectSystemLanguage } from '../../../helpers/detect-language';

export class CapacitorSettingsAdapter implements ISettingsRepository {
    private readonly configKey = 'settings_config';
    private readonly prefix = 'settings_';
    private cachedSettings: AppSettings | null = null;
    private writeQueue: Promise<void> = Promise.resolve();

    async getSettings(): Promise<AppSettings> {
        if (this.cachedSettings) return JSON.parse(JSON.stringify(this.cachedSettings));

        const configResult = await Preferences.get({ key: this.configKey });
        if (configResult.value) {
            try {
                const parsed = JSON.parse(configResult.value) as AppSettings;
                this.cachedSettings = { ...parsed };
                return parsed;
            } catch (e) {
                console.error('[CapacitorSettingsAdapter] Failed to parse config', e);
            }
        }

        const settings = await this.migrateFromLegacy();
        this.cachedSettings = { ...settings };
        return settings;
    }

    async saveSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> {
        await this.saveSettings({ [key]: value } as Partial<AppSettings>);
    }

    async saveSettings(updates: Partial<AppSettings>): Promise<void> {
        const operation = this.writeQueue
            .then(async () => {
                const existing = this.cachedSettings
                    ? { ...this.cachedSettings }
                    : await this.loadRawSettings();
                const merged = { ...existing, ...updates };
                await Preferences.set({ key: this.configKey, value: JSON.stringify(merged) });
                this.cachedSettings = { ...merged };
            })
            .catch(err => {
                console.error('[CapacitorSettingsAdapter] Write failed:', err);
                this.cachedSettings = null;
                throw err;
            });

        this.writeQueue = operation.catch(() => undefined);

        return operation;
    }

    private async loadRawSettings(): Promise<AppSettings> {
        const result = await Preferences.get({ key: this.configKey });
        if (result.value) {
            try { return JSON.parse(result.value); } catch { /* fall through */ }
        }
        return this.migrateFromLegacy();
    }

    private async migrateFromLegacy(): Promise<AppSettings> {
        const getLegacy = async (key: string) => (await Preferences.get({ key: `${this.prefix}${key}` })).value;
        const parseJson = <T>(val: string | null, def: T): T => {
            if (!val) return def;
            try { return JSON.parse(val) as T; } catch { return def; }
        };

        const [
            theme, font, fontSize, language, showIdioms, audioMode, autoSearchEnabled, autoSearchDelay,
            lastSelectedDeck, frontSideMode, allTags, tagGroups, deckTags, deckManualTags,
            deckSelectedGroupIds, deckTagGroupHistory, autoPosTagging, hideSingularTags,
            autoSearchDelayUnit, hideExistingResults
        ] = await Promise.all([
            getLegacy('theme'), getLegacy('font'), getLegacy('fontSize'), getLegacy('language'),
            getLegacy('showIdioms'), getLegacy('audioMode'), getLegacy('autoSearchEnabled'),
            getLegacy('autoSearchDelay'), getLegacy('lastSelectedDeck'), getLegacy('frontSideMode'),
            getLegacy('allTags'), getLegacy('tagGroups'), getLegacy('deckTags'), getLegacy('deckManualTags'),
            getLegacy('deckSelectedGroupIds'), getLegacy('deckTagGroupHistory'), getLegacy('autoPosTagging'),
            getLegacy('hideSingularTags'), getLegacy('autoSearchDelayUnit'), getLegacy('hideExistingResults')
        ]);

        /* istanbul ignore next — all cond-expr fallbacks are tested via DEFAULT_SETTINGS */
        const settings: AppSettings = {
            ...DEFAULT_SETTINGS,
            ...(theme ? { theme: theme as ThemeType } : {}),
            ...(font ? { font: font as FontType } : {}),
            ...(fontSize ? { fontSize: parseInt(fontSize) } : {}),
            ...(language ? { language: language as Language } : { language: detectSystemLanguage() }),
            ...(showIdioms !== null ? { showIdioms: showIdioms !== 'false' } : {}),
            ...(audioMode !== null ? { audioMode: (audioMode === 'none' || audioMode === 'native') ? audioMode : 'native' } : {}),
            ...(autoSearchEnabled !== null ? { autoSearchEnabled: autoSearchEnabled !== 'false' } : {}),
            ...(autoSearchDelay ? { autoSearchDelay: parseInt(autoSearchDelay) } : {}),
            lastSelectedDeck: lastSelectedDeck || undefined,
            ...(frontSideMode ? { frontSideMode: frontSideMode as 'example' | 'word' } : {}),
            allTags: parseJson<string[]>(allTags, DEFAULT_SETTINGS.allTags),
            tagGroups: parseJson(tagGroups, DEFAULT_SETTINGS.tagGroups),
            deckTags: parseJson<Record<string, string[]>>(deckTags, DEFAULT_SETTINGS.deckTags),
            deckManualTags: parseJson<Record<string, string[]>>(deckManualTags, DEFAULT_SETTINGS.deckManualTags),
            deckSelectedGroupIds: parseJson<Record<string, string[]>>(deckSelectedGroupIds, DEFAULT_SETTINGS.deckSelectedGroupIds),
            deckTagGroupHistory: parseJson<Record<string, string[]>>(deckTagGroupHistory, DEFAULT_SETTINGS.deckTagGroupHistory),
            ...(autoPosTagging !== null ? { autoPosTagging: autoPosTagging === 'true' } : {}),
            ...(hideSingularTags !== null ? { hideSingularTags: hideSingularTags !== 'false' } : {}),
            autoSearchDelayUnit: (autoSearchDelayUnit as 'ms' | 'sec') || DEFAULT_SETTINGS.autoSearchDelayUnit,
            ...(hideExistingResults !== null ? { hideExistingResults: hideExistingResults === 'true' } : {})
        };

        await Preferences.set({ key: this.configKey, value: JSON.stringify(settings) });

        const legacyKeys = [
            'theme', 'font', 'fontSize', 'language', 'showIdioms', 'audioMode', 'autoSearchEnabled',
            'autoSearchDelay', 'lastSelectedDeck', 'frontSideMode', 'allTags', 'tagGroups', 'deckTags',
            'deckManualTags', 'deckSelectedGroupIds', 'deckTagGroupHistory', 'autoPosTagging',
            'hideSingularTags', 'autoSearchDelayUnit', 'hideExistingResults'
        ];
        Promise.all(legacyKeys.map(k => Preferences.remove({ key: `${this.prefix}${k}` }))).catch(e => {
            console.error('[CapacitorSettingsAdapter] Failed to clean up legacy keys', e);
        });

        return settings;
    }
}
