import { WordMeaning } from './entities';
import { IRREGULAR_WORDS } from './irregular-words';
import { escapeHTML } from '../helpers/escape';

const NON_DOUBLING_CONSONANTS = new Set(['a', 'e', 'i', 'o', 'u', 'w', 'x', 'y']);

const PAREN_ABBREVIATIONS = /\((?:sth|sb|something|somebody|etc)\)/gi;
const WORD_ABBREVIATIONS = /\b(?:sth|sb|something|somebody|etc)\.?\b/gi;
const PUNCTUATION = /[,;:]/g;

const SHORT_WORD_MAX_LENGTH = 3;
const MATCH_THRESHOLD = 0.5;
const MAX_BRIDGE_TOKENS = 4;

const VALID_SUFFIXES = new Set(['s', 'es', 'ed', 'ing', 'd', 'ies', 'ied', "'s", '’s']);
const PUNC_REGEX = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;

const SMALL_WORD_LENGTH_ALLOWANCE = 5;
const MEDIUM_WORD_LENGTH_ALLOWANCE = 4;

export class HighlightingService {
    static getHighlightedExample(meaning: WordMeaning): string {
        if (!meaning || !meaning.example) return '';

        const variants = this.buildVariants(meaning);
        const example = meaning.example;
        
        let bestMatchSpan: { start: number, end: number, score: number } | null = null;

        for (const variant of variants) {
            const target = this.normalizeVariant(variant);
            if (!target) continue;

            const words = target.split(/\s+/).filter(w => w.length > 0);
            /* istanbul ignore next — unreachable: !target catches empty variants earlier */
            if (words.length === 0) continue;

            const pattern = words.length > 1
                ? this.buildMultiWordPattern(words)
                : `\\b(${this.wordToPattern(words[0])})\\b`;

            const reg = new RegExp(pattern, 'gi');
            const match = reg.exec(example);

            if (match) {
                bestMatchSpan = { start: match.index, end: match.index + match[0].length, score: 1.0 };
                break;
            }

            const span = this.findBestMatchSpan(example, target);
            if (span && (!bestMatchSpan || span.score > bestMatchSpan.score)) {
                bestMatchSpan = span;
                if (span.score === 1.0) break;
            }
        }

        if (bestMatchSpan) {
            const before = example.substring(0, bestMatchSpan.start);
            const match = example.substring(bestMatchSpan.start, bestMatchSpan.end);
            const after = example.substring(bestMatchSpan.end);
            return `${this.escapeHTML(before)}<span class="highlight">${this.escapeHTML(match)}</span>${this.escapeHTML(after)}`;
        }

        return this.escapeHTML(example);
    }

    private static buildVariants(meaning: WordMeaning): string[] {
        const idiomText = meaning.idiomText ?? meaning.word;
        const initialVariants = idiomText.split('|').map(v => v.trim());
        const variants: string[] = [];

        for (const v of initialVariants) {
            if (!v.includes(',')) {
                if (!variants.includes(v)) variants.push(v);
                continue;
            }

            const commaParts = v.split(',').map(p => p.trim());
            const lastPart = commaParts[commaParts.length - 1];
            const hasEtc = lastPart.toLowerCase().startsWith('etc');

            if (!hasEtc) {
                for (const part of commaParts) {
                    if (!variants.includes(part)) variants.push(part);
                }
            } else {
                const afterEtc = lastPart.replace(/^etc\.?\s*/i, '');
                for (let i = 0; i < commaParts.length - 1; i++) {
                    const part = commaParts[i].trim();
                    if (!part) continue;
                    if (part.toLowerCase().startsWith('etc')) continue;
                    const expanded = (part + ' ' + afterEtc).trim();
                    if (!variants.includes(expanded)) variants.push(expanded);
                }
            }
        }

        return variants;
    }

    private static normalizeVariant(variant: string): string {
        return variant
            .replace(PAREN_ABBREVIATIONS, '')
            .replace(WORD_ABBREVIATIONS, '')
            .replace(PUNCTUATION, ' ')
            .replace(/\s*\([^)]*\)\s*$/, '')
            .replace(/\s*\[[^\]]*\]\s*$/, '')
            .trim();
    }

    private static wordToPattern(word: string): string {
        const lower = word.toLowerCase();
        const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const irregulars = IRREGULAR_WORDS[lower];
        const hasIrregulars = irregulars && irregulars.length > 0;
        const irregularPatterns = hasIrregulars ? `|${irregulars!.join('|')}` : '';

        if (lower.endsWith('y')) {
            const stem = escaped.slice(0, -1);
            return `(${escaped}(?:s|ed|ing|er|est|ly|'s)?|${stem}ie[sd]${irregularPatterns})`;
        }

        if (lower.length < 4) {
            return this.buildShortWordPattern(lower, escaped, irregularPatterns, hasIrregulars);
        }

        return `(${escaped}(?:s|ed|ing|er|est|ly|'s)?${irregularPatterns})`;
    }

    private static buildMultiWordPattern(words: string[]): string {
        const escapedWords = words.map(w => this.wordToPattern(w));
        return `(${escapedWords.join('\\W+(?:\\w+\\W+){0,3}')})`;
    }

    private static buildShortWordPattern(lower: string, escaped: string, irregularPatterns: string, hasIrregulars: boolean): string {
        const variations = [`${escaped}(?:s|'s|’s)?`];

        if (lower.endsWith('e')) {
            variations.push(escaped.slice(0, -1) + 'ing');
        }
        if (lower.endsWith('ie')) {
            variations.push(escaped.slice(0, -2) + 'ying');
        }

        const lastChar = lower.charAt(lower.length - 1);
        if (lower.length > 1 && !NON_DOUBLING_CONSONANTS.has(lastChar)) {
            variations.push(escaped + lastChar + '(?:ing|ed)');
        }

        if (hasIrregulars) {
            variations.push(irregularPatterns.substring(1));
        }

        return `(${variations.join('|')})`;
    }

    static escapeHTML(text: string): string {
        return escapeHTML(text);
    }

    private static findBestMatchSpan(text: string, targetPhrase: string): { start: number, end: number, score: number } | null {
        const targetTokens = targetPhrase.split(/\s+/).filter(t => t.length > 0);
        if (targetTokens.length === 0) return null;
        const textTokens: { word: string, start: number, end: number }[] = [];
        const regex = /\S+/g; let match;
        while ((match = regex.exec(text)) !== null) {
            textTokens.push({ word: match[0], start: match.index, end: match.index + match[0].length });
        }
        if (textTokens.length === 0) return null;

        let bestScore = 0; let bestSpan: { start: number, end: number, score: number } | null = null;
        for (let i = 0; i < textTokens.length; i++) {
            let matches = 0; let firstMatchIdx = -1; let lastMatchIdx = -1;
            let textIdx = i;

            for (const targetToken of targetTokens) {
                let found = false;
                const maxBridge = targetTokens.length > 1 ? MAX_BRIDGE_TOKENS : 0;
                for (let k = 0; k <= maxBridge && (textIdx + k) < textTokens.length; k++) {
                    if (this.isLikelyMatch(textTokens[textIdx + k].word, targetToken)) {
                        matches++;
                        if (firstMatchIdx === -1) firstMatchIdx = textIdx + k;
                        textIdx = textIdx + k + 1;
                        lastMatchIdx = textIdx - 1;
                        found = true;
                        break;
                    }
                }
                if (!found) textIdx++;
            }

            if (lastMatchIdx === -1) continue;

            const score = matches / targetTokens.length;
            if (score > MATCH_THRESHOLD && score > bestScore) {
                bestScore = score;
                bestSpan = { start: textTokens[firstMatchIdx].start, end: textTokens[lastMatchIdx].end, score };
                if (score === 1.0) break;
            }
        }
        return bestSpan;
    }

    private static isLikelyMatch(token: string, target: string): boolean {
        const normalize = (s: string): string => {
            return s.toLowerCase().trim()
                .replace(/i[sz]e\b/g, 'ize')
                .replace(/re\b/g, 'er')
                .replace(/ogue\b/g, 'og')
                .replace(/our\b/g, 'or');
        };

        const t = normalize(token.replace(PUNC_REGEX, ''));
        const g = normalize(target.replace(PUNC_REGEX, ''));
        if (t === g) return true;

        if (t.length < 2 || g.length < 2) return false;

        if (g.endsWith('y') && t.startsWith(g.slice(0, -1)) && (t.endsWith('ies') || t.endsWith('ied'))) return true;

        if (g.length <= SHORT_WORD_MAX_LENGTH) {
            return this.shortWordMatch(t, g);
        }

        if (t.startsWith(g) && t.length <= g.length + SMALL_WORD_LENGTH_ALLOWANCE) return true;
        if (g.length >= 3 && t.includes(g) && t.length <= g.length + MEDIUM_WORD_LENGTH_ALLOWANCE) return true;
        if (g.length >= 3 && t.startsWith(g.substring(0, 3)) && t.length <= g.length + MEDIUM_WORD_LENGTH_ALLOWANCE) return true;

        return false;
    }

    private static shortWordMatch(t: string, g: string): boolean {
        if (g.endsWith('e') && t.startsWith(g.slice(0, -1)) && t.endsWith('ing') && t.length === g.length + 2) {
            return true;
        }
        if (g.endsWith('ie') && t.startsWith(g.slice(0, -2) + 'y') && t.endsWith('ing') && t.length === g.length + 2) {
            return true;
        }
        const lastChar = g.charAt(g.length - 1);
        if (g.length > 1 && !NON_DOUBLING_CONSONANTS.has(lastChar)) {
            if (t.startsWith(g + lastChar)) {
                const suff = t.slice(g.length + 1);
                if (suff === 'ing' || suff === 'ed') return true;
            }
        }
        if (t.startsWith(g)) {
            const suff = t.slice(g.length);
            if (VALID_SUFFIXES.has(suff)) return true;
        }
        if (t.endsWith(g) && t.length <= g.length + SMALL_WORD_LENGTH_ALLOWANCE) {
            return true;
        }
        return false;
    }
}
