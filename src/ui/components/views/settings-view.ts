import { BaseComponent } from '../base-component';
import { ISettingsView } from '../../presenters/view-interfaces';
import { AppSettings, ThemeType, FontType, DEFAULT_SETTINGS } from '../../../domain/entities';

type SettingValue = string | boolean | number | ThemeType | FontType;

export class SettingsView extends BaseComponent implements ISettingsView {
    private static readonly MIN_FONT = 8;
    private static readonly MAX_FONT = 72;

    private elements: {
        overlay: HTMLElement | null;
        themeOptions: NodeListOf<HTMLElement>;
        fontSelect: HTMLSelectElement | null;
        fontSizeInput: HTMLInputElement | null;
        langSelect: HTMLSelectElement | null;
        toggleDelayUnitBtn: HTMLElement | null;
    };

    onSettingChange?: (key: keyof AppSettings, value: string | boolean | number) => void;

    constructor() {
        super();
        this.elements = {
            overlay: this.getEl('settingsOverlay'),
            themeOptions: document.querySelectorAll('.theme-opt'),
            fontSelect: this.getEl('fontSelect') as HTMLSelectElement,
            fontSizeInput: this.getEl('fontSizeInput') as HTMLInputElement,
            langSelect: this.getEl('langSelect') as HTMLSelectElement,
            toggleDelayUnitBtn: this.getEl('toggleDelayUnitBtn')
        };
    }

    toggleOverlay(open: boolean): void {
        this.elements.overlay?.classList.toggle('open', open);
        document.body.classList.toggle('no-scroll', open);
    }

    /* istanbul ignore next */
    updateSettingsUI(settings: AppSettings): void {
        if (this.elements.fontSizeInput) {
            this.elements.fontSizeInput.value = settings.fontSize.toString();
        }

        const setField = (id: string, val: SettingValue, type: 'value' | 'checked' = 'value') => {
            const el = document.getElementById(id) as (HTMLInputElement | HTMLSelectElement) | null;
            if (el) {
                if (type === 'checked') (el as HTMLInputElement).checked = val as boolean;
                else el.value = String(val);
            }
        };

        setField('langSelect', settings.language);
        setField('showIdiomsSwitch', settings.showIdioms, 'checked');
        setField('audioModeSelect', settings.audioMode);
        setField('frontSideSelect', settings.frontSideMode);
        setField('autoSearchSwitch', settings.autoSearchEnabled, 'checked');
        setField('autoSearchDelayInput', settings.autoSearchDelay);
        const delayRow = document.getElementById('autoSearchDelayRow');
        if (delayRow) {
            delayRow.classList.toggle('hidden', !settings.autoSearchEnabled);
        }
        setField('hideSingularTagsSwitch', settings.hideSingularTags, 'checked');
        setField('autoPosTaggingSwitch', settings.autoPosTagging, 'checked');
    }

    updateDelayUnit(unit: string): void {
        if (this.elements.toggleDelayUnitBtn) {
            this.elements.toggleDelayUnitBtn.textContent = this.t(unit);
        }
        const delayInput = document.getElementById('autoSearchDelayInput') as HTMLInputElement;
        if (delayInput) {
            if (unit === 'sec') {
                delayInput.min = '1';
                delayInput.max = '5';
                delayInput.step = '0.5';
            } else {
                delayInput.min = '500';
                delayInput.max = '5000';
                delayInput.step = '100';
            }
        }
    }

    /* istanbul ignore next */
    render(): void {
        // Bind events
        this.elements.themeOptions.forEach(opt => {
            opt.onclick = () => {
                const theme = opt.getAttribute('data-theme');
                if (theme) this.onSettingChange?.('theme', theme);
            };
        });

        if (this.elements.fontSelect) {
            this.elements.fontSelect.onchange = () => {
                if (this.elements.fontSelect?.value) this.onSettingChange?.('font', this.elements.fontSelect.value);
            };
        }

        if (this.elements.langSelect) {
            this.elements.langSelect.onchange = () => {
                if (this.elements.langSelect?.value) this.onSettingChange?.('language', this.elements.langSelect.value);
            };
        }

        const bindChange = (id: string, key: keyof AppSettings, type: 'value' | 'checked' = 'value') => {
            const el = document.getElementById(id);
            if (!el) return;
            if (type === 'checked') {
                (el as HTMLInputElement).onchange = () => this.onSettingChange?.(key, (el as HTMLInputElement).checked);
            } else {
                (el as HTMLInputElement).onchange = () => this.onSettingChange?.(key, (el as HTMLInputElement).value);
            }
        };

        bindChange('showIdiomsSwitch', 'showIdioms', 'checked');
        bindChange('audioModeSelect', 'audioMode');
        bindChange('frontSideSelect', 'frontSideMode');
        bindChange('autoSearchSwitch', 'autoSearchEnabled', 'checked');
        
        const delayInput = document.getElementById('autoSearchDelayInput') as HTMLInputElement;
        if (delayInput) {
            delayInput.oninput = () => this.onSettingChange?.('autoSearchDelay', delayInput.value);
        }

        bindChange('hideSingularTagsSwitch', 'hideSingularTags', 'checked');
        bindChange('autoPosTaggingSwitch', 'autoPosTagging', 'checked');

        // Font size buttons
        const dec = document.getElementById('decreaseFont');
        const inc = document.getElementById('increaseFont');
        if (dec) dec.onclick = () => {
            const val = parseInt(this.elements.fontSizeInput?.value || String(DEFAULT_SETTINGS.fontSize));
            if (!isNaN(val)) this.onSettingChange?.('fontSize', Math.max(SettingsView.MIN_FONT, val - 1));
        };
        if (inc) inc.onclick = () => {
            const val = parseInt(this.elements.fontSizeInput?.value || String(DEFAULT_SETTINGS.fontSize));
            if (!isNaN(val)) this.onSettingChange?.('fontSize', Math.min(SettingsView.MAX_FONT, val + 1));
        };
    }
}
