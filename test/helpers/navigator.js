import EventTarget from 'event-target-shim';
import { emit } from '../../src/utils';

export default class NavigatorOnLine extends EventTarget {
    constructor() {
        super([
            'online',
            'offline'
        ]);
        this._online = true;
    }

    get onLine() {
        return this._online;
    }

    set onLine(val) {
        if(val && !this._online) {
            emit(this, "online");
            emit(window, "online");
        }
        else if(!val && this._online) {
            emit(this, "offline");
            emit(window, "offline");
        }
        this._online = val;
    }
};
