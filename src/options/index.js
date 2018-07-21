import prefs from '../prefs.json.js';
import preferences from '../preferences.js';
import { format } from '../format-pref.js';
import '../content/l10n.js';
import { toggle } from '../content/utils.js';
import errorStateWidget from '../content/error-state.js';
import saveExport from '../export.js';
import { hasStreamlink } from '../features.js';
import './options.css';
import '../content/shared.css';

const FIRST = 0;

//TODO help button for advanced prefs?

class OptionsPage {
    static EVENT_TYPES = {
        "radio": "change",
        "bool": "change",
        "string": "blur",
        "integer": "blur"
    };
    static VALUE_PROPERTY = {
        "radio": "value",
        "bool": "checked",
        "string": "value",
        "integer": "valueAsNumber"
    };

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
        this.loadValues()
            .then((...args) => this.attachListeners(...args))
            .catch(console.error);

        browser.runtime.sendMessage("pcStatus")
            .then((status) => {
                toggle(document.getElementById("hiddenprefs"), !status);
            })
            .catch(console.error);

        errorStateWidget(document.getElementById("errorStates"));

        hasStreamlink()
            .then((streamlinkAvailable) => {
                document.querySelector('#click_action option[value="5"]').hidden = !streamlinkAvailable;
            })
            .catch(console.error);
    }

    getValue(p) {
        const { type } = prefs[p],
            formatted = format(document.getElementById(p)[OptionsPage.VALUE_PROPERTY[type]], type);
        if(type === "string" && formatted == '') {
            return prefs[p].value;
        }
        return formatted;
    }

    savePref(id) {
        return preferences.set(id, this.getValue(id));
    }
    storeValues() {
        const values = {};
        for(const p in prefs) {
            values[p] = this.getValue(p);
        }
        return browser.storage.local.set(values);
    }
    attachListeners() {
        const recentlySaved = new Set(),
            boundStoreValues = this.storeValues.bind(this);
        for(const p in prefs) {
            document.getElementById(p).addEventListener(OptionsPage.EVENT_TYPES[prefs[p].type], () => {
                recentlySaved.add(p);
                this.savePref(p);
            }, {
                capture: false,
                passive: true
            });
        }

        document.getElementById("manageChannels").addEventListener("click", () => {
            browser.runtime.sendMessage("manageChannels");
        }, {
            passive: true,
            capture: false
        });

        document.getElementById("reset").addEventListener("click", () => {
            browser.runtime.sendMessage("resetPrefs")
                .then(() => this.loadValues(true))
                .catch(console.error);
        }, {
            passive: true,
            capture: false
        });

        document.getElementById("submitform").addEventListener("submit", boundStoreValues, {
            passive: true,
            capture: false
        });

        window.addEventListener("beforeunload", boundStoreValues, {
            passive: false,
            capture: true
        });

        document.getElementById("import").addEventListener("click", () => {
            document.getElementById("fileImport").click();
        }, {
            passive: true,
            capture: false
        });

        document.getElementById("export").addEventListener("click", () => {
            saveExport();
        }, {
            passive: true,
            capture: false
        });

        document.getElementById("fileImport").addEventListener("input", (e) => {
            browser.runtime.sendMessage({
                command: "import",
                payload: e.target.files[FIRST]
            });
        }, {
            passive: true,
            capture: false
        });

        // This also triggers with changes that the user made, not only import.
        preferences.addEventListener("change", ({ detail: {
            pref, value
        } }) => {
            if(recentlySaved.has(pref)) {
                recentlySaved.delete(pref);
            }
            else if(pref in prefs) {
                this.loadValue(pref, value, true);
            }
        });
    }
    loadValue(pref, value, reset = false) {
        const prefType = prefs[pref].type,
            valueSetter = OptionsPage.VALUE_PROPERTY[prefType];
        if(!prefs[pref].hideDefault || prefs[pref].value !== value) {
            document.getElementById(pref)[valueSetter] = value;
        }
        else if(reset) {
            // The default is hidden, which is only possible for text & numbers.
            document.getElementById(pref).value = '';
        }
    }
    loadValues(withDefaults = false) {
        let request;
        if(withDefaults) {
            request = {};
            for(const p in prefs) {
                if(prefs[p].type !== "string") {
                    request[p] = prefs[p].value;
                }
                else {
                    request[p] = '';
                }
            }
        }
        else {
            request = Object.keys(prefs);
        }
        return browser.storage.local.get(request).then((stored) => {
            for(const p in stored) {
                this.loadValue(p, stored[p]);
            }
        });
    }
}

new OptionsPage();
