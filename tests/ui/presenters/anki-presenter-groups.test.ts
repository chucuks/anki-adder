import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnkiPresenter } from '../../../src/ui/presenters/anki-presenter';
import { Store } from '../../../src/ui/state/store';

describe('AnkiPresenter Group Toggle Logic', () => {
    let presenter: AnkiPresenter;
    let store: Store;
    let mockUseCase: any;
    let mockView: any;

    beforeEach(() => {
        store = new Store({
            lastSelectedDeck: 'Deck1',
            deckTags: {
                'Deck1': []
            },
            tagGroups: [
                { id: 'g1', name: 'Group 1', tags: ['common', 'only1'], deckId: 'any' },
                { id: 'g2', name: 'Group 2', tags: ['common', 'only2'], deckId: 'any' }
            ],
            allTags: ['common', 'only1', 'only2'],
            deckTagGroupHistory: {}
        } as any);

        mockUseCase = {
            saveSetting: vi.fn().mockResolvedValue(undefined),
            saveSettings: vi.fn().mockResolvedValue(undefined),
            getAvailableDecks: vi.fn().mockResolvedValue(['Deck1'])
        };

        mockView = {
            setupSubscriptions: vi.fn(),
            updateQuickTags: vi.fn(),
            setLanguage: vi.fn(),
            applyTranslations: vi.fn(),
            showStatus: vi.fn(),
            setAddingLoading: vi.fn()
        };

        presenter = new AnkiPresenter(mockUseCase, store, mockView);
    });

    it('should NOT remove common tags when one group is deselected but another group with same tag is still active', async () => {
        // 1. Select Group 1
        await presenter.handleGroupToggle('g1');
        // deckTags['Deck1'] should have ['common', 'only1']
        expect(store.getState().deckTags['Deck1']).toContain('common');
        expect(store.getState().deckTags['Deck1']).toContain('only1');

        // 2. Select Group 2
        await presenter.handleGroupToggle('g2');
        // deckTags['Deck1'] should have ['common', 'only1', 'only2']
        expect(store.getState().deckTags['Deck1']).toContain('common');
        expect(store.getState().deckTags['Deck1']).toContain('only1');
        expect(store.getState().deckTags['Deck1']).toContain('only2');

        // 3. Deselect Group 1
        await presenter.handleGroupToggle('g1');
        
        // BUG REPRO: Currently 'common' is removed because it's in g1's tags.
        // EXPECTED: 'common' should STAY because g2 is still fully selected.
        const currentTags = store.getState().deckTags['Deck1'];
        expect(currentTags).toContain('common'); // This is expected to FAIL currently
        expect(currentTags).not.toContain('only1');
        expect(currentTags).toContain('only2');
    });
});
