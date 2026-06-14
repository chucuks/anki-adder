import { VocabularyUseCase } from '../../application/use-cases';
import { Store } from '../state/store';
import { ISettingsView } from './view-interfaces';
import { AppSettings, DEFAULT_SETTINGS } from '../../domain/entities';

const UI_UPDATE_KEYS: (keyof AppSettings)[] = ['theme', 'font', 'fontSize', 'showIdioms', 'autoSearchEnabled', 'autoPosTagging', 'hideSingularTags', 'autoSearchDelay', 'autoSearchDelayUnit'];

export class SettingsPresenter {
    private unsubscribers: (() => void)[] = [];

    constructor(
        private readonly useCase: VocabularyUseCase,
        private readonly store: Store,
        private readonly view: ISettingsView
    ) {
        this.setupSubscriptions();
    }

    dispose(): void {
        this.unsubscribers.forEach(fn => fn());
        this.unsubscribers = [];
    }

    /* istanbul ignore next */
    private setupSubscriptions() {
        this.unsubscribers.push(
            this.store.subscribe('language', () => {
                const state = this.store.getState();
                this.view.setLanguage(state.language);
                this.view.applyTranslations();
                this.view.updateSettingsUI(state);
            }, false),
            ...UI_UPDATE_KEYS.map(key =>
                this.store.subscribe(key, () => this.view.updateSettingsUI(this.store.getState()), false)
            ),
            this.store.subscribe('autoSearchDelayUnit', (unit) => {
                this.view.updateDelayUnit(unit);
            })
        );
        const state = this.store.getState();
        this.view.setLanguage(state.language);
        this.view.applyTranslations();
        this.view.updateSettingsUI(state);
    }

    async handleSettingChange(key: keyof AppSettings, value: string | boolean | number): Promise<void> {
        let normalized: AppSettings[keyof AppSettings] = value;

        if (key === 'fontSize' || key === 'autoSearchDelay') {
            const parsed = typeof value === 'string' ? parseFloat(value) : (value as number);
            normalized = isNaN(parsed) ? (key === 'fontSize' ? DEFAULT_SETTINGS.fontSize : DEFAULT_SETTINGS.autoSearchDelay) : parsed;
        } else if (typeof value === 'string' && (value === 'true' || value === 'false')) {
            normalized = value === 'true';
        }

        await this.useCase.saveSetting(key, normalized as never);
        this.store.update(key as keyof AppSettings, normalized as never);
    }

    async toggleDelayUnit() {
        const state = this.store.getState();
        const newUnit = state.autoSearchDelayUnit === 'ms' ? 'sec' : 'ms';
        
        let val = state.autoSearchDelay;
        if (newUnit === 'sec') val = val / 1000;
        else val = val * 1000;
        
        await this.useCase.saveSettings({
            autoSearchDelayUnit: newUnit,
            autoSearchDelay: val
        });
        this.store.update('autoSearchDelayUnit', newUnit);
        this.store.update('autoSearchDelay', val);
    }

    async loadInitialSettings() {
        const settings = await this.useCase.getSettings();
        if (settings) {
            this.store.updateMany(settings);
            this.view.updateSettingsUI(settings);
        }
    }

    toggleSettings(open: boolean) {
        this.view.toggleOverlay(open);
    }
}
