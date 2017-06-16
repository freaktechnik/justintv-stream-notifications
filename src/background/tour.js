import prefs from './preferences';

const BASE_URL = "http://streamnotifier.ch",
    Tour = {
        /**
         * If any of the tour things should happen.
         *
         * @async
         * @returns {boolean} If the tour is enabled.
         */
        enabled() {
            return prefs.get('updateTab');
        },
        /**
         * Runs things that should run when the extension is installed.
         */
        async onInstalled() {
            if(await Tour.enabled()) {
                return browser.tabs.create({
                    url: BASE_URL + "/firstrun/"
                });
            }
        },
        /**
         * Runs things that should happen when the extension is updated.
         */
        async onUpdate() {
            if(await Tour.enabled()) {
                return browser.tabs.create({
                    url: `${BASE_URL}/changes/${browser.runtime.getManifest().version}/`,
                    active: false
                });
            }
        }
    };
