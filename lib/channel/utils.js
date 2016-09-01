/**
 * @author Martin Giger
 * @license MPL-2.0
 * @module channel/utils
 */

import tabs from "sdk/tabs";
import { when } from "sdk/event/utils";

/**
 * Opens the given channel in a new tab, unless there is already a tab open for
 * it.
 *
 * @param {module:channel/core.Channel} channel - The channel to open.
 * @param {string} [what] - Specifies the action to take. "chat" opens the
 *         channel's chat, "archive" opens the archive.
 * @async
 * @returns {number?} The channel should now be visible for the user.
 */
export function selectOrOpenTab(channel, what) {
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

    const checkUrl = (ti, url) => url === tabs[ti].url;
    for(let ti in tabs) {
        if(toCheck.some(checkUrl.bind(null, ti))) {
            const p = when(tabs[ti], "activate");
            tabs[ti].activate();
            return p;
        }
    }
    // There's no tab open for the channel
    const p = when(tabs, "ready");
    tabs.open({ url: toCheck[0] });
    return p;
}
