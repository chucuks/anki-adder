import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnkiPresenter } from '../../../src/ui/presenters/anki-presenter';
import { Store } from '../../../src/ui/state/store';

describe('AnkiPresenter Tag Hiding Logic', () => {
    let presenter: AnkiPresenter;
    let store: Store;
    let mockView: any;
    let mockUseCase: any;

    beforeEach(() => {
        mockUseCase = {
            saveSetting: vi.fn(),
            saveSettings: vi.fn(),
            getAvailableDecks: vi.fn().mockResolvedValue(['Default'])
        };
        mockView = {
            updateQuickTags: vi.fn(),
            updateDecks: vi.fn(),
            setLanguage: vi.fn(),
            applyTranslations: vi.fn(),
            setAddingLoading: vi.fn(),
            showStatus: vi.fn()
        };
        store = new Store({
            lastSelectedDeck: 'Default',
            deckTags: { 'Default': ['tag_in_group', 'tag_not_in_group'] },
            tagGroups: [{ id: 'g1', name: 'Group 1', tags: ['tag_in_group'] }],
            hideSingularTags: true,
            allTags: ['tag_in_group', 'tag_not_in_group'],
            autoPosTagging: false,
            deckTagGroupHistory: {},
            dashboardTagSearchQuery: ''
        } as any);
        presenter = new AnkiPresenter(mockUseCase, store, mockView);
    });

    it('should correctly pass hideSingular flag to view', () => {
        // This just verifies the presenter passes the flag
        (presenter as any).updateQuickTags();
        expect(mockView.updateQuickTags).toHaveBeenCalledWith(expect.objectContaining({
            hideSingular: true
        }));
    });
});
