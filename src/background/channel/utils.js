/**
 * @author Martin Giger
 * @license MPL-2.0
 * @module channel/utils
 */

/**
 * Opens the given channel in a new tab, unless there is already a tab open for
 * it.
 *
 * @param {module:channel/core.Channel} channel - The channel to open.
 * @param {string} [what] - Specifies the action to take. "chat" opens the
 *         channel's chat, "archive" opens the archive.
 * @returns {number?} The channel should now be visible for the user.
 */
export async function selectOrOpenTab(channel, what) {
    let toCheck = [];

    if(what === "chat") {
        toCheck.push(channel.chatUrl);
    }
    else if(what === "archive" || !channel.live.isLive()) {
        toCheck.push(channel.archiveUrl);
    }
    else {
        toCheck = channel.url;

        if(what === "livestreamer") {
            throw "Not supported";
        }
    }

    const tabs = await browser.tabs.query({
        url: toCheck
    });
    if(tabs.length) {
        return browser.tabs.update(tabs[0].id, {
            active: true
        });
    }
    // There's no tab open for the channel
    return browser.tabs.create({ url: toCheck[0] });
}
