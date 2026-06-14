import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettingsPresenter } from '@/ui/presenters/settings-presenter';
import { Store } from '@/ui/state/store';
import { ISettingsView } from '@/ui/presenters/view-interfaces';

describe('UI / Presenters / SettingsPresenter', () => {
    let presenter: SettingsPresenter;
    let mockUseCase: any;
    let store: Store;
    let mockView: ISettingsView;

    const initialState: any = {
        theme: 'standard', language: 'en', fontSize: 16, autoSearchDelay: 1000,
        autoSearchDelayUnit: 'ms', showIdioms: true, autoSearchEnabled: true,
        autoPosTagging: false, hideSingularTags: false
    };

    beforeEach(() => {
        mockUseCase = {
            saveSetting: vi.fn().mockResolvedValue(undefined),
            saveSettings: vi.fn().mockResolvedValue(undefined),
            getSettings: vi.fn().mockResolvedValue(initialState)
        };
        store = new Store(initialState);
        mockView = {
            showStatus: vi.fn(),
            applyTranslations: vi.fn(),
            toggleOverlay: vi.fn(),
            updateSettingsUI: vi.fn(),
            updateDelayUnit: vi.fn(),
            setLanguage: vi.fn()
        };
        presenter = new SettingsPresenter(mockUseCase, store, mockView);
    });

    it('should change theme and update store', async () => {
        await presenter.handleSettingChange('theme', 'midnight');
        expect(mockUseCase.saveSetting).toHaveBeenCalledWith('theme', 'midnight');
        expect(store.getState().theme).toBe('midnight');
    });

    it('should normalize numeric settings', async () => {
        await presenter.handleSettingChange('fontSize', '20');
        expect(mockUseCase.saveSetting).toHaveBeenCalledWith('fontSize', 20);
        expect(store.getState().fontSize).toBe(20);
    });

    it('should fallback to default for invalid numeric settings', async () => {
        await presenter.handleSettingChange('fontSize', 'abc');
        expect(mockUseCase.saveSetting).toHaveBeenCalledWith('fontSize', 16);
        
        await presenter.handleSettingChange('autoSearchDelay', 'abc');
        expect(mockUseCase.saveSetting).toHaveBeenCalledWith('autoSearchDelay', 1000);
    });

    it('should normalize boolean settings', async () => {
        await presenter.handleSettingChange('showIdioms', 'false');
        expect(mockUseCase.saveSetting).toHaveBeenCalledWith('showIdioms', false);
    });

    it('should trigger translations update on language change', async () => {
        // Triggers via subscription now
        store.update('language', 'tr');
        expect(mockView.applyTranslations).toHaveBeenCalled();
        expect(mockView.setLanguage).toHaveBeenCalledWith('tr');
    });

    it('should load initial settings', async () => {
        await presenter.loadInitialSettings();
        expect(mockUseCase.getSettings).toHaveBeenCalled();
        expect(mockView.updateSettingsUI).toHaveBeenCalledWith(initialState);

        // Test null settings branch (line 65)
        mockUseCase.getSettings.mockResolvedValue(null);
        await presenter.loadInitialSettings();
        // Should not throw and not call updateSettingsUI again
        expect(mockUseCase.getSettings).toHaveBeenCalledTimes(2);
    });

    it('should toggle settings overlay', () => {
        presenter.toggleSettings(true);
        expect(mockView.toggleOverlay).toHaveBeenCalledWith(true);
    });

    it('should toggle delay unit', async () => {
        await presenter.toggleDelayUnit(); // ms -> sec
        expect(store.getState().autoSearchDelayUnit).toBe('sec');
        expect(store.getState().autoSearchDelay).toBe(1); // 1000ms -> 1sec
        expect(mockView.updateDelayUnit).toHaveBeenCalledWith('sec');
        expect(mockUseCase.saveSettings).toHaveBeenLastCalledWith({
            autoSearchDelayUnit: 'sec',
            autoSearchDelay: 1
        });
        
        await presenter.toggleDelayUnit(); // sec -> ms
        expect(store.getState().autoSearchDelayUnit).toBe('ms');
        expect(store.getState().autoSearchDelay).toBe(1000); // 1sec -> 1000ms
        expect(mockView.updateDelayUnit).toHaveBeenCalledWith('ms');
        expect(mockUseCase.saveSettings).toHaveBeenLastCalledWith({
            autoSearchDelayUnit: 'ms',
            autoSearchDelay: 1000
        });
    });

    it('should react to settings changes', () => {
        (mockView.updateSettingsUI as any).mockClear();
        store.update('theme', 'dracula');
        expect(mockView.updateSettingsUI).toHaveBeenCalled();
    });

    it('should dispose and unsubscribe', () => {
        presenter.dispose();
    });

    it('should handle numeric value type directly (L50 ternary false)', async () => {
        await presenter.handleSettingChange('fontSize', 22);
        expect(mockUseCase.saveSetting).toHaveBeenCalledWith('fontSize', 22);
        expect(store.getState().fontSize).toBe(22);

        await presenter.handleSettingChange('autoSearchDelay', 2000);
        expect(mockUseCase.saveSetting).toHaveBeenCalledWith('autoSearchDelay', 2000);
    });
});
