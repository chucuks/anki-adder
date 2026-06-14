import { describe, it, expect, vi, afterEach } from 'vitest';
import { detectSystemLanguage } from '../../src/helpers/detect-language';

describe('detectSystemLanguage', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('should return en when navigator is unavailable', () => {
        vi.stubGlobal('navigator', undefined);
        expect(detectSystemLanguage()).toBe('en');
    });

    it('should return en for unsupported language', () => {
        vi.stubGlobal('navigator', { language: 'xx-YY' });
        expect(detectSystemLanguage()).toBe('en');
    });

    it('should detect supported language from navigator.language', () => {
        vi.stubGlobal('navigator', { language: 'tr-TR' });
        expect(detectSystemLanguage()).toBe('tr');
    });

    it('should return en when navigator.language is empty', () => {
        vi.stubGlobal('navigator', { language: '' });
        expect(detectSystemLanguage()).toBe('en');
    });
});
