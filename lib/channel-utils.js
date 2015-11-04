/**
 * @author Martin Giger
 * @license MPL-2.0
 * @module channel-utils
 * @hastests
 */

var tabs = require("sdk/tabs");
const livestreamer = require("./livestreamer");

/**
 * Opens the given channel in a new tab, unless there is already a tab open for
 * it. If Livestreamer is enabled and the channel is live, it is opened with
 * Livestreamer instead.
 * @argument {module:channeluser.Channel} channel - The channel to open.
 * @argument {string} [what] - Specifies the action to take. "chat" opens the
 * channel's chat, "archive" opens the archive and "livestreamer" always
 * launches livestreamer.
 */
exports.selectOrOpenTab = function selectOrOpenTab(channel, what) {
    let toCheck = [];

    if(what === "chat")
        toCheck.push(channel.chatUrl);
    else if(what === "archive" || !channel.live)
        toCheck.push(channel.archiveUrl);
    else {
        toCheck = channel.url;

        if(what === "livestreamer" || livestreamer.default)
            return livestreamer.launch(toCheck[0]);
    }

    for(let ti in tabs) {
        if(toCheck.some((url) => url === tabs[ti].url)) {
            tabs[ti].activate();
            return;
        }
    }
    // There's no tab open for the channel
    tabs.open({url: toCheck[0]});
};
