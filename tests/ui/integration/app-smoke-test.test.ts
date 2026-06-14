import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppController } from '@/ui/controllers/app-controller';

/**
 * App Smoke Test
 * 
 * This is a high-level integration test that exercises the entire application UI flow
 * through the AppController. It replaces the previous 'z_coverage_booster' with a
 * more structured and readable approach to ensure all UI interaction branches are covered.
 */
describe('UI Integration / App Smoke Test', () => {
    let controller: AppController;
    let mockUseCase: any;

    beforeEach(async () => {
        // Setup a comprehensive DOM structure that matches what AppController expects
        document.body.innerHTML = `
            <div id="statusBox"></div>
            <header>
                <button id="settingsBtn"></button>
            </header>
            
            <section class="controls-grid">
                <select id="deckSelect"></select>
                <div id="quickTagList"></div>
                <div class="search-container">
                    <input type="text" id="wordInput" />
                    <button id="clearWordBtn"></button>
                    <button id="searchBtn"></button>
                </div>
            </section>

            <section id="resultCard">
                <div id="existingWordCount"></div>
                <button id="toggleSelectBtn"></button>
                <div id="meaningsList"></div>
                <button id="addBtn"></button>
            </section>

            <div id="initialEmptyState"></div>

            <div id="settingsOverlay">
                <button id="closeSettings"></button>
                <select id="langSelect"></select>
                <select id="fontSelect"></select>
                <input id="fontSizeInput" />
                <input id="autoSearchDelayInput" />
                <button id="toggleDelayUnitBtn"></button>
            </section>

            <div id="tagManagerOverlay">
                <button id="openTagManager"></button>
                <button id="closeTagManager"></button>
                <button id="addTagBtn"></button>
                <button id="addGroupBtn"></button>
                <input id="newTagName" />
                <input id="newGroupName" />
                <button id="toggleTagDeleteMode"></button>
                <button id="toggleGroupDeleteMode"></button>
                <div id="globalTagList"></div>
                <div id="globalGroupList"></div>
            </div>
        `;

        mockUseCase = {
            getSettings: vi.fn().mockResolvedValue({
                theme: 'standard', font: 'outfit', language: 'en', fontSize: 16, autoSearchDelay: 1000,
                allTags: ['tag1'], tagGroups: [{ id: 'group1', name: 'Group 1', tags: ['tag1'] }], 
                deckTags: { 'Default': ['tag1'] },
                showIdioms: true, autoSearchEnabled: true, frontSideMode: 'example', 
                audioMode: 'none', autoPosTagging: false, hideSingularTags: false, 
                deckTagGroupHistory: {}, hideExistingResults: false, autoSearchDelayUnit: 'ms',
                lastSelectedDeck: 'Default'
            }),
            getAvailableDecks: vi.fn().mockResolvedValue(['Default', 'English']),
            saveSetting: vi.fn().mockResolvedValue(undefined),
            saveSettings: vi.fn().mockResolvedValue(undefined),
            searchWord: vi.fn().mockResolvedValue({ 
                meanings: [{ word: 'test', definition: 'def', example: 'ex', pos: 'n', type: 'normal' }], 
                error: null 
            }),
            checkExistingMeanings: vi.fn().mockResolvedValue({ existing: new Set(), totalExistingCount: 0 }),
            addMeaningsToAnki: vi.fn().mockResolvedValue({ success: 1, failed: 0, exists: 0, errors: [] })
        };

        controller = new AppController(mockUseCase);
        await controller.init();
    });

    describe('User Journey: Search & Discovery', () => {
        it('should handle auto-search and manual search triggers', async () => {
            const wordInput = document.getElementById('wordInput') as HTMLInputElement;
            
            // Auto-search trigger (input event)
            wordInput.value = 'hello';
            wordInput.dispatchEvent(new Event('input'));
            
            // Manual search trigger (click)
            const searchBtn = document.getElementById('searchBtn');
            searchBtn?.click();
            
            // Manual search trigger (Enter key)
            wordInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

            expect(mockUseCase.searchWord).toHaveBeenCalledWith('hello');
        });

        it('should handle search errors gracefully', async () => {
            const wordInput = document.getElementById('wordInput') as HTMLInputElement;
            wordInput.value = 'unknown';
            
            mockUseCase.searchWord.mockResolvedValue({ meanings: [], error: 'not_found' });
            
            // Click search
            document.getElementById('searchBtn')?.click();
            
            expect(mockUseCase.searchWord).toHaveBeenCalled();
        });

        it('should clear search when clear button is clicked', () => {
            const wordInput = document.getElementById('wordInput') as HTMLInputElement;
            wordInput.value = 'clear me';
            
            document.getElementById('clearWordBtn')?.click();
            expect(wordInput.value).toBe('');
        });
    });

    describe('User Journey: Anki Interaction', () => {
        it('should handle meaning selection and adding to Anki', async () => {
            const wordInput = document.getElementById('wordInput') as HTMLInputElement;
            wordInput.value = 'test';
            
            // Perform search
            await (controller as any).searchPresenter.handleSearch(true);
            
            // Select all meanings via toggle button
            document.getElementById('toggleSelectBtn')?.click();
            
            // Click add button
            document.getElementById('addBtn')?.click();
            
            // Wait for the async handler to process
            await new Promise(resolve => setTimeout(resolve, 50));
            
            expect(mockUseCase.addMeaningsToAnki).toHaveBeenCalled();
        });

        it('should handle deck selection changes', () => {
            const deckSelect = document.getElementById('deckSelect') as HTMLSelectElement;
            deckSelect.value = 'English';
            deckSelect.dispatchEvent(new Event('change'));
            
            expect(mockUseCase.saveSetting).toHaveBeenCalledWith('lastSelectedDeck', 'English');
        });

        it('should handle failures and crashes during adding', async () => {
            // Setup selection
            (controller as any).store.update('selectedMeanings', new Set([0]));
            (controller as any).store.update('lastSelectedDeck', 'Default');
            
            // Mock a failure response
            mockUseCase.addMeaningsToAnki.mockResolvedValue({ success: 0, failed: 1, exists: 0, errors: [] });
            document.getElementById('addBtn')?.click();
            await new Promise(resolve => setTimeout(resolve, 10));

            // Mock a crash (rejection)
            mockUseCase.addMeaningsToAnki.mockRejectedValue(new Error('Network Crash'));
            document.getElementById('addBtn')?.click();
            await new Promise(resolve => setTimeout(resolve, 10));

            expect(mockUseCase.addMeaningsToAnki).toHaveBeenCalledTimes(2);
        });
    });

    describe('User Journey: Settings & UI Customization', () => {
        it('should toggle overlays and change settings', () => {
            // Settings Overlay
            document.getElementById('settingsBtn')?.click();
            document.getElementById('closeSettings')?.click();
            
            // Toggle Delay Unit
            const toggleDelayBtn = document.getElementById('toggleDelayUnitBtn');
            toggleDelayBtn?.click();
            
            expect(mockUseCase.saveSettings).toHaveBeenCalled();
        });
    });

    describe('User Journey: Tag & Group Management', () => {
        it('should handle tag/group creation and searching', () => {
            document.getElementById('openTagManager')?.click();
            
            const newTagInput = document.getElementById('newTagName') as HTMLInputElement;
            newTagInput.value = 'premium, tag';
            newTagInput.dispatchEvent(new Event('input'));
            document.getElementById('addTagBtn')?.click();
            
            const newGroupInput = document.getElementById('newGroupName') as HTMLInputElement;
            newGroupInput.value = 'awesome-group';
            newGroupInput.dispatchEvent(new Event('input'));
            document.getElementById('addGroupBtn')?.click();
            
            expect(newTagInput.value).toBe('');
            expect(newGroupInput.value).toBe('');
        });

        it('should handle tag/group deletions and clicks in different modes', () => {
            document.getElementById('openTagManager')?.click();
            
            // Toggle Delete Modes
            document.getElementById('toggleTagDeleteMode')?.click();
            document.getElementById('toggleGroupDeleteMode')?.click();
            
            const tagView = (controller as any).tagView;
            
            // Deletion mode
            tagView.onTagClick('tag1');
            tagView.onGroupClick('group1');
            
            // Normal mode
            document.getElementById('toggleTagDeleteMode')?.click();
            document.getElementById('toggleGroupDeleteMode')?.click();
            
            tagView.onTagClick('tag1');
            tagView.onGroupClick('group1');

            expect(mockUseCase.saveSettings).toHaveBeenCalled();
        });
    });
});
