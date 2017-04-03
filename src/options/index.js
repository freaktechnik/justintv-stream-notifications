import prefs from '../prefs.json';
import { format } from '../format-pref';
import '../content/l10n';
import { toggle } from '../content/utils';

//TODO prefs reset button & help button for advanced prefs?

class OptionsPage {
    static EVENT_TYPES = {
        "radio": "change",
        "bool": "change",
        "string": "blur",
        "integer": "blur"
    }
    static VALUE_PROPERTY = {
        "radio": "value",
        "bool": "checked",
        "string": "value",
        "integer": "valueAsNumber"
    }

    constructor() {
        if(document.readyState == "loading") {
            document.addEventListener("DOMContentLoaded", this.setup.bind(this), {
                passive: true,
                capture: false
            });
        }
        else {
            this.setup();
        }
    }

    setup() {
        this.loadValues().then(this.attachListeners.bind(this));

        //TODO show hidden prefs if not under parental controls.
        toggle(document.getElementById("hiddenprefs"), false);
    }

    getValue(p) {
        const type = prefs[p].type;
        return format(document.getElementById(p)[OptionsPage.VALUE_PROPERTY[type]], type);
    }

    savePref(id) {
        return browser.storage.local.set({
            [id]: this.getValue(id)
        });
    }
    storeValues() {
        const values = {};
        for(const p in prefs) {
            values[p] = this.getValue(p);
        }
        return browser.storage.local.set(values);
    }
    attachListeners() {
        for(const p in prefs) {
            document.getElementById(p).addEventListener(OptionsPage.EVENT_TYPES[prefs[p].type], this.savePref.bind(this, prefs[p].id, prefs[p].type), {
                capture: false,
                passive: true
            });
        }

        document.getElementById("manageChannels").addEventListener("click", () => {
            //TODO tell channel controller to open manager
        });

        const boundStoreValues = this.storeValues.bind(this);

        document.getElementById("submitform").addEventListener("submit", boundStoreValues, {
            passive: true,
            capture: false
        });

        window.addEventListener("beforeunload", boundStoreValues, {
            passive: false,
            capture: true
        });
    }
    loadValues() {
        return browser.storage.local.get(Object.keys(prefs)).then((stored) => {
            for(const p in stored) {
                document.getElementById(p).value = stored[p];
            }
        });
    }
}

new OptionsPage();
