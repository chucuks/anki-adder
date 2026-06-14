import { CapacitorHttp } from '@capacitor/core';
import { WordMeaning } from '../../../domain/entities';
import { IScraperRepository } from '../../../application/ports';

export class OxfordScraperAdapter implements IScraperRepository {
    constructor(private readonly baseUrl: string) {}

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
            console.log(`[OxfordScraper] Fetching: ${finalUrl}`);
            let response = await CapacitorHttp.get({ url: finalUrl, headers });

            if (response.status === 404) {
                console.log(`[OxfordScraper] 404, trying _1 suffix...`);
                response = await CapacitorHttp.get({ url: `${finalUrl}_1`, headers });
            }

            if (response.status !== 200) {
                console.error(`[OxfordScraper] HTTP Error: ${response.status}`, response.data);
                return { meanings: [], error: `err_http_${response.status}` };
            }

            const parser = new DOMParser();
            const doc = parser.parseFromString(response.data, 'text/html');
            const results: WordMeaning[] = [];
            const mainPos = doc.querySelector('.webtop .pos')?.textContent?.trim() || 'unknown';

            const senses = doc.querySelectorAll('li.sense, li.subsense, .sense, .subsense');
            senses.forEach((sense) => {
                if (sense.closest('div.idioms') || sense.closest('.idm-g') || sense.closest('.pv-g')) return;
                const definition = this.textContent(sense.querySelector('.def'));
                if (!definition) return;
                results.push({ word, definition, example: this.getBestExample(sense), pos: this.textContent(sense.querySelector('.pos')) || mainPos, type: 'normal' });
            });

            const pvGroups = doc.querySelectorAll('.pv-g');
            pvGroups.forEach(pvGroup => {
                const pvText = this.textContent(pvGroup.querySelector('.pv'));
                if (!pvText) return;
                pvGroup.querySelectorAll('li.sense, .sense').forEach(sense => {
                    const definition = this.textContent(sense.querySelector('.def'));
                    if (!definition) return;
                    results.push({ word, definition, example: this.getBestExample(sense), pos: 'phrasal verb', type: 'idiom', idiomText: pvText });
                });
            });

            const idiomGroups = doc.querySelectorAll('div.idioms .idm-g');
            idiomGroups.forEach(idiomGroup => {
                const idiomText = this.textContent(idiomGroup.querySelector('.idm'));
                if (!idiomText) return;
                idiomGroup.querySelectorAll('li.sense, .sense').forEach(sense => {
                    const definition = this.textContent(sense.querySelector('.def'));
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

    private getBestExample(container: Element): string {
        const exampleEls = container.querySelectorAll('.x, .unv_x, .snippet, .examples .x, .extra_examples .x');
        if (exampleEls.length === 0) return '';
        const examples: string[] = [];
        exampleEls.forEach(el => { const text = this.textContent(el); if (text) examples.push(text); });
        return examples.find(ex => /[.!?]$/.test(ex)) || examples[0] || '';
    }

    private textContent(el: Element | null): string | undefined {
        return el?.textContent?.trim();
    }
}
