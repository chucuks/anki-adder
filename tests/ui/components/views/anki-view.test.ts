import { describe, it, expect, beforeEach } from 'vitest';
import { AnkiView } from '../../../../src/ui/components/views/anki-view';

describe('AnkiView - updateQuickTags', () => {
    let view: AnkiView;

    beforeEach(() => {
        document.body.innerHTML = `
            <select id="deckSelect"></select>
            <input id="tagSearchInput" />
            <button id="addBtn"></button>
            <div id="quickTagList"></div>
        `;
        view = new AnkiView();
    });

    it('should trigger onSearchChange when search input changes', () => {
        let capturedQuery = '';
        view.onSearchChange = (query) => capturedQuery = query;
        
        const input = document.getElementById('tagSearchInput') as HTMLInputElement;
        input.value = 'test';
        input.dispatchEvent(new Event('input'));
        
        expect(capturedQuery).toBe('test');

        // Test empty value branch
        input.value = '';
        input.dispatchEvent(new Event('input'));
        expect(capturedQuery).toBe('');
    });

    it('should hide ALL individual tags strictly when hideSingular is true', () => {
        const data = {
            allTags: ['t1', 't2', 't3'],
            groups: [{ id: 'g1', name: 'Group 1', tags: ['t1', 't2'], deckId: 'any' }],
            activeTags: ['t1', 't2', 't3'], 
            history: [],
            autoPosActive: false,
            hideSingular: true
        };

        view.updateQuickTags(data);

        const list = document.getElementById('quickTagList');
        const text = list?.textContent || '';
        
        // Should show Group 1
        expect(text).toContain('Group 1');
        
        // Should NOT show any individual tags
        expect(text).not.toContain('t1');
        expect(text).not.toContain('t2');
        expect(text).not.toContain('t3');
    });

    it('should list all tags individually and sort active ones to the left when hideSingular is false', () => {
        const data = {
            allTags: ['t1', 't2', 't3'],
            groups: [{ id: 'g1', name: 'Group 1', tags: ['t1'], deckId: 'any' }],
            activeTags: ['t3'], // Only t3 is active
            history: [],
            autoPosActive: false,
            hideSingular: false
        };

        view.updateQuickTags(data);

        const list = document.getElementById('quickTagList');
        const pills = list?.querySelectorAll('.tag-toggle-pill');
        
        // t3 is active, so it should be the first tag-toggle-pill
        expect(pills?.[0].textContent).toBe('t3');
        expect(pills?.[0].classList.contains('active')).toBe(true);
        
        // Others follow alphabetically
        expect(pills?.[1].textContent).toBe('t1');
        expect(pills?.[2].textContent).toBe('t2');
    });

    it('should color individual tags that are part of an active group', () => {
        const data = {
            allTags: ['t1', 't2'],
            groups: [{ id: 'g1', name: 'Group 1', tags: ['t1'], deckId: 'any' }],
            activeTags: ['t1'], // g1 is active because t1 is active
            history: [],
            autoPosActive: false,
            hideSingular: false
        };

        view.updateQuickTags(data);

        const list = document.getElementById('quickTagList');
        const text = list?.textContent || '';
        
        expect(text).toContain('Group 1');
        const t1Pill = list?.querySelector('.tag-toggle-pill');
        expect(t1Pill?.textContent).toBe('t1');
        expect(t1Pill?.classList.contains('active')).toBe(true);
    });

    it('should filter tag groups by name and tags', () => {
        const data = {
            allTags: ['t1', 't2', 't3'],
            groups: [
                { id: 'g1', name: 'Alpha', tags: ['t1'], deckId: 'any' },
                { id: 'g2', name: 'Beta', tags: ['t2'], deckId: 'any' }
            ],
            activeTags: [],
            history: [],
            autoPosActive: false,
            hideSingular: false,
            searchQuery: 't1' // Should match g1 (by tag)
        };

        view.updateQuickTags(data);
        let text = document.getElementById('quickTagList')?.textContent || '';
        expect(text).toContain('Alpha');
        expect(text).not.toContain('Beta');

        data.searchQuery = 'Beta'; // Should match g2 (by name)
        view.updateQuickTags(data);
        text = document.getElementById('quickTagList')?.textContent || '';
        expect(text).not.toContain('Alpha');
        expect(text).toContain('Beta');
    });

    it('should handle missing elements gracefully', () => {
        document.body.innerHTML = '';
        const brokenView = new AnkiView();
        brokenView.updateDecks(['Default']);
        brokenView.setAddingLoading(true);
        brokenView.updateQuickTags({
            allTags: [], groups: [], activeTags: [], history: [],
            autoPosActive: false, hideSingular: false
        });
    });
});
