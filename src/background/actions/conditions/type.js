import Condition from './condition.js';
import providers from '../../providers/serialized.js';

export default class TypeCondition extends Condition {
    static get options() {
        return super.options.concat(Object.keys(providers));
    }

    checkParam(context, param) {
        return context.type === param;
    }
}
