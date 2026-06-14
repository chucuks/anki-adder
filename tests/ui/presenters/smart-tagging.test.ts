import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnkiPresenter } from '@/ui/presenters/anki-presenter';
import { Store } from '@/ui/state/store';

describe('AnkiPresenter Smart Tagging Logic', () => {
    let presenter: AnkiPresenter;
    let store: Store;
    let mockUseCase: any;
    let mockView: any;

    beforeEach(() => {
        const initialState = {
            lastSelectedDeck: 'Deck1',
            deckTags: { 'Deck1': [] },
            tagGroups: [
                { id: 'g1', name: 'Group 1', tags: ['tagA', 'tagB'] },
                { id: 'g2', name: 'Group 2', tags: ['tagB', 'tagC'] }
            ],
            deckSelectedGroupIds: { 'Deck1': [] },
            deckTagGroupHistory: {}
        };
        store = new Store(initialState as any);
        mockUseCase = {
            saveSetting: vi.fn().mockResolvedValue(undefined),
            saveSettings: vi.fn().mockResolvedValue(undefined)
        };
        mockView = { 
            updateQuickTags: vi.fn(), 
            showStatus: vi.fn(), 
            updateDecks: vi.fn(),
            setAddingLoading: vi.fn(),
            setLanguage: vi.fn(),
            applyTranslations: vi.fn()
        };
        presenter = new AnkiPresenter(mockUseCase, store, mockView);
    });

    it('should select a group when all its tags are selected', async () => {
        await presenter.handleTagToggle('tagA');
        await presenter.handleTagToggle('tagB');
        
        const state = store.getState();
        expect(state.deckSelectedGroupIds!['Deck1']).toContain('g1');
    });

    it('should deselect a group when one tag is removed', async () => {
        await presenter.handleGroupToggle('g1');
        expect(store.getState().deckTags['Deck1']).toContain('tagA');
        
        await presenter.handleTagToggle('tagA');
        expect(store.getState().deckTags['Deck1']).not.toContain('tagA');
        expect(store.getState().deckTags['Deck1']).toContain('tagB');
        expect(store.getState().deckSelectedGroupIds!['Deck1']).not.toContain('g1');
    });

    it('should protect shared tags in overlapping groups', async () => {
        // Both groups share tagB
        await presenter.handleGroupToggle('g1');
        await presenter.handleGroupToggle('g2');
        
        // Turning off G1 should remove tagA, but KEEP tagB because G2 is still active
        await presenter.handleGroupToggle('g1');
        
        const state = store.getState();
        expect(state.deckTags['Deck1']).not.toContain('tagA');
        expect(state.deckTags['Deck1']).toContain('tagB');
        expect(state.deckTags['Deck1']).toContain('tagC');
    });

    describe('Nested Groups', () => {
        beforeEach(() => {
            store.update('tagGroups', [
                { id: 'large', name: 'Large', tags: ['A', 'B', 'C'] },
                { id: 'small', name: 'Small', tags: ['A', 'B'] }
            ]);
        });

        it('should turn off both groups when Parent is deselected (fix 2-click issue)', async () => {
            await presenter.handleGroupToggle('large');
            let state = store.getState();
            expect(state.deckTags['Deck1']).toEqual(['A', 'B', 'C']);
            expect(state.deckSelectedGroupIds!['Deck1']).toContain('large');
            expect(state.deckSelectedGroupIds!['Deck1']).toContain('small');

            // Turn off Large
            await presenter.handleGroupToggle('large');
            state = store.getState();
            // Expected: Both should be gone
            expect(state.deckTags['Deck1']).not.toContain('A');
            expect(state.deckTags['Deck1']).not.toContain('B');
            expect(state.deckTags['Deck1']).not.toContain('C');
        });

        it('should allow independent deselection of Child (fix "can\'t turn off" issue)', async () => {
            await presenter.handleGroupToggle('large');
            
            // Turn off Small
            await presenter.handleGroupToggle('small');
            const state = store.getState();
            // Expected: A and B should be gone. C should stay.
            expect(state.deckTags['Deck1']).not.toContain('A');
            expect(state.deckTags['Deck1']).not.toContain('B');
            expect(state.deckTags['Deck1']).toContain('C');
        });
    });
});
