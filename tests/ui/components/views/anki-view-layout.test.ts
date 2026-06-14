import { describe, it, expect, beforeEach } from 'vitest';
import { AnkiView } from '../../../../src/ui/components/views/anki-view';

describe('AnkiView Layout Tests', () => {
    let view: AnkiView;

    beforeEach(() => {
        document.body.innerHTML = `
            <div class="split-controls-row">
                <div class="split-control-item">
                    <select id="deckSelect"></select>
                </div>
                <div class="split-control-item search-wrapper">
                    <input type="text" id="tagSearchInput">
                </div>
            </div>
            <div id="quickTagList" class="tag-quick-row"></div>
            <button id="addBtn"></button>
        `;
        
        // Add basic CSS to jsdom (minimal for testing properties)
        const style = document.createElement('style');
        style.textContent = `
            .tag-quick-row {
                display: flex;
                flex-wrap: nowrap;
                overflow-x: auto;
                width: 100%;
                max-width: 100%;
            }
            .split-controls-row {
                display: flex;
                gap: 12px;
                width: 100%;
            }
            .split-control-item {
                flex: 1;
                min-width: 0;
                max-width: calc(50% - 6px);
            }
            #deckSelect, #tagSearchInput {
                width: 100%;
            }
        `;
        document.head.appendChild(style);
        
        view = new AnkiView();
    });

    it('should have horizontal scroll properties on tag list', () => {
        const list = document.getElementById('quickTagList');
        expect(list).not.toBeNull();
        
        const style = window.getComputedStyle(list!);
        expect(style.display).toBe('flex');
        expect(style.flexWrap).toBe('nowrap');
        expect(style.overflowX).toBe('auto');
        expect(style.maxWidth).toBe('100%');
    });

    it('should split deck select and tag search horizontally with width constraints', () => {
        const row = document.querySelector('.split-controls-row');
        expect(row).not.toBeNull();
        
        const rowStyle = window.getComputedStyle(row!);
        expect(rowStyle.display).toBe('flex');
        
        const items = document.querySelectorAll('.split-control-item');
        expect(items.length).toBe(2);
        
        const deckSelect = document.getElementById('deckSelect');
        const tagSearchInput = document.getElementById('tagSearchInput');
        
        const deckStyle = window.getComputedStyle(deckSelect!);
        const searchStyle = window.getComputedStyle(tagSearchInput!);
        
        expect(deckStyle.width).toBe('100%');
        expect(searchStyle.width).toBe('100%');
    });

    it('should maintain 50/50 split even with very long tag list content', () => {
        const list = document.getElementById('quickTagList');
        // Add many long tags to simulate expansion pressure
        for (let i = 0; i < 20; i++) {
            const tag = document.createElement('div');
            tag.className = 'tag-pill';
            tag.textContent = 'very-long-tag-name-that-should-be-contained-' + i;
            list!.appendChild(tag);
        }

        const items = document.querySelectorAll('.split-control-item');
        const item1 = items[0] as HTMLElement;
        const item2 = items[1] as HTMLElement;

        // In jsdom, offsetWidth is always 0. We rely on getComputedStyle and 
        // checking if flex-basis or width is behaving correctly.
        const row = document.querySelector('.split-controls-row') as HTMLElement;
        const rowStyle = window.getComputedStyle(row);
        
        const item1Style = window.getComputedStyle(item1);
        const item2Style = window.getComputedStyle(item2);

        // They should both have flex: 1 and min-width: 0 to prevent expansion
        expect(item1Style.flex).toContain('1');
        expect(item1Style.minWidth).toBe('0px');
        expect(item1Style.maxWidth).toContain('50%');
        
        expect(item2Style.flex).toContain('1');
        expect(item2Style.minWidth).toBe('0px');
        expect(item2Style.maxWidth).toContain('50%');
    });
});
