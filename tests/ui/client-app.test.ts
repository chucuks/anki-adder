import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockInit = vi.fn();

vi.mock('@/ui/controllers/app-controller', () => ({
    AppController: vi.fn().mockImplementation(function() {
        return { init: mockInit };
    })
}));

vi.mock('@/infrastructure/adapters/oxford/scraper', () => ({
    OxfordScraperAdapter: vi.fn()
}));
vi.mock('@/infrastructure/adapters/anki/client', () => ({
    AnkiDroidAdapter: vi.fn()
}));
vi.mock('@/infrastructure/adapters/settings/capacitor-settings', () => ({
    CapacitorSettingsAdapter: vi.fn()
}));
vi.mock('@/infrastructure/services/ui-error-service', () => ({
    UIErrorService: vi.fn()
}));
vi.mock('@/application/use-cases', () => ({
    VocabularyUseCase: vi.fn()
}));
vi.mock('@/infrastructure/adapters/anki/default-anki-note-formatter', () => ({
    DefaultAnkiNoteFormatter: vi.fn()
}));

describe('App Entry Point (client-app.ts)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    it('should register load event listener and call init on trigger', async () => {
        mockInit.mockResolvedValue(undefined);

        const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
        await import('@/client-app');

        expect(addEventListenerSpy).toHaveBeenCalledWith('load', expect.any(Function));

        const handler = addEventListenerSpy.mock.calls.find(c => c[0] === 'load')?.[1] as () => Promise<void>;
        await handler();

        expect(mockInit).toHaveBeenCalled();
    });

    it('should handle bootstrap errors', async () => {
        mockInit.mockImplementation(() => Promise.reject(new Error('init failed')));

        const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
        await import('@/client-app');

        expect(addEventListenerSpy).toHaveBeenCalledWith('load', expect.any(Function));

        const handler = addEventListenerSpy.mock.calls.find(c => c[0] === 'load')?.[1] as () => Promise<void>;
        await handler();

        expect(mockInit).toHaveBeenCalled();
    });
});
