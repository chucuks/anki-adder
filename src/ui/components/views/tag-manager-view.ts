import { BaseComponent } from '../base-component';
import { ITagManagerView } from '../../presenters/view-interfaces';
import { TagGroup } from '../../../domain/entities';

export class TagManagerView extends BaseComponent implements ITagManagerView {
    private elements: {
        overlay: HTMLElement | null;
        tagList: HTMLElement | null;
        groupList: HTMLElement | null;
        toggleTagDeleteBtn: HTMLElement | null;
        toggleGroupDeleteBtn: HTMLElement | null;
    };

    onTagClick!: (tag: string) => void;
    onGroupClick!: (id: string) => void;

    constructor() {
        super();
        this.elements = {
            overlay: this.getEl('tagManagerOverlay'),
            tagList: this.getEl('globalTagList'),
            groupList: this.getEl('globalGroupList'),
            toggleTagDeleteBtn: this.getEl('toggleTagDeleteMode'),
            toggleGroupDeleteBtn: this.getEl('toggleGroupDeleteMode')
        };
    }

    toggleOverlay(open: boolean): void {
        this.elements.overlay?.classList.toggle('open', open);
    }

    updateDeleteModes(tagDeleteMode: boolean, groupDeleteMode: boolean): void {
        this.elements.toggleTagDeleteBtn?.classList.toggle('active', tagDeleteMode);
        this.elements.toggleGroupDeleteBtn?.classList.toggle('active', groupDeleteMode);
    }

    renderTags(tags: string[], selectedGroup: TagGroup | null, deleteMode: boolean, query?: string): void {
        if (!this.elements.tagList) return;
        this.elements.tagList.innerHTML = '';

        const groupTags = (selectedGroup && Array.isArray(selectedGroup.tags)) ? selectedGroup.tags : [];
        const groupTagSet = new Set(groupTags);

        // Sort: members first, then alphabetical
        const sorted = [...tags].sort((a, b) => {
            const aIn = groupTagSet.has(a) ? 1 : 0;
            const bIn = groupTagSet.has(b) ? 1 : 0;
            if (aIn !== bIn) return bIn - aIn;
            return a.localeCompare(b);
        });

        const filtered = query ? sorted.filter(t => t.toLowerCase().includes(query.toLowerCase())) : sorted;

        filtered.forEach(tag => {
            const chip = document.createElement('div');
            chip.className = `tag-chip selectable ${deleteMode ? 'delete-mode' : ''}`;
            chip.setAttribute('data-tag', tag);
            if (groupTagSet.has(tag)) chip.classList.add('member-active');
            const span = document.createElement('span');
            span.textContent = tag;
            chip.appendChild(span);
            this.makeInteractive(chip, () => this.onTagClick?.(tag));
            this.elements.tagList?.appendChild(chip);
        });
    }

    renderGroups(groups: TagGroup[], selectedGroupId: string | null, deleteMode: boolean, query?: string): void {
        if (!this.elements.groupList) return;
        this.elements.groupList.innerHTML = '';

        const filtered = query ? groups.filter(g => g.name.toLowerCase().includes(query.toLowerCase())) : groups;
        const sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name));

        sorted.forEach(group => {
            const chip = document.createElement('div');
            chip.className = `tag-chip selectable ${deleteMode ? 'delete-mode' : ''} ${group.id === selectedGroupId ? 'active' : ''}`;
            chip.setAttribute('data-group-id', group.id);
            const span = document.createElement('span');
            span.textContent = group.name;
            chip.appendChild(span);
            this.makeInteractive(chip, () => this.onGroupClick?.(group.id));
            this.elements.groupList?.appendChild(chip);
        });
    }

    render(): void {
        // Initial setup if needed
    }
}
