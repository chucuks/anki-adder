import { IAnkiRepository, ISettingsRepository } from './application/ports';
import { OxfordScraperAdapter } from './infrastructure/adapters/oxford/scraper';
import { CapacitorSettingsAdapter } from './infrastructure/adapters/settings/capacitor-settings';
import { DefaultAnkiNoteFormatter } from './infrastructure/adapters/anki/default-anki-note-formatter';
import { VocabularyUseCase } from './application/use-cases';
import { AppController } from './ui/controllers/app-controller';

export function createApp(
    AnkiAdapter: new () => IAnkiRepository,
    SettingsAdapter: new () => ISettingsRepository = CapacitorSettingsAdapter
): AppController {
    const baseUrl = (typeof window !== 'undefined' && window.location.port === '3005')
        ? '/api/oxford/'
        : 'https://www.oxfordlearnersdictionaries.com/definition/english/';

    const scraper = new OxfordScraperAdapter(baseUrl);
    const anki = new AnkiAdapter();
    const settings = new SettingsAdapter();
    const formatter = new DefaultAnkiNoteFormatter();
    const useCase = new VocabularyUseCase(scraper, anki, settings, formatter);

    return new AppController(useCase);
}
