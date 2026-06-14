import { describe, it, expect, beforeEach } from 'vitest';
import { ThemeService } from '@/ui/services/theme-service';
import { Store } from '@/ui/state/store';

describe('UI / Services / ThemeService', () => {
    let store: Store;
    let service: ThemeService;

    beforeEach(() => {
        document.body.className = '';
        store = new Store({
            theme: 'standard',
            font: 'outfit',
            fontSize: 16
        } as any);
        service = new ThemeService(store);
    });

    it('should apply initial standard theme and outfit font', () => {
        expect(document.body.className).not.toContain('theme-');
        expect(document.body.className).not.toContain('font-');
    });

    it('should react to theme changes', () => {
        store.update('theme', 'midnight');
        expect(document.body.classList.contains('theme-midnight')).toBe(true);
        
        store.update('theme', 'standard');
        expect(document.body.classList.contains('theme-midnight')).toBe(false);
    });

    it('should react to font changes', () => {
        store.update('font', 'roboto');
        expect(document.body.classList.contains('font-roboto')).toBe(true);

        store.update('font', 'outfit');
        expect(document.body.classList.contains('font-roboto')).toBe(false);
    });

    it('should react to font size changes', () => {
        store.update('fontSize', 20);
        expect(document.documentElement.style.getPropertyValue('--font-size-base')).toBe('20px');
    });

    it('should apply initial non-standard values', () => {
        const customStore = new Store({
            theme: 'dracula',
            font: 'roboto',
            fontSize: 18
        } as any);
        const svc = new ThemeService(customStore);
        svc.dispose();
        expect(document.body.classList.contains('theme-dracula')).toBe(true);
        expect(document.body.classList.contains('font-roboto')).toBe(true);
        expect(document.documentElement.style.getPropertyValue('--font-size-base')).toBe('18px');
    });

    it('should dispose and unsubscribe', () => {
        const svc = new ThemeService(store);
        svc.dispose();
    });
});
