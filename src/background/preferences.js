import { emit } from "../utils";
import EventTarget from 'event-target-shim';
import prefInfo from '../prefs.json';
import { format } from '../format-pref';

const getDefaultValue = (pref) => {
        if(pref in prefInfo) {
            return prefInfo[pref].value;
        }
        else {
            console.error("No default value for", pref);
            return undefined;
        }
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
        return browser.storage[AREA].get(pref).then((value) => {
            if(Array.isArray(pref)) {
                return pref.map((p) => {
                    if(p in value) {
                        return value[p];
                    }
                    else {
                        return getDefaultValue(p);
                    }
                });
            }
            else {
                if(!(pref in value)) {
                    return getDefaultValue(pref);
                }
                else {
                    return value[pref];
                }
            }
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
}

export default new Preferences();
