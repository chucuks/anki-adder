import { Language } from '../domain/entities';

const SUPPORTED: Record<string, true> = {
    tr: true, en: true, es: true, de: true, fr: true,
    it: true, pt: true, ru: true, zh: true, hi: true,
    ar: true, bn: true, ja: true, ko: true, id: true,
    vi: true, ur: true, th: true, mr: true, te: true,
    ta: true, pcm: true, yue: true, tl: true, wuu: true,
    fa: true, ha: true, sw: true, jv: true, pa: true,
    kn: true, gu: true, am: true, bho: true, nan: true,
    cjy: true, yo: true, hak: true, my: true, om: true,
    ps: true, mai: true, uk: true, su: true, pl: true,
    uz: true, sd: true, ml: true, az: true, ro: true,
    nl: true, ku: true
};

export function detectSystemLanguage(): Language {
    try {
        const code = (navigator.language || '').split('-')[0];
        if (SUPPORTED[code]) return code as Language;
    } catch {}
    return 'en';
}
