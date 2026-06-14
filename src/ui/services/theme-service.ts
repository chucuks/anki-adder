import { Store } from '../state/store';
import { ThemeType, FontType } from '../../domain/entities';

const FONT_CLASSES = ['font-inter', 'font-roboto', 'font-serif', 'font-montserrat', 'font-poppins'];

export class ThemeService {
    private unsubscribers: (() => void)[] = [];

    constructor(private readonly store: Store) {
        this.setupSubscriptions();
    }

    dispose(): void {
        this.unsubscribers.forEach(fn => fn());
        this.unsubscribers = [];
    }

    private setupSubscriptions() {
        this.unsubscribers.push(
            this.store.subscribe('theme', this.handleThemeChange.bind(this)),
            this.store.subscribe('font', this.handleFontChange.bind(this)),
            this.store.subscribe('fontSize', this.handleFontSizeChange.bind(this))
        );
        
        const state = this.store.getState();
        this.handleThemeChange(state.theme);
        this.handleFontChange(state.font);
        this.handleFontSizeChange(state.fontSize);
    }

    private handleThemeChange(theme: ThemeType): void {
        document.body.className = document.body.className.replace(/theme-\S+/g, '');
        if (theme !== 'standard') {
            document.body.classList.add(`theme-${theme}`);
        }
    }

    private handleFontChange(font: FontType): void {
        FONT_CLASSES.forEach(f => document.body.classList.remove(f));
        if (font !== 'outfit') {
            document.body.classList.add(`font-${font}`);
        }
    }

    private handleFontSizeChange(size: number): void {
        document.documentElement.style.setProperty('--font-size-base', `${size}px`);
    }
}
