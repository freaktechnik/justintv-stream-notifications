import SDK from './sdk';
import { emit } from "../utils";
import EventTarget from 'event-target-shim';

//TODO move to storage.local & options_ui

class Preferences extends EventTarget {
    constructor() {
        super();
        SDK.addEventListener("message", ({ detail: message }) => {
            if(message.target == "pref-change") {
                emit(this, "change", message);
            }
        });
    }

    get(pref) {
        if(Array.isArray(pref)) {
            return Promise.all(pref.map((p) => this.get(p)));
        }
        else {
            return SDK.doAction({
                target: "get-pref-" + pref,
                pref
            });
        }
    }

    set(pref, value) {
        return SDK.doAction({
            target: "set-pref-" + pref,
            pref,
            value
        });
    }

    open() {
        SDK.postMessage({
            target: "pref-open"
        });
    }
}

export default new Preferences();
