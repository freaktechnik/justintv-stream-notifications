import { emit } from "./utils";
import EventTarget from 'event-target-shim';
import prefInfo from './prefs.json';
import { format } from './format-pref';

const getDefaultValue = (pref) => {
        if(pref in prefInfo) {
            return prefInfo[pref].value;
        }

        console.error("No default value for", pref);
        return false;
    },
    AREA = "local";

class Preferences extends EventTarget {
    constructor() {
        super();
        browser.storage.onChanged.addListener((changes, area) => {
            if(area === AREA) {
                for(const c in changes) {
                    emit(this, "change", {
                        pref: c,
                        value: changes[c].newValue
                    });
                }
            }
        });
    }

    /**
     * Get the values of a pref. Returns the default value if unset.
     *
     * @param {string|Array.<string>} pref - Pref or prefs to fetch.
     * @async
     * @returns {?|Array.<?>} Value of array of values. Returns the default value
     *          for unset preferences.
     */
    get(pref) {
        // Build an object with pref name and default value.
        const request = {};
        if(Array.isArray(pref)) {
            for(const p of pref) {
                request[p] = getDefaultValue(p);
            }
        }
        else {
            request[pref] = getDefaultValue(pref);
        }
        return browser.storage[AREA].get(request).then((value) => {
            if(Array.isArray(pref)) {
                return pref.map((p) => value[p]);
            }

            return value[pref];
        });
    }

    set(pref, value) {
        return browser.storage[AREA].set({
            [pref]: format(value, prefInfo[pref].type)
        });
    }

    open() {
        browser.runtime.openOptionsPage();
    }

    reset(pref = Object.keys(prefInfo)) {
        return browser.storage[AREA].remove(pref);
    }
}

export default new Preferences();
