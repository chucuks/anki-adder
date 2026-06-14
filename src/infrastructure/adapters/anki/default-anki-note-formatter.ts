import { WordMeaning, AnkiNote } from '../../../domain/entities';
import { HighlightingService } from '../../../domain/services';
import { INoteFormatter } from '../../../application/ports';
import { escapeHTML } from '../../../helpers/escape';

const HIGHLIGHT_STYLE = 'color:#ff4444;font-weight:bold';

export class DefaultAnkiNoteFormatter implements INoteFormatter {
    format(m: WordMeaning, options: { frontSideMode: 'example' | 'word', autoPosTagging: boolean, tags: string[] }): AnkiNote {
        const wordOrIdiom = m.idiomText || m.word;
        
        const frontContent = this.getFrontContent(m, options.frontSideMode);
        const frontPlainContent = options.frontSideMode === 'word' ? (m.idiomText || m.word) : (m.example || m.idiomText || m.word);
        const audioText = m.example || wordOrIdiom;
        
        const escapedHTMLDef = escapeHTML(m.definition);
        const escapedHTMLWord = escapeHTML(wordOrIdiom);
        const escapedPos = escapeHTML(m.pos);

        const backContent = [
            `<b>${escapedHTMLWord}</b>`,
            escapedHTMLDef.replace(/\n/g, '<br>'),
            `<i>(${escapedPos})</i>`
        ];

        const exampleHTML = options.frontSideMode !== 'example' ? this.getInlineHighlightedExample(m) : '';
        if (exampleHTML) {
            backContent.push(exampleHTML);
        }

        return {
            front: frontContent,
            back: backContent.join('<br><br>'),
            frontPlain: frontPlainContent,
            backPlain: m.idiomText ? m.idiomText + '\n' + m.definition : m.definition,
            audioText,
            tags: Array.from(new Set([
                ...(options.tags || []),
                ...(options.autoPosTagging ? [m.pos.toLowerCase().replace(/\s+/g, '_')] : [])
            ]))
        };
    }

    private getFrontContent(m: WordMeaning, frontSideMode: 'example' | 'word' = 'example'): string {
        if (frontSideMode === 'word') return m.idiomText || m.word;
        const highlighted = HighlightingService.getHighlightedExample(m);
        if (!highlighted) return m.idiomText || m.word;
        return highlighted.replace('class="highlight"', `style="${HIGHLIGHT_STYLE}"`);
    }

    private getInlineHighlightedExample(m: WordMeaning): string {
        if (!m.example) return '';
        const highlighted = HighlightingService.getHighlightedExample(m);
        /* istanbul ignore next — highlighted always non-empty when m.example is truthy */
        if (!highlighted) return escapeHTML(m.example);
        return highlighted.replace('class="highlight"', `style="${HIGHLIGHT_STYLE}"`);
    }
}
