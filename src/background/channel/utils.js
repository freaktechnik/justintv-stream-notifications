/**
 * @author Martin Giger
 * @license MPL-2.0
 * @module channel/utils
 */

import { Channel } from './core';
import LiveState from './live-state';
import prefs from '../../preferences';

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
    else if(what === "archive" || !(await channel.live.isLive())) {
        toCheck.push(channel.archiveUrl);
    }
    else {
        toCheck = channel.url;

        if(what === "livestreamer") {
            const [ url ] = toCheck;
            return browser.runtime.sendMessage("streamlink.firefox.helper@gmail.com", url);
        }
    }

    const tabs = await browser.tabs.query({
        url: toCheck
    });
    if(tabs.length) {
        const [ tab ] = tabs;
        return browser.tabs.update(tab.id, {
            active: true
        });
    }
    // There's no tab open for the channel
    const [ url ] = toCheck;
    return browser.tabs.create({ url });
}

const getRebroadcastTitlePatterns = async () => {
        const patternstr = await prefs.get('rebroadcast_title_pattern'),
            patterns = patternstr.toLowerCase().split(",");
        return patterns.concat(patterns.map((pattern) => `[${pattern}]`));
    },
    cleanTitle = (title) => title.trim().toLowerCase(),
    titleIsRebroadcast = (title, patterns) => {
        const lowerCaseTitle = cleanTitle(title);
        return patterns.some((p) => lowerCaseTitle.startsWith(p));
    };

/**
 * Changes the live state of channels that appear to be rebroadcasting based
 * on their title. Modifies the original channel object.
 *
 * @param {module:channel/core.Channel} channel - Channel to check.
 * @param {Arry.<string>} [patterns] - Patterns that start a rebroadcasting title.
 * Defaults to the rebroadcast_title_pattern pref.
 * @returns {module:channel/core.Channel} Potentially modified channel.
 * @throws When an invalid channel is provided.
 */
export const formatChannel = async (channel, patterns) => {
    if(!(channel instanceof Channel)) {
        throw new TypeError("Invalid channel provided");
    }
    if(channel.title && channel.live.state === LiveState.LIVE) {
        if(!patterns) {
            patterns = await getRebroadcastTitlePatterns();
        }
        if(titleIsRebroadcast(channel.title, patterns)) {
            channel.live = new LiveState(LiveState.REBROADCAST);
        }
    }
    if(channel.live.alternateChannel && channel.live.alternateChannel.live.state === LiveState.REDIRECT && channel.live.alternateChannel.title) {
        if(!patterns) {
            patterns = await getRebroadcastTitlePatterns();
        }
        if(titleIsRebroadcast(channel.live.alternateChannel.title, patterns)) {
            channel.live.alternateChannel.live.state = LiveState.REBROADCAST;
        }
    }
    return channel;
};

/**
 * Optimized version of formatChannel for multiple channels.
 *
 * @param {[module:channel/core.Channel]} channels - Channels to format.
 * @param {boolean} [serialize=false] - If the channels should be serialized
 * while we're at it.
 * @returns {[module:channel/core.Channel|module:channel/core~SerializedChannel]} Formatted channels.
 * @throws When an invalid channel is given.
 */
export const formatChannels = async (channels, serialize = false) => {
    const patterns = await getRebroadcastTitlePatterns(),
        cb = serialize ? (c) => formatChannel(c, patterns).then((ch) => ch.serialize()) : (c) => formatChannel(c, patterns);
    return Promise.all(channels.map(cb));
};

/**
 * Filter channels to exclude existing favorites.
 *
 * @param {module:channel/core.User} user - User whose favs should be excluded.
 * @param {[module:channel/core.Channel]} channels - Channels to filter.
 * @returns {[module:channel/core.Channel]} Filtered array of channels.
 */
export const filterExistingFavs = (user, channels) => channels.filter((ch) => !user.favorites.includes(ch.login));
