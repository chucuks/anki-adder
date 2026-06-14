import { AnkiDroidAdapter } from './infrastructure/adapters/anki/client';
import { AppController } from './ui/controllers/app-controller';
import { createApp } from './create-app';

const controller = createApp(AnkiDroidAdapter);

interface IntentShim {
    getIntent(success: (intent: Record<string, unknown>) => void, error: (err: unknown) => void): void;
    onIntent(success: (intent: Record<string, unknown>) => void, error: (err: unknown) => void): void;
}

function setupIntentReceiver(appController: AppController): void {
    const intentShim = (window as unknown as Record<string, unknown>).plugins as Record<string, IntentShim> | undefined;
    if (!intentShim?.intentShim) return;

    const processIntent = (intent: Record<string, unknown>) => {
        if (!intent) return;
        const extras = intent.extras as Record<string, string> | undefined;
        const sharedText = extras?.['android.intent.extra.TEXT'];
        if (sharedText) {
            appController.handleSharedText(sharedText);
        }
    };

    intentShim.intentShim.getIntent(processIntent, (err) => console.error('[Intent]', err));
    intentShim.intentShim.onIntent(processIntent, (err) => console.error('[Intent]', err));
}

window.addEventListener('load', () => {
    controller.init()
        .then(() => setupIntentReceiver(controller))
        .catch(err => console.error('[App Bootstrap Error]:', err));
});
