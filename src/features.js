/**
 * @author Martin Giger
 * @license MPL-2.0
 * @module features
 */

/**
 * @async
 * @returns {boolean} Indicates if stream link functionality is available.
 */
const hasStreamlink = () => browser.management.get("streamlink.firefox.helper@gmail.com")
        .then(() => true)
        .catch(() => false),
    isAndroid = () => browser.runtime.getPlatformInfo()
        .then(({ os }) => os === "android")
        .catch(() => false);

export {
    hasStreamlink,
    isAndroid
};
