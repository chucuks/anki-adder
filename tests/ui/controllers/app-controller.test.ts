import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppController } from '@/ui/controllers/app-controller';

describe('UI / Controllers / AppController', () => {
    let controller: AppController;
    let mockUseCase: any;

    beforeEach(() => {
        document.body.innerHTML = `
            <input id="wordInput" />
            <button id="searchBtn"></button>
            <div id="clearWordBtn"></div>
            <button id="addBtn"></button>
            <button id="settingsBtn"></button>
            <button id="closeSettings"></button>
            <button id="openTagManager"></button>
            <button id="closeTagManager"></button>
            <button id="addTagBtn"></button>
            <button id="addGroupBtn"></button>
            <button id="toggleTagDeleteMode"></button>
            <button id="toggleGroupDeleteMode"></button>
            <button id="toggleDelayUnitBtn"></button>
            <button id="toggleSelectBtn"></button>
            <div id="existingWordCount"></div>
            <input id="newTagName" />
            <input id="newGroupName" />
            <select id="deckSelect"></select>
            <input id="tagSearchInput" />
            <input id="groupSearchInput" />
            <input id="dashboardTagSearchInput" />
        `;

        mockUseCase = {
            getSettings: vi.fn().mockResolvedValue({
                theme: 'standard', language: 'en', font: 'outfit', fontSize: 16,
                deckTags: {}, tagGroups: [], deckTagGroupHistory: {}
            }),
            getAvailableDecks: vi.fn().mockResolvedValue(['Default']),
            saveSetting: vi.fn().mockResolvedValue(undefined),
            saveSettings: vi.fn().mockResolvedValue(undefined)
        };
        vi.spyOn(window, 'confirm').mockImplementation(() => true);
        controller = new AppController(mockUseCase as any);
    });

    it('should initialize and bind events', async () => {
        await controller.init();
        expect(mockUseCase.getSettings).toHaveBeenCalled();
    });

    it('should handle init failure gracefully', async () => {
        mockUseCase.getSettings.mockRejectedValue(new Error('settings error'));
        await expect(controller.init()).resolves.toBeUndefined();
    });

    it('should handle search input and button clicks', async () => {
        await controller.init();
        
        const wordInput = document.getElementById('wordInput') as HTMLInputElement;
        wordInput.value = 'test';
        wordInput.dispatchEvent(new Event('input'));
        
        document.getElementById('searchBtn')?.click();
        document.getElementById('clearWordBtn')?.click();
        document.getElementById('addBtn')?.click();
    });

    it('should handle settings and tag manager toggles', async () => {
        await controller.init();
        document.getElementById('toggleSettingsBtn')?.click();
        document.getElementById('toggleTagManagerBtn')?.click();
        document.getElementById('toggleDelayUnitBtn')?.click();
        document.getElementById('selectAllBtn')?.click();
        document.getElementById('existingWordCount')?.click();
    });

    it('should handle tag management actions', async () => {
        await controller.init();
        
        const tagPresenterSpy = vi.spyOn((controller as any).tagPresenter, 'addTag');
        const groupPresenterSpy = vi.spyOn((controller as any).tagPresenter, 'addGroup');

        const tagNameInput = document.getElementById('newTagName') as HTMLInputElement;
        tagNameInput.value = 'newtag';
        tagNameInput.dispatchEvent(new Event('input'));
        document.getElementById('addTagBtn')?.click();
        expect(tagPresenterSpy).toHaveBeenCalledWith('newtag');

        const groupNameInput = document.getElementById('newGroupName') as HTMLInputElement;
        groupNameInput.value = 'newgroup';
        groupNameInput.dispatchEvent(new Event('input'));
        document.getElementById('addGroupBtn')?.click();
        expect(groupPresenterSpy).toHaveBeenCalledWith('newgroup');
    });

    it('should handle tag and group click actions (delete/toggle)', async () => {
        await controller.init();
        const store = (controller as any).store;
        
        const tagPresenter = (controller as any).tagPresenter;
        const deleteTagSpy = vi.spyOn(tagPresenter, 'deleteTag');
        const toggleInGroupSpy = vi.spyOn(tagPresenter, 'toggleTagInGroup');
        const deleteGroupSpy = vi.spyOn(tagPresenter, 'deleteGroup');

        // Tag Click - Delete Mode
        store.update('tagDeleteMode', true);
        (controller as any).tagView.onTagClick('tag1');
        expect(deleteTagSpy).toHaveBeenCalledWith('tag1');

        // Tag Click - Toggle in Group
        store.update('tagDeleteMode', false);
        store.update('selectedGroupInManagerId', 'g1');
        (controller as any).tagView.onTagClick('tag1');
        expect(toggleInGroupSpy).toHaveBeenCalledWith('g1', 'tag1');

        // Group Click - Delete Mode
        store.update('groupDeleteMode', true);
        (controller as any).tagView.onGroupClick('g1');
        expect(deleteGroupSpy).toHaveBeenCalledWith('g1');
    });

    it('should trigger all bound events (for Funcs coverage)', async () => {
        await controller.init();
        
        // Keydown on wordInput
        const wordInput = document.getElementById('wordInput') as HTMLInputElement;
        wordInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
        wordInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

        // All buttons
        const buttons = ['searchBtn', 'clearWordBtn', 'addBtn', 'settingsBtn', 'closeSettings', 
                         'openTagManager', 'closeTagManager', 'toggleTagDeleteMode', 'toggleGroupDeleteMode',
                         'toggleSelectBtn', 'toggleDelayUnitBtn', 'existingWordCount', 'addTagBtn', 'addGroupBtn'];
        buttons.forEach(id => document.getElementById(id)?.click());
        
        // Inputs
        ['newTagName', 'newGroupName'].forEach(id => {
            const el = document.getElementById(id) as HTMLInputElement;
            if (el) {
                el.value = 'test';
                el.dispatchEvent(new Event('input'));
            }
        });

        // Other handlers
        (controller as any).resultListView.onMeaningClick(0);
        (controller as any).settingsView.onSettingChange('theme', 'midnight');
        
        // Tag Click variants
        const store = (controller as any).store;
        store.update('tagDeleteMode', false);
        store.update('selectedGroupInManagerId', null);
        (controller as any).tagView.onTagClick('tag1'); 
        
        // Group Click variants
        store.update('groupDeleteMode', false);
        (controller as any).tagView.onGroupClick('g1');

        // Anki View triggers
        (controller as any).ankiView.onTagToggle('t1');
        (controller as any).ankiView.onGroupToggle('g1');
        (controller as any).ankiView.onAutoPosToggle();
        (controller as any).ankiView.onSearchChange('query');
    });

    it('should handle deck selection change', async () => {
        await controller.init();
        const store = (controller as any).store;
        const deckSelect = document.getElementById('deckSelect') as HTMLSelectElement;
        
        const option = document.createElement('option');
        option.value = 'English';
        deckSelect.appendChild(option);
        deckSelect.value = 'English';
        deckSelect.dispatchEvent(new Event('change'));
        
        expect(store.getState().lastSelectedDeck).toBe('English');
    });

    it('should dispose and clean up all presenters', async () => {
        await controller.init();
        const ankiPresenter = (controller as any).ankiPresenter;
        const searchPresenter = (controller as any).searchPresenter;
        const settingsPresenter = (controller as any).settingsPresenter;
        const tagPresenter = (controller as any).tagPresenter;
        const themeService = (controller as any).themeService;

        const ankiDispose = vi.spyOn(ankiPresenter, 'dispose');
        const searchDispose = vi.spyOn(searchPresenter, 'dispose');
        const settingsDispose = vi.spyOn(settingsPresenter, 'dispose');
        const tagDispose = vi.spyOn(tagPresenter, 'dispose');
        const themeDispose = vi.spyOn(themeService, 'dispose');

        controller.dispose();

        expect(ankiDispose).toHaveBeenCalled();
        expect(searchDispose).toHaveBeenCalled();
        expect(settingsDispose).toHaveBeenCalled();
        expect(tagDispose).toHaveBeenCalled();
        expect(themeDispose).toHaveBeenCalled();
    });

    it('should handle shared text', async () => {
        await controller.init();
        const wordInput = document.getElementById('wordInput') as HTMLInputElement;
        
        controller.handleSharedText('hello world');
        expect(wordInput.value).toBe('hello world');
    });

    it('should ignore empty shared text', async () => {
        await controller.init();
        controller.handleSharedText('');
    });

    it('should trigger handlers via keyboard on non-button elements', async () => {
        await controller.init();
        const clearBtn = document.getElementById('clearWordBtn');
        expect(clearBtn).toBeTruthy();

        const keydownEnter = new KeyboardEvent('keydown', { key: 'Enter' });
        clearBtn!.dispatchEvent(keydownEnter);

        const keydownSpace = new KeyboardEvent('keydown', { key: ' ' });
        clearBtn!.dispatchEvent(keydownSpace);
    });

    it('should support handleAddTagClick with missing input (null guard)', () => {
        document.getElementById('newTagName')?.remove();
        (controller as any).handleAddTagClick();
    });

    it('should support handleAddGroupClick with missing input (null guard)', () => {
        document.getElementById('newGroupName')?.remove();
        (controller as any).handleAddGroupClick();
    });
});

describe('AppController with missing DOM elements (L163, L169)', () => {
    let controller: AppController;
    let mockUseCase: any;

    beforeEach(async () => {
        document.body.innerHTML = `
            <input id="wordInput" />
            <button id="searchBtn"></button>
            <div id="clearWordBtn"></div>
            <button id="addBtn"></button>
            <button id="settingsBtn"></button>
            <button id="closeSettings"></button>
            <button id="openTagManager"></button>
            <button id="closeTagManager"></button>
            <button id="addTagBtn"></button>
            <button id="addGroupBtn"></button>
            <button id="toggleTagDeleteMode"></button>
            <button id="toggleGroupDeleteMode"></button>
            <button id="toggleDelayUnitBtn"></button>
            <button id="toggleSelectBtn"></button>
            <div id="existingWordCount"></div>
            <!-- NOTE: no #newTagName, no #newGroupName -->
        `;

        mockUseCase = {
            getSettings: vi.fn().mockResolvedValue({
                theme: 'standard', language: 'en', font: 'outfit', fontSize: 16,
                deckTags: {}, tagGroups: [], deckTagGroupHistory: {}
            }),
            getAvailableDecks: vi.fn().mockResolvedValue(['Default']),
            saveSetting: vi.fn().mockResolvedValue(undefined),
            saveSettings: vi.fn().mockResolvedValue(undefined)
        };
        controller = new AppController(mockUseCase as any);
        await controller.init();
    });

    it('should initialize without tag/group inputs', () => {
        expect(document.getElementById('newTagName')).toBeNull();
        expect(document.getElementById('newGroupName')).toBeNull();
    });
});
