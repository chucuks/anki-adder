import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppController } from '../../../src/ui/controllers/app-controller';
import { VocabularyUseCase } from '../../../src/application/use-cases';

describe('Search Features Integration', () => {
    let controller: AppController;
    let useCase: any;

    beforeEach(async () => {
        document.body.innerHTML = `
            <div id="statusBox" class="hidden"></div>
            <header>
                <div id="settingsBtn"></div>
            </header>
            <section class="controls-grid">
                <select id="deckSelect"></select>
                <div id="quickTagList"></div>
                <div class="search-container">
                    <input type="text" id="wordInput" />
                    <button id="clearWordBtn" class="hidden"></button>
                    <button id="searchBtn"></button>
                </div>
            </section>
            <section id="resultCard" class="hidden">
                <div id="existingWordCount" class="hidden"></div>
                <button id="toggleSelectBtn"></button>
                <div id="meaningsList"></div>
                <button id="addBtn"></button>
            </section>
            <div id="initialEmptyState"></div>
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
        `;

        useCase = {
            getSettings: vi.fn().mockResolvedValue({
                allTags: [],
                tagGroups: [],
                deckTags: {},
                hideSingularTags: false,
                deckTagGroupHistory: {},
                language: 'en',
                theme: 'standard',
                font: 'outfit',
                fontSize: 16,
                showIdioms: true,
                audioMode: 'none',
                autoSearchEnabled: false,
                autoSearchDelay: 1000,
                frontSideMode: 'example',
                autoPosTagging: false
            }),
            saveSetting: vi.fn(),
            saveSettings: vi.fn(),
            searchWord: vi.fn().mockResolvedValue({ meanings: [] }),
            checkExistingMeanings: vi.fn().mockResolvedValue({ existing: new Set() }),
            getAvailableDecks: vi.fn().mockResolvedValue([])
        };

        controller = new AppController(useCase as any);
        await controller.init();
    });

    it('should show clear button when typing and hide when empty', () => {
        const input = document.getElementById('wordInput') as HTMLInputElement;
        const clearBtn = document.getElementById('clearWordBtn')!;

        input.value = 'hello';
        input.dispatchEvent(new Event('input'));

        // This is expected to FAIL if we haven't implemented it yet
        expect(clearBtn.classList.contains('hidden')).toBe(false);

        input.value = '';
        input.dispatchEvent(new Event('input'));
        expect(clearBtn.classList.contains('hidden')).toBe(true);
    });

    it('should clear input and results when clear button is clicked', async () => {
        const input = document.getElementById('wordInput') as HTMLInputElement;
        const clearBtn = document.getElementById('clearWordBtn')!;
        const list = document.getElementById('meaningsList')!;

        input.value = 'test';
        list.innerHTML = '<div>Result</div>';
        
        clearBtn.click();

        expect(input.value).toBe('');
        expect(list.innerHTML).toBe('');
    });

    it('should trigger search when search button is clicked', async () => {
        const input = document.getElementById('wordInput') as HTMLInputElement;
        const searchBtn = document.getElementById('searchBtn')!;

        input.value = 'apple';
        searchBtn.click();

        expect(useCase.searchWord).toHaveBeenCalledWith('apple');
    });
});
