import Condition from './condition.js';

class SaveStateCondition extends Condition {
    static get options() {
        return super.options.concat([
            'saved:channel',
            'saved:user',
            'unsaved:channel',
            'unsaved:user'
        ]);
    }

    getContextDescriptor(context) {
        return `${(context.id ? 'saved' : 'unsaved')}:${(context.live ? 'channel' : 'user')}`;
    }

    checkParam(context, param) {
        return this.getContextDescriptor(context) === param;
    }
}

export default SaveStateCondition;
