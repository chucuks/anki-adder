import { describe, it, expect, beforeEach } from 'vitest';
import { AnkiView } from '../../../../src/ui/components/views/anki-view';

describe('AnkiView - Tag Search and Hiding', () => {
    let view: AnkiView;

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="deckSelectRow" style="display:flex;">
                <select id="deckSelect"></select>
                <input id="tagSearchInput" type="text">
            </div>
            <button id="addBtn"></button>
            <div id="quickTagList"></div>
        `;
        view = new AnkiView();
    });

    it('should filter groups and tags by search query', () => {
        const data = {
            allTags: ['apple', 'banana', 'cherry'],
            groups: [
                { id: 'g1', name: 'Fruits', tags: ['apple', 'banana'], deckId: 'any' },
                { id: 'g2', name: 'Berries', tags: ['cherry'], deckId: 'any' }
            ],
            activeTags: ['apple', 'cherry'],
            history: [],
            autoPosActive: false,
            hideSingular: false,
            searchQuery: 'app' // Searching for "app"
        };

        // Note: I will need to update AnkiView to accept searchQuery in data
        (view as any).updateQuickTags({ ...data, searchQuery: 'app' });

        const list = document.getElementById('quickTagList');
        const text = list?.textContent || '';
        
        expect(text).toContain('Fruits'); // Matches "app" because its tag "apple" matches? 
        // Wait, the user said "tag grubu veya tag aratılabilsin". 
        // So searching "Fruits" should show the group. Searching "apple" should show the group OR the tag.
        // Let's assume group matches if its name matches OR any of its tags matches.
        
        expect(text).toContain('apple'); // Matches "app"
        expect(text).not.toContain('Berries'); // Does not match "app"
        expect(text).not.toContain('cherry'); // Does not match "app"
    });

    it('should respect hideSingular even during search', () => {
        const data = {
            allTags: ['apple', 'banana', 'cherry'],
            groups: [{ id: 'g1', name: 'Fruits', tags: ['apple', 'banana'], deckId: 'any' }],
            activeTags: ['apple', 'banana', 'cherry'], // Group "Fruits" is active
            history: [],
            autoPosActive: false,
            hideSingular: true,
            searchQuery: 'a' // Matches "apple", "banana", "Fruits"
        };

        (view as any).updateQuickTags({ ...data, searchQuery: 'a' });

        const list = document.getElementById('quickTagList');
        const text = list?.textContent || '';
        
        expect(text).toContain('Fruits');
        expect(text).not.toContain('cherry'); // Does not match "a"
        // "apple" matches "a". "banana" matches "a".
        // But "apple" and "banana" are in an ACTIVE group "Fruits".
        // So they should be HIDDEN because hideSingular is true.
        
        expect(text).not.toContain('apple');
        expect(text).not.toContain('banana');
    });

    it('should reproduce the bug: individual tags appearing after group click', () => {
        // Bug scenario:
        // 1. hideSingular is true.
        // 2. Group "G1" has tag "T1".
        // 3. User clicks "G1".
        // 4. "T1" is added to activeTags.
        // 5. Expected: "G1" is active, "T1" is hidden.
        // 6. Actual (according to user): "T1" appears.

        const data = {
            allTags: ['T1', 'Other'],
            groups: [{ id: 'g1', name: 'G1', tags: ['T1'], deckId: 'any' }],
            activeTags: ['T1'], // G1 is now active
            history: [],
            autoPosActive: false,
            hideSingular: true,
            searchQuery: ''
        };

        view.updateQuickTags(data as any);

        const list = document.getElementById('quickTagList');
        const text = list?.textContent || '';
        
        expect(text).toContain('G1');
        expect(text).not.toContain('T1'); // THIS IS THE BUG FIX VERIFICATION
    });
});
