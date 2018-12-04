import Condition from './condition.js';

class ChangeCondition extends Condition {
    static get options() {
        return super.options.concat([
            'live',
            'title',
            'uname',
            'slug',
            'url',
            'image',
            'thumbnail',
            'archiveUrl',
            'chatUrl',
            'category',
            'viewers',
            'language',
            'mature'
        ]);
    }

    checkParam(context, param) {
        //TODO who does the change detection? This or is that the context?
    }
}
