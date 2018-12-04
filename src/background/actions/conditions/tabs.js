import Condition from './condition.js';

//TODO not a multiselect...
export default class ExistingTabCondition extends Condition {
    static get options() {
        return super.options.concat([
          'ignore',
          'current'
        ]);
    }

    checkParam(context, param) {
        if(param == 'ignore') {
            return true;
        }
        else if(param == 'any') {
            return !tabs.some((t) => context.includes(t.url));
        }
        return !context.includes(currentTab.url);
    }
}
