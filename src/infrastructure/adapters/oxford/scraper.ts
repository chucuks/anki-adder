import { CapacitorHttp } from '@capacitor/core';
import { WordMeaning } from '../../../domain/entities';
import { IScraperRepository } from '../../../application/ports';

export class OxfordScraperAdapter implements IScraperRepository {
    constructor(private readonly baseUrl: string) {}

    private getRedirectUrl(headers: any): string {
        if (!headers || typeof headers !== 'object') return '';
        return headers['location'] || headers['Location'] || headers['LOCATION'] || '';
    }

    private async fetchUrl(url: string, headers: Record<string, string>, maxRedirects = 3): Promise<{ status: number; data: any; headers: any }> {
        for (let i = 0; i <= maxRedirects; i++) {
            console.log(`[OxfordScraper] Fetching (${i + 1}/${maxRedirects + 1}): ${url}`);
            const response = await CapacitorHttp.get({ url, headers });
            if (response.status < 300 || response.status >= 400) return response;
            const redirectUrl = this.getRedirectUrl(response.headers);
            if (!redirectUrl) return response;
            url = redirectUrl.startsWith('http') ? redirectUrl : `https://www.oxfordlearnersdictionaries.com${redirectUrl.startsWith('/') ? '' : '/'}${redirectUrl}`;
        }
        return { status: 508, data: '', headers: {} };
    }

    async getWordData(word: string): Promise<{ meanings: WordMeaning[]; error: string | null }> {
        const formattedWord = word.trim().toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/'/g, '_')
            .replace(/[^a-z0-9-_]/g, '');
        const finalUrl = `${this.baseUrl}${formattedWord}`;

        const headers = {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5'
        };

        try {
            let response = await this.fetchUrl(finalUrl, headers);

            if (response.status === 404) {
                for (let suffix = 1; suffix <= 3; suffix++) {
                    console.log(`[OxfordScraper] 404, trying _${suffix} suffix...`);
                    response = await this.fetchUrl(`${finalUrl}_${suffix}`, headers);
                    if (response.status !== 404) break;
                }
            }

            if (response.status !== 200) {
                console.error(`[OxfordScraper] HTTP Error: ${response.status}`, typeof response.data, String(response.data).substring(0, 200));
                return { meanings: [], error: `err_http_${response.status}` };
            }

            const html = typeof response.data === 'string' ? response.data : String(response.data ?? '');
            if (html.length < 200) {
                console.error(`[OxfordScraper] Response too short (${html.length} chars):`, html.substring(0, 100));
                return { meanings: [], error: 'err_not_found' };
            }

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const results: WordMeaning[] = [];

            const mainPos = this.getMainPos(doc);

            const senses = this.findAllSenses(doc);
            senses.forEach((sense) => {
                if (sense.closest('div.idioms') || sense.closest('.idm-g') || sense.closest('.pv-g') ||
                    sense.closest('[hclass="idioms"]') || sense.closest('[hclass="idm-g"]') || sense.closest('[hclass="pv-g"]')) return;
                const definition = this.getDefText(sense);
                if (!definition) return;
                results.push({ word, definition, example: this.getBestExample(sense), pos: this.getPosText(sense) || mainPos, type: 'normal' });
            });

            const pvGroups = doc.querySelectorAll('.pv-g, [hclass="pv-g"]');
            pvGroups.forEach(pvGroup => {
                const rawPvText = this.textContent(pvGroup.querySelector('.pv, [hclass="pv"]'));
                if (!rawPvText) return;
                const pvText = rawPvText.replace(/\s*\([^)]*\)\s*$/, '').replace(/\s*\[[^\]]*\]\s*$/, '').trim();
                if (!pvText) return;
                const pvSenses = this.findAllSenses(pvGroup);
                pvSenses.forEach(sense => {
                    const definition = this.getDefText(sense);
                    if (!definition) return;
                    results.push({ word, definition, example: this.getBestExample(sense), pos: 'phrasal verb', type: 'idiom', idiomText: pvText });
                });
            });

            const idiomGroups = doc.querySelectorAll('.idioms .idm-g, [hclass="idioms"] [hclass="idm-g"], .idioms [hclass="idm-g"], [hclass="idioms"] .idm-g');
            idiomGroups.forEach(idiomGroup => {
                let idiomText = this.textContent(idiomGroup.querySelector('.idm, [hclass="idm"]'));
                if (!idiomText) return;
                // Strip parenthetical usage notes (e.g. "in tandem (with somebody/something)" → "in tandem")
                idiomText = idiomText.replace(/\s*\([^)]*\)\s*$/, '').replace(/\s*\[[^\]]*\]\s*$/, '').trim();
                if (!idiomText) return;
                const idiomSenses = this.findAllSenses(idiomGroup);
                idiomSenses.forEach(sense => {
                    const definition = this.getDefText(sense);
                    if (!definition) return;
                    results.push({ word, definition, example: this.getBestExample(sense), pos: 'idiom', type: 'idiom', idiomText });
                });
            });

            if (results.length === 0) return { meanings: [], error: 'err_not_found' };
            return { meanings: results, error: null };
        } catch (err: any) {
            return { meanings: [], error: 'err_connection' };
        }
    }

    private getMainPos(doc: Document): string {
        const pos = doc.querySelector('.webtop .pos, [hclass="webtop"] [hclass="pos"]');
        return pos?.textContent?.trim() || '';
    }

    private findAllSenses(container: Element | Document): NodeListOf<Element> {
        return container.querySelectorAll('li.sense, li.subsense, .sense, .subsense, [hclass="sense"], [hclass="subsense"]');
    }

    private getDefText(sense: Element): string | undefined {
        const def = sense.querySelector('.def, [hclass="def"]');
        return def?.textContent?.trim();
    }

    private getPosText(sense: Element): string | undefined {
        const pos = sense.querySelector('.pos, [hclass="pos"]');
        return pos?.textContent?.trim();
    }

    private getBestExample(container: Element): string {
        const exampleEls = container.querySelectorAll('.x, .unx, .examples .x, .extra_examples .x, .examples .unx, [hclass="x"], [hclass="unx"]');
        if (exampleEls.length === 0) return '';
        const examples: string[] = [];
        exampleEls.forEach(el => { const text = this.textContent(el); if (text) examples.push(text); });
        return examples.find(ex => /[.!?]$/.test(ex)) || examples[0] || '';
    }

    private textContent(el: Element | null): string | undefined {
        return el?.textContent?.trim();
    }
}
