import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TagManagerView } from '../../../../src/ui/components/views/tag-manager-view';
import { TagGroup } from '../../../../src/domain/entities';

describe('TagManagerView', () => {
  let view: TagManagerView;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="tagManagerOverlay"></div>
      <div id="globalTagList"></div>
      <div id="globalGroupList"></div>
      <div id="toggleTagDeleteMode"></div>
      <div id="toggleGroupDeleteMode"></div>
    `;
    view = new TagManagerView();
  });

  it('should toggle overlay', () => {
    view.toggleOverlay(true);
    expect(document.getElementById('tagManagerOverlay')!.classList.contains('open')).toBe(true);

    view.toggleOverlay(false);
    expect(document.getElementById('tagManagerOverlay')!.classList.contains('open')).toBe(false);
  });

  it('should cover all sort branches', () => {
      const tags = ['in1', 'in2', 'out1', 'out2'];
      const group: TagGroup = { id: 'g1', name: 'G1', tags: ['in1', 'in2'] };
      
      // Covers:
      // aIn=1, bIn=1 (localeCompare)
      // aIn=0, bIn=0 (localeCompare)
      // aIn=1, bIn=0 (return -1)
      // aIn=0, bIn=1 (return 1)
      view.renderTags(tags, group, false);
      const chips = document.querySelectorAll('.tag-chip');
      expect(chips[0].textContent).toContain('in1');
      expect(chips[1].textContent).toContain('in2');
      expect(chips[2].textContent).toContain('out1');
      expect(chips[3].textContent).toContain('out2');
  });

  it('should render tags and handle clicks', () => {
    const tags = ['tag1', 'tag2'];
    const spy = vi.fn();
    view.onTagClick = spy;

    view.renderTags(tags, null, false);
    const list = document.getElementById('globalTagList')!;
    const chips = list.querySelectorAll('.tag-chip');
    expect(chips.length).toBe(2);

    (chips[0] as HTMLElement).click();
    expect(spy).toHaveBeenCalledWith('tag1');
  });

  it('should filter tags by query', () => {
    const tags = ['tag1', 'tag2'];

    // Should filter by query
    view.renderTags(tags, null, false, 'tag1');
    expect(document.querySelectorAll('.tag-chip').length).toBe(1);
    expect(document.querySelector('.tag-chip')?.textContent).toContain('tag1');
  });

  it('should cover all sort branches', () => {
      const tags = ['in1', 'in2', 'out1', 'out2'];
      const group: TagGroup = { id: 'g1', name: 'G1', tags: ['in1', 'in2'] };
      
      view.renderTags(tags, group, false);
      const chips = document.querySelectorAll('.tag-chip');
      expect(chips[0].textContent).toContain('in1');
      expect(chips[1].textContent).toContain('in2');
      expect(chips[2].textContent).toContain('out1');
      expect(chips[3].textContent).toContain('out2');
  });

  it('should render groups and handle clicks', () => {
    const groups: TagGroup[] = [{ id: 'g1', name: 'Group 1', tags: [] }];
    const spy = vi.fn();
    view.onGroupClick = spy;

    view.renderGroups(groups, 'g1', false);
    const items = document.querySelectorAll('[data-group-id]');
    expect(items.length).toBe(1);
    expect(items[0].classList.contains('active')).toBe(true);

    (items[0] as HTMLElement).click();
    expect(spy).toHaveBeenCalledWith('g1');
  });

  it('should handle delete mode clicks', () => {
    const tags = ['tag1'];
    const groups: TagGroup[] = [{ id: 'g1', name: 'Group 1', tags: [] }];
    const tagSpy = vi.fn();
    const groupSpy = vi.fn();
    view.onTagClick = tagSpy;
    view.onGroupClick = groupSpy;

    view.renderTags(tags, null, true); // Delete mode
    (document.querySelector('.tag-chip') as HTMLElement).click();
    expect(tagSpy).toHaveBeenCalledWith('tag1');

    view.renderGroups(groups, null, true); // Delete mode
    (document.querySelector('[data-group-id]') as HTMLElement).click();
    expect(groupSpy).toHaveBeenCalledWith('g1');
  });

  it('should handle missing elements', () => {
    document.body.innerHTML = '';
    const brokenView = new TagManagerView();
    brokenView.toggleOverlay(true);
    brokenView.renderTags([], null, false);
    brokenView.renderGroups([], null, false);
  });
});
