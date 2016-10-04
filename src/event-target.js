/**
 * EventTarget that partially implements the DOM event target interface.
 *
 * @author Martin Giger
 * @license MPL-2.0
 */
import { defer } from 'underscore';

const OPTIONS = Symbol("event listener options");

class EventTarget {
    constructor() {
        this.listeners = {};
    }

    addEventListener(event, listener, options) {
        if(!(event in this.listeners)) {
            this.listeners[event] = new Set();
        }
        if(typeof options == "object") {
            listener[OPTIONS] = options;
        }

        this.listeners[event].add(listener);
    }

    removeEventListener(event, listener) {
        if(event in this.listeners) {
            this.listeners[event].delete(listener);
        }
    }

    dispatchEvent(event) {
        if(event.type in this.listeners) {
            this.listeners[event.type].forEach((listener) => {
                defer(listener.bind(this), event);
                if(OPTIONS in listener && listener[OPTIONS].once) {
                    this.removeEventListener(event.type, listener);
                }
                //TODO default prevention and passive, if I ever even use them.
            });
        }
    }
}

export default EventTarget;
