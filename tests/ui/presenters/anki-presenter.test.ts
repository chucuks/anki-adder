import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnkiPresenter } from '@/ui/presenters/anki-presenter';
import { Store } from '@/ui/state/store';
import { IAnkiView } from '@/ui/presenters/view-interfaces';

describe('UI / Presenters / AnkiPresenter', () => {
    let presenter: AnkiPresenter;
    let mockUseCase: any;
    let store: Store;
    let mockView: IAnkiView;

    const initialState: any = {
        language: 'en',
        lastSelectedDeck: 'Default',
        isAdding: false,
        searchResults: [{ id: 1, text: 'meaning', pos: 'noun' }],
        selectedMeanings: new Set([0]),
        existingIndices: new Set(),
        deckTags: { 'Default': [] },
        tagGroups: [],
        deckTagGroupHistory: {},
        deckSelectedGroupIds: { 'Default': [] },
        autoPosTagging: false,
        hideSingularTags: false,
        allTags: []
    };

    beforeEach(() => {
        mockUseCase = {
            addMeaningsToAnki: vi.fn().mockResolvedValue({ success: 1, failed: 0, exists: 0, errors: [] }),
            checkExistingMeanings: vi.fn().mockResolvedValue({ existing: new Set() }),
            getAvailableDecks: vi.fn().mockResolvedValue(['Default', 'English']),
            saveSetting: vi.fn().mockResolvedValue(undefined),
            saveSettings: vi.fn().mockResolvedValue(undefined)
        };
        store = new Store(initialState);
        mockView = {
            showStatus: vi.fn(),
            setAddingLoading: vi.fn(),
            updateDecks: vi.fn(),
            updateQuickTags: vi.fn(),
            applyTranslations: vi.fn(),
            setLanguage: vi.fn()
        };
        presenter = new AnkiPresenter(mockUseCase as any, store, mockView);
    });

    it('should add meanings and handle all result types', async () => {
        // Success singular
        await presenter.handleAddToAnki();
        expect(mockView.showStatus).toHaveBeenCalledWith('success_msg_singular', 'success', { success: '1', failed: '0', exists: '0' });

        // Success plural
        mockUseCase.addMeaningsToAnki.mockResolvedValue({ success: 2, failed: 0, exists: 0, errors: [] });
        await presenter.handleAddToAnki();
        expect(mockView.showStatus).toHaveBeenCalledWith('success_msg', 'success', { success: '2', failed: '0', exists: '0' });

        // Partial success
        mockUseCase.addMeaningsToAnki.mockResolvedValue({ success: 1, failed: 1, exists: 0, errors: [] });
        await presenter.handleAddToAnki();
        expect(mockView.showStatus).toHaveBeenCalledWith('success_partial', 'info', { success: '1', failed: '1', exists: '0' });

        // All already exists (success 0, exists > 0)
        mockUseCase.addMeaningsToAnki.mockResolvedValue({ success: 0, failed: 0, exists: 1, errors: [] });
        await presenter.handleAddToAnki();
        expect(mockView.showStatus).toHaveBeenCalledWith('all_already_exists', 'info');

        // Failure
        mockUseCase.addMeaningsToAnki.mockResolvedValue({ success: 0, failed: 1, exists: 0, errors: ['api_err'] });
        await presenter.handleAddToAnki();
        expect(mockView.showStatus).toHaveBeenCalledWith('api_err', 'error');
        
        // Generic failure
        mockUseCase.addMeaningsToAnki.mockResolvedValue({ success: 0, failed: 1, exists: 0, errors: [] });
        await presenter.handleAddToAnki();
        expect(mockView.showStatus).toHaveBeenCalledWith('error_occurred', 'error');
    });

    it('should handle deck selection and empty selection', async () => {
        store.update('lastSelectedDeck', '');
        await presenter.handleAddToAnki();
        expect(mockView.showStatus).toHaveBeenCalledWith('select_deck_first', 'error');

        store.update('lastSelectedDeck', 'Default');
        store.update('selectedMeanings', new Set());
        await presenter.handleAddToAnki();
        expect(mockView.showStatus).toHaveBeenCalledWith('no_selection', 'error');
        
        // Case: everything exists already (early return)
        store.update('selectedMeanings', new Set([0]));
        store.update('existingIndices', new Set([0]));
        await presenter.handleAddToAnki();
        expect(mockView.showStatus).toHaveBeenCalledWith('all_already_exists', 'info');
    });

    it('should handle tag and group toggles (including creation/deletion)', async () => {
        const group = { id: 'g1', name: 'G1', tags: ['t1'], deckId: 'any' };
        store.update('tagGroups', [group]);

        // Toggle tag on
        await presenter.handleTagToggle('t1');
        expect(store.getState().deckTags['Default']).toContain('t1');

        // Toggle tag off
        await presenter.handleTagToggle('t1');
        expect(store.getState().deckTags['Default']).not.toContain('t1');

        // Toggle group on
        await presenter.handleGroupToggle('g1');
        expect(store.getState().deckTags['Default']).toContain('t1');

        // Toggle group off
        await presenter.handleGroupToggle('g1');
        expect(store.getState().deckTags['Default']).not.toContain('t1');
        
        // Edge cases
        store.update('lastSelectedDeck', '');
        await presenter.handleTagToggle('t1'); // no-op
        await presenter.handleGroupToggle('g1'); // no-op
        
        store.update('lastSelectedDeck', 'NewDeck');
        store.update('deckTags', {});
        await presenter.handleTagToggle('t1'); // init deck tags
        expect(store.getState().deckTags['NewDeck']).toEqual(['t1']);
    });

    it('should handle history updates and filters', async () => {
        store.updateMany({
            deckTags: { 'Default': ['t1'] },
            tagGroups: [{ id: 'g1', name: 'G1', tags: ['t1'] }],
            deckSelectedGroupIds: { 'Default': ['g1'] },
            deckTagGroupHistory: { 'Default': ['g2'] }
        });
        await presenter.handleAddToAnki();
        expect(store.getState().deckTagGroupHistory!['Default']).toEqual(['g1', 'g2']);
    });

    it('should handle loadDecks and errors', async () => {
        await presenter.loadDecks();
        expect(mockView.updateDecks).toHaveBeenCalledTimes(1);
        
        mockUseCase.getAvailableDecks.mockResolvedValue(['New']);
        await presenter.loadDecks();
        expect(mockView.updateDecks).toHaveBeenCalledTimes(2);
        
        mockUseCase.getAvailableDecks.mockRejectedValue(new Error('fail'));
        await presenter.loadDecks(); // catch
    });

    it('should react to store updates', () => {
        store.update('language', 'tr');
        expect(mockView.setLanguage).toHaveBeenCalledWith('tr');
        store.update('isAdding', true);
        expect(mockView.setAddingLoading).toHaveBeenCalledWith(true);
    });

    it('should handle startAutoUpdate', () => {
        vi.useFakeTimers();
        presenter.startAutoUpdate();
        // startAutoUpdate no longer calls loadDecks immediately; only sets up interval
        expect(mockUseCase.getAvailableDecks).not.toHaveBeenCalled();
        
        vi.advanceTimersByTime(5000);
        expect(mockUseCase.getAvailableDecks).toHaveBeenCalledTimes(1);
        
        // Call again to ensure interval is cleared
        presenter.startAutoUpdate();
        vi.useRealTimers();
    });

    it('should handle success_with_exists path (L147 exists>0 branch)', async () => {
        mockUseCase.addMeaningsToAnki.mockResolvedValue({ success: 1, failed: 0, exists: 1, errors: [] });
        await presenter.handleAddToAnki();
        expect(mockView.showStatus).toHaveBeenCalledWith('success_with_exists', 'success', expect.any(Object));
    });

    it('should handle exceptions in handleAddToAnki', async () => {
        mockUseCase.addMeaningsToAnki.mockRejectedValue(new Error('crash'));
        await presenter.handleAddToAnki();
        expect(mockView.showStatus).toHaveBeenCalledWith('error_occurred', 'error');
    });

    it('should handle auto-pos toggle', async () => {
        await presenter.handleAutoPosToggle();
        expect(store.getState().autoPosTagging).toBe(true);
    });

    it('should handle missing group in handleGroupToggle', async () => {
        const spy = vi.spyOn(store, 'update');
        await presenter.handleGroupToggle('non-existent');
        // It returns early before calling update
        expect(spy).not.toHaveBeenCalled();
    });

    it('should handle null deckSelectedGroupIds in handleTagToggle', async () => {
        store.updateMany({ deckSelectedGroupIds: null as any });
        await presenter.handleTagToggle('t1');
        expect(store.getState().deckSelectedGroupIds).toBeDefined();
    });

    it('should handle group toggle on empty deck tags (line 203)', async () => {
        store.update('lastSelectedDeck', 'EmptyDeck');
        store.update('deckTags', {});
        const group = { id: 'g1', name: 'G1', tags: ['t1'], deckId: 'any' };
        store.update('tagGroups', [group]);
        
        await presenter.handleGroupToggle('g1');
        expect(store.getState().deckTags['EmptyDeck']).toEqual(['t1']);
    });

    it('should handle turning group OFF with non-full other groups (line 220)', async () => {
        const g1 = { id: 'g1', name: 'G1', tags: ['t1'], deckId: 'any' };
        const g2 = { id: 'g2', name: 'G2', tags: ['t2'], deckId: 'any' };
        store.update('tagGroups', [g1, g2]);
        store.update('deckTags', { 'Default': ['t1'] }); // Only G1 is full
        
        // Turn G1 OFF
        await presenter.handleGroupToggle('g1');
        expect(store.getState().deckTags['Default']).toEqual([]);
        
        // Case: Turning OFF where another group is NOT full
        store.update('deckTags', { 'Default': ['t1', 'partOfG2'] }); // G1 is full, G2 is NOT full
        await presenter.handleGroupToggle('g1');
    });

    it('should dispose and stop interval', () => {
        presenter.startAutoUpdate();
        const clearSpy = vi.spyOn(globalThis, 'clearInterval');
        presenter.dispose();
        expect(clearSpy).toHaveBeenCalled();
    });

    it('should dispose without interval (null guard)', () => {
        presenter.dispose();
    });

    it('should trigger loadDecks on visibilitychange (L32)', () => {
        presenter.startAutoUpdate();
        vi.spyOn(presenter, 'loadDecks');
        (presenter as any).onVisibilityChange();
        expect((presenter as any).loadDecks).toHaveBeenCalled();
    });

    it('should skip deck update when JSON is unchanged (L147)', async () => {
        mockUseCase.getAvailableDecks.mockResolvedValue(['Default', 'English']);
        await presenter.loadDecks();
        const callCount = mockView.updateDecks.mock.calls.length;

        // Same decks again — should not call updateDecks
        await presenter.loadDecks();
        expect(mockView.updateDecks).toHaveBeenCalledTimes(callCount);
    });
});
