import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TagManagerPresenter } from '@/ui/presenters/tag-manager-presenter';
import { Store } from '@/ui/state/store';
import { ITagManagerView } from '@/ui/presenters/view-interfaces';

describe('UI / Presenters / TagManagerPresenter', () => {
    let presenter: TagManagerPresenter;
    let mockUseCase: any;
    let store: Store;
    let mockView: ITagManagerView;

    const initialState: any = {
        allTags: ['t1'],
        tagGroups: [{ id: 'g1', name: 'G1', tags: ['t1'], deckId: 'any' }],
        selectedGroupInManagerId: null,
        tagDeleteMode: false,
        groupDeleteMode: false,
        globalTagSearchQuery: '',
        globalGroupSearchQuery: '',
        deckTags: {}
    };

    beforeEach(() => {
        mockUseCase = {
            saveSetting: vi.fn().mockResolvedValue(undefined),
            saveSettings: vi.fn().mockResolvedValue(undefined)
        };
        store = new Store(initialState);
        mockView = {
            renderTags: vi.fn(),
            renderGroups: vi.fn(),
            updateDeleteModes: vi.fn(),
            toggleOverlay: vi.fn(),
            setLanguage: vi.fn(),
            applyTranslations: vi.fn(),
            onTagClick: vi.fn(),
            onGroupClick: vi.fn(),
            showStatus: vi.fn()
        };
        presenter = new TagManagerPresenter(mockUseCase as any, store, mockView);
    });

    it('should add tags (splitting and cleaning)', async () => {
        await presenter.addTag(' t2, t3 ');
        expect(store.getState().allTags).toContain('t2');
        
        // Line 35: tag longer than 32 chars
        const longTag = 'a'.repeat(40);
        await presenter.addTag(longTag);
        expect(store.getState().allTags.some(t => t.length === 32)).toBe(true);

        expect(mockUseCase.saveSetting).toHaveBeenCalledWith('allTags', expect.anything());

        // Test empty name branch (line 29)
        const initialCount = store.getState().allTags.length;
        await presenter.addTag('  ');
        expect(store.getState().allTags.length).toBe(initialCount);

        // Test duplicate name branch (line 41)
        await presenter.addTag('t1');
        expect(store.getState().allTags.length).toBe(initialCount); // no new tags added
    });

    it('should add groups', async () => {
        await presenter.addGroup('New Group');
        expect(store.getState().tagGroups).toHaveLength(2);
        expect(store.getState().tagGroups[1].name).toBe('New Group');

        // Test empty name branch (line 57)
        await presenter.addGroup('  ');
        expect(store.getState().tagGroups).toHaveLength(2);

        // Test duplicate name branch (line 57)
        await presenter.addGroup('G1');
        expect(store.getState().tagGroups).toHaveLength(2);
    });

    it('should delete tags and update groups/deckTags', async () => {
        store.update('deckTags', { 'Default': ['t1'] });
        await presenter.deleteTag('t1');
        expect(store.getState().allTags).not.toContain('t1');
        expect(store.getState().tagGroups[0].tags).not.toContain('t1');
        expect(store.getState().deckTags['Default']).not.toContain('t1');
    });

    it('should delete groups and clear selection', async () => {
        store.update('selectedGroupInManagerId', 'g1');
        await presenter.deleteGroup('g1');
        expect(store.getState().tagGroups).toHaveLength(0);
        expect(store.getState().selectedGroupInManagerId).toBeNull();
    });

    it('should delete group without clearing selection when IDs differ (L109 false)', async () => {
        store.update('selectedGroupInManagerId', 'g2');
        await presenter.deleteGroup('g1');
        expect(store.getState().tagGroups).toHaveLength(0);
        expect(store.getState().selectedGroupInManagerId).toBe('g2');
    });

    it('should toggle tags in groups', async () => {
        // Toggle off
        await presenter.toggleTagInGroup('g1', 't1');
        expect(store.getState().tagGroups[0].tags).not.toContain('t1');
        // Toggle on
        await presenter.toggleTagInGroup('g1', 't2');
        expect(store.getState().tagGroups[0].tags).toContain('t2');
    });

    it('should handle modes and search', () => {
        presenter.toggleTagDeleteMode();
        expect(store.getState().tagDeleteMode).toBe(true);
        presenter.toggleGroupDeleteMode();
        expect(store.getState().groupDeleteMode).toBe(true);
        
        presenter.selectGroup('g1');
        expect(store.getState().selectedGroupInManagerId).toBe('g1');
        presenter.selectGroup('g1'); // toggle off
        expect(store.getState().selectedGroupInManagerId).toBeNull();

        presenter.searchTags('query');
        expect(store.getState().globalTagSearchQuery).toBe('query');
        presenter.searchGroups('q');
        expect(store.getState().globalGroupSearchQuery).toBe('q');
    });

    it('should open and render', () => {
        presenter.open();
        expect(mockView.toggleOverlay).toHaveBeenCalledWith(true);
        expect(mockView.renderTags).toHaveBeenCalled();
    });

    it('should dispose and clear subscriptions', () => {
        presenter.dispose();
    });
});
