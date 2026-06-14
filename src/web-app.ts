import { BrowserAnkiAdapter } from './infrastructure/adapters/anki/browser-anki-adapter';
import { BrowserSettingsAdapter } from './infrastructure/adapters/settings/browser-settings';
import { createApp } from './create-app';

const controller = createApp(BrowserAnkiAdapter, BrowserSettingsAdapter);

window.addEventListener('load', () => {
    controller.init().catch(err => {
        console.error('[Web App Bootstrap Error]:', err);
    });
});
