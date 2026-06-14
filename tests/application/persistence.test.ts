import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppController } from '../../src/ui/controllers/app-controller';
import { VocabularyUseCase } from '../../src/application/use-cases';

describe('Application Persistence', () => {
    let useCase: any;
    let savedSettings: any = {};

    beforeEach(() => {
        savedSettings = {
            language: 'tr',
            theme: 'dracula',
            lastSelectedDeck: 'Default',
            hideExistingResults: true,
            allTags: ['test-tag'],
            tagGroups: [{ id: '1', name: 'G1', tags: ['test-tag'], deckId: 'any' }],
            deckTags: { 'Default': ['test-tag'] }
        };

        useCase = {
            getSettings: vi.fn().mockImplementation(() => Promise.resolve({ ...savedSettings })),
            saveSetting: vi.fn().mockImplementation((key, val) => {
                savedSettings[key] = val;
                return Promise.resolve();
            }),
            saveSettings: vi.fn().mockImplementation((updates) => {
                Object.assign(savedSettings, updates);
                return Promise.resolve();
            }),
            getAvailableDecks: vi.fn().mockResolvedValue(['Default', 'Other']),
            checkExistingMeanings: vi.fn().mockResolvedValue({ existing: new Set() })
        };
        
        // Mock DOM for init
        document.body.innerHTML = `
            <div id="statusBox"></div>
            <div id="settingsBtn"></div>
            <select id="deckSelect"></select>
            <div id="quickTagList"></div>
            <div id="wordInput"></div>
            <div id="searchBtn"></div>
            <div id="clearWordBtn"></div>
            <div id="addBtn"></div>
            <div id="settingsOverlay">
                <div id="closeSettings"></div>
                <div id="langSelect"></div>
                <div id="themeOpts"></div>
            </div>
            <div id="tagManagerOverlay">
                <div id="closeTagManager"></div>
                <button id="addTagBtn"></button>
                <button id="addGroupBtn"></button>
                <input id="newTagName" />
                <input id="newGroupName" />
                <div id="toggleTagDeleteMode"></div>
                <div id="toggleGroupDeleteMode"></div>
                <div id="tagList"></div>
                <div id="groupList"></div>
            </div>
            <div id="resultCard">
                <div id="existingWordCount"></div>
                <button id="toggleSelectBtn"></button>
                <div id="meaningsList"></div>
            </div>
        `;
    });

    it('should load all settings on initialization', async () => {
        const controller = new AppController(useCase);
        await controller.init();
        
        // Check if store state matches savedSettings
        // @ts-ignore - accessing private store for testing
        const state = controller.store.getState();
        expect(state.language).toBe('tr');
        expect(state.theme).toBe('dracula');
        expect(state.lastSelectedDeck).toBe('Default');
        expect(state.hideExistingResults).toBe(true);
        expect(state.allTags).toContain('test-tag');
    });

    it('should save hideExistingResults when toggled', async () => {
        const controller = new AppController(useCase);
        await controller.init();
        
        // @ts-ignore
        controller.searchPresenter.handleToggleExisting();
        
        expect(useCase.saveSetting).toHaveBeenCalledWith('hideExistingResults', false);
        expect(savedSettings.hideExistingResults).toBe(false);
    });
});
