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
        const wasOnline = this._online;
        this._online = val;
        if(val && !wasOnline) {
            emit(this, "online");
            emit(window, "online");
        }
        else if(!val && wasOnline) {
            emit(this, "offline");
            emit(window, "offline");
        }
    }
}
