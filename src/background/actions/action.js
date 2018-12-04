import { selectOrOpenTab } from '../channel/utils.js';
import Rule from './rule.js';

const ACTION_TYPES = {
        SMART_TAB: 'tab',
        CURRENT_TAB: 'current',
        FOREGROUND_TAB: 'foreground',
        BACKGROUND_TAB: 'background',
        COPY: 'copy',
        STREAMLINK: 'streamlink'
    },
    FIRST = 0;

export default class Action extends Rule {
    static get ACTION_TYPES() {
        return ACTION_TYPES;
    }

    constructor(target, type, conditions, label) {
        super(target, conditions);
        this.type = type;
        this.label = label;
    }

    execute(context) {
        const target = this.buildTarget(context);
        switch(this.type) {
            case ACTION_TYPES.SMART_TAB:
            case ACTION_TYPES.CURRENT_TAB:
            case ACTION_TYPES.FOREGROUND_TAB:
            case ACTION_TYPES.BACKGROUND_TAB:
                //TODO create more generic slectOrOpenTab for these use cases. Also adjust disposition according to the type
                return selectOrOpenTab(target, 'newForegroundTab');
            case ACTION_TYPES.STREAMLINK:
                return browser.runtime.sendMessage("streamlink.firefox.helper@gmail.com", url);
            case ACTION_TYPES.COPY:
                return navigator.clipboard.writeText(target);
        }
    }
}
