import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Store, AppState } from '@/ui/state/store';

describe('UI / State / Store', () => {
    let store: Store;
    const initialState: AppState = {
        theme: 'standard', font: 'outfit', fontSize: 16, language: 'en',
        showIdioms: true, audioMode: 'none', autoSearchEnabled: false, autoSearchDelay: 1000,
        frontSideMode: 'example', allTags: [], tagGroups: [], deckTags: {}, 
        deckTagGroupHistory: {}, autoPosTagging: false, hideSingularTags: false,
        selectedMeanings: new Set(), searchResults: [], highlightedExamples: [], isSearching: false, isAdding: false,
        existingIndices: new Set(), totalExistingCount: 0, currentWord: '',
        selectedGroupInManagerId: null, tagDeleteMode: false, groupDeleteMode: false,
        globalTagSearchQuery: '', globalGroupSearchQuery: '', dashboardTagSearchQuery: '',
        hideExistingResults: false, autoSearchDelayUnit: 'ms'
    };

    beforeEach(() => {
        store = new Store(initialState);
    });

    it('should initialize with provided state', () => {
        expect(store.getState()).toEqual(initialState);
    });

    it('should update state and notify subscribers', () => {
        const listener = vi.fn();
        store.subscribe('theme', listener);

        // Initial call on subscribe
        expect(listener).toHaveBeenCalledWith('standard');

        store.update('theme', 'midnight');
        expect(store.getState().theme).toBe('midnight');
        expect(listener).toHaveBeenCalledWith('midnight');
    });

    it('should not notify if value is same (primitives)', () => {
        const listener = vi.fn();
        store.subscribe('theme', listener);
        listener.mockClear();

        store.update('theme', 'standard');
        expect(listener).not.toHaveBeenCalled();
    });

    it('should update multiple keys and notify once per key', () => {
        const themeListener = vi.fn();
        const langListener = vi.fn();
        store.subscribe('theme', themeListener);
        store.subscribe('language', langListener);
        themeListener.mockClear();
        langListener.mockClear();

        store.updateMany({ theme: 'light', language: 'tr' });
        
        expect(themeListener).toHaveBeenCalledWith('light');
        expect(langListener).toHaveBeenCalledWith('tr');
        expect(store.getState().theme).toBe('light');
        expect(store.getState().language).toBe('tr');
    });

    it('should allow unsubscribing', () => {
        const listener = vi.fn();
        const unsubscribe = store.subscribe('theme', listener);
        listener.mockClear();

        unsubscribe();
        store.update('theme', 'midnight');
        expect(listener).not.toHaveBeenCalled();
    });

    it('should notify on Set value change', () => {
        const listener = vi.fn();
        store.subscribe('selectedMeanings', listener);
        listener.mockClear();

        const different = new Set([1]);
        store.update('selectedMeanings', different);
        expect(listener).toHaveBeenCalledWith(different);
    });

    it('should getState deep copy not share Set references', () => {
        const state = store.getState();
        state.selectedMeanings.add(42);
        expect(store.getState().selectedMeanings.has(42)).toBe(false);
    });

    it('should not notify on subscribe with notifyInitial=false', () => {
        const listener = vi.fn();
        store.subscribe('theme', listener, false);
        expect(listener).not.toHaveBeenCalled();
    });

    it('should not notify if Set has same content (empty)', () => {
        const listener = vi.fn();
        store.subscribe('selectedMeanings', listener);
        listener.mockClear();

        const sameContent = new Set(store.getState().selectedMeanings);
        store.update('selectedMeanings', sameContent);
        expect(listener).not.toHaveBeenCalled();
    });

    it('should not notify if non-empty Set has same content (L49 .every callback)', () => {
        store.update('selectedMeanings', new Set([1, 2, 3]));
        const listener = vi.fn();
        store.subscribe('selectedMeanings', listener);
        listener.mockClear();

        store.update('selectedMeanings', new Set([1, 2, 3]));
        expect(listener).not.toHaveBeenCalled();
    });

    it('should catch listener errors in notify (L83)', () => {
        const throwingListener = () => { throw new Error('listener error'); };
        store.subscribe('theme', throwingListener, false);
        
        expect(() => store.update('theme', 'midnight')).not.toThrow();
    });

    it('should deep copy highlightedExamples array in getState', () => {
        store.update('highlightedExamples', ['ex1', 'ex2']);
        const state = store.getState();
        state.highlightedExamples.push('ex3');
        expect(store.getState().highlightedExamples).toEqual(['ex1', 'ex2']);
    });
});
