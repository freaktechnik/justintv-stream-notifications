import Condition from './condition.js';
import LiveState from '../../../live-state.json';

export default class LiveStateCondition extends Condition {
    static get options() {
        return super.options.concat(Object.keys((LiveState).filter((k) => !k.startsWith('TOWARD_'))));
    }

    checkParam(context, param) {
        if(param == 'any') {
            return true;
        }
        return context.live.state === LiveState[param];
    }
}
