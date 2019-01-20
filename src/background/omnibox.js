/**
 * Omnibox view controller
 *
 * @author Martin Giger
 * @license MPL-2.0
 * @module omnibox
 */

import ReadChannelList from './channel/read-list.js';
import { emit } from '../utils.js';

const NEUTRAL_SCORE = 0,
    BEST_SCORE = 16,
    FIRST = 0,
    MAX_SUGGESTIONS = 6,
    BASE_TEN = 10;

class Omnibox extends EventTarget {
    static get FIELDS() {
        return [
            'uname',
            'slug',
            'login',
            'title',
            'category',
            'type'
        ];
    }

    constructor() {
        super();
        this.list = new ReadChannelList(true);
        browser.omnibox.onInputChanged.addListener((query, suggest) => {
            this.suggestChannels(query.toLowerCase())
                .then(suggest)
                .catch(console.error);
        });
        browser.omnibox.onInputEntered.addListener((id, disposition) => {
            emit(this, "open", {
                id: parseInt(id, BASE_TEN),
                disposition
            });
        });
    }

    async suggestChannels(query) {
        const channels = await this.list.getChannelsByType(),
            fields = Omnibox.FIELDS,
            collator = new Intl.Collator(undefined, {
                usage: 'search'
            });
        return channels.map((ch) => {
            let score = NEUTRAL_SCORE;
            if(ch.id.toString(BASE_TEN).startsWith(query)) {
                score += BEST_SCORE;
            }
            score += fields.reduce((a, c, i) => {
                if(c in ch && ch[c]) {
                    const fieldVal = ch[c].toString();
                    if(fieldVal.toLowerCase().includes(query) || collator.compare(fieldVal, query) === NEUTRAL_SCORE) {
                        return a + fields.length - i;
                    }
                }
                return a;
            }, NEUTRAL_SCORE);
            return {
                content: ch.id,
                description: browser.i18n.getMessage("omniboxSuggestion", [
                    ch.type,
                    ch.uname
                ]),
                score
            };
        })
            .sort((a, b) => b.score - a.score)
            .slice(FIRST, MAX_SUGGESTIONS);
    }
}

export default Omnibox;
