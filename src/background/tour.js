import prefs from '../preferences.js';

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
         *
         * @returns {?} Resolves when the actions are ran.
         */
        async onInstalled() {
            if(await Tour.enabled()) {
                await browser.tabs.create({
                    url: `${BASE_URL}/firstrun/`
                });
            }
        },
        /**
         * Runs things that should happen when the extension is updated.
         *
         * @returns {?} Resolves after the actions were executed.
         */
        async onUpdate() {
            if(await Tour.enabled()) {
                const { version } = browser.runtime.getManifest();
                let url = `${BASE_URL}/changes/${version}/`;

                if(version.includes("pre")) {
                    url = `https://addons.mozilla.org/firefox/addon/justintv-stream-notificatio/versions/beta#version-${version}`;
                }

                await browser.tabs.create({
                    url,
                    active: false
                });
            }
        }
    };

export default Tour;
