/**
 * @author Martin Giger
 * @license MPL-2.0
 * @module features
 */

/**
 * @async
 * @returns {boolean} Indicates if stream link functionality is available.
 */
const hasStreamlink = async () => {
        try {
            const hasPermission = await browser.permissions.contains({
                permissions: [
                    'management'
                ]
            });
            if(hasPermission) {
                const sl = await browser.management.get("streamlink.firefox.helper@gmail.com")
                return true;
            }
        }
        catch(e) {
            // fall through
        }
        return false
    },
    isAndroid = () => browser.runtime.getPlatformInfo()
        .then(({ os }) => os === "android")
        .catch(() => false);

export {
    hasStreamlink,
    isAndroid
};
