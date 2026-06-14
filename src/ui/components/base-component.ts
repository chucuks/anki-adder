import { TRANSLATIONS } from '../../domain/translations';
import { Language } from '../../domain/entities';
import { escapeHTML } from '../../helpers/escape';

export function makeInteractive(el: HTMLElement, onClick: () => void, onCleanup?: (fn: () => void) => void): void {
    el.addEventListener('click', onClick);
    const cleanups: (() => void)[] = [() => el.removeEventListener('click', onClick)];

    if (el.tagName !== 'BUTTON' && el.tagName !== 'A') {
        el.setAttribute('role', 'button');
        el.setAttribute('tabindex', '0');
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
            }
        };
        el.addEventListener('keydown', onKeyDown);
        cleanups.push(() => el.removeEventListener('keydown', onKeyDown));
    }

    if (onCleanup) cleanups.forEach(fn => onCleanup(fn));
}

export abstract class BaseComponent {
    protected currentLang: Language = 'en';
    private statusTimeout: ReturnType<typeof setTimeout> | null = null;
    private cleanups: (() => void)[] = [];

    constructor() {}

    protected cleanup(fn: () => void): void {
        this.cleanups.push(fn);
    }

    protected cleanAll(): void {
        if (this.statusTimeout) {
            clearTimeout(this.statusTimeout);
            this.statusTimeout = null;
        }
        this.cleanups.forEach(fn => fn());
        this.cleanups = [];
    }

    protected getEl<T extends HTMLElement>(id: string): T | null {
        return document.getElementById(id) as T;
    }

    public t(key: string, params: Record<string, string> = {}) {
        let text = TRANSLATIONS[this.currentLang]?.[key] || TRANSLATIONS['en']?.[key] || key;
        
        if (text === key && key.includes('_')) {
            text = key.replace(/_/g, ' ');
        }
        
        for (const [p, val] of Object.entries(params)) {
            text = text.split(`{${p}}`).join(val);
        }
        return text;
    }

    protected escapeHTML(str: string) {
        return escapeHTML(str);
    }

    protected makeInteractive(el: HTMLElement, onClick: () => void) {
        makeInteractive(el, onClick, this.cleanup.bind(this));
    }

    setLanguage(lang: Language) {
        this.currentLang = lang;
    }

    showStatus(message: string, type: 'success' | 'error' | 'info', params?: Record<string, string>): void {
        const box = this.getEl('statusBox');
        if (!box) return;

        box.textContent = this.t(message, params);
        box.className = `status ${type}`;
        box.classList.remove('hidden');

        if (this.statusTimeout) clearTimeout(this.statusTimeout);
        this.statusTimeout = setTimeout(() => box.classList.add('hidden'), 5000);
    }

    applyTranslations(): void {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n')!;
            el.textContent = this.t(key);
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder')!;
            (el as HTMLInputElement).placeholder = this.t(key);
        });
    }

    abstract render(): void;
}
