/**
 * @author Martin Giger
 * @license MPL-2.0
 * @module channel/utils
 */

import { Channel } from './core.js';
import LiveState from './live-state.js';
import prefs from '../../preferences.js';

const NO_SINCE = 0;

/**
 * Opens the given channel in a new tab, unless there is already a tab open for
 * it.
 *
 * @param {module:channel/core.Channel} channel - The channel to open.
 * @param {string} [what] - Specifies the action to take. "chat" opens the
 *         channel's chat, "archive" opens the archive.
 * @param {string} [disposition='newForegroundTab'] - Omnibox-style disposition
 *                 on where to open the channel.
 * @returns {number?} The channel should now be visible for the user.
 */
export async function selectOrOpenTab(channel, what, disposition = 'newForegroundTab') {
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
        if(disposition == 'newForegroundTab') {
            return browser.tabs.update(tab.id, {
                active: true
            });
        }
        else if(disposition == 'newBackgroundTab') {
            return;
        }
    }
    const [ url ] = toCheck;
    if(disposition == 'currentTab') {
        const tab = await browser.tabs.query({
            active: true,
            lastFocusedWindow: true
        });
        return browser.tabs.update(tab.id, {
            url
        });
    }
    // There's no tab open for the channel
    return browser.tabs.create({
        active: disposition == 'newForegroundTab',
        url
    });
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
    },
    /**
     * Generate an uptime estimated based on local data if not set explicitly.
     *
     * @param {module:channel/core.Channel} channel - Channel to potentially add uptime to.
     * @param {callback} getOldChannel - Callback resolving to the current version of the channel.
     * @returns {module:channel/core.Channel} Potentially updated channel.
     * @throws {TypeError} when not passing a valid channel.
     */
    fillInUptime = async (channel, getOldChannel) => {
        if(!(channel instanceof Channel)) {
            throw new TypeError("Invalid channel provided");
        }
        if(channel.live.created !== NO_SINCE || !(await channel.live.isLive(LiveState.TOWARD_LIVE))) {
            return channel;
        }
        const oldChannel = await getOldChannel(channel);
        if(oldChannel && await oldChannel.live.isLive(LiveState.TOWARD_LIVE)) {
            channel.live.created = oldChannel.live.created;
        }
        else {
            channel.live.created = Date.now();
        }
        return channel;
    };

/**
 * Changes the live state of channels that appear to be rebroadcasting based
 * on their title. Modifies the original channel object.
 *
 * @param {module:channel/core.Channel} channel - Channel to check.
 * @param {callback} getOldChannel - Function to get current channel instance.
 * @param {Arry.<string>} [patterns] - Patterns that start a rebroadcasting title.
 * Defaults to the rebroadcast_title_pattern pref.
 * @returns {module:channel/core.Channel} Potentially modified channel.
 * @throws When an invalid channel is provided.
 */
export const formatChannel = async (channel, getOldChannel, patterns) => {
    if(!(channel instanceof Channel)) {
        throw new TypeError("Invalid channel provided");
    }
    if(channel.title && channel.live.state === LiveState.LIVE) {
        if(!patterns) {
            patterns = await getRebroadcastTitlePatterns();
        }
        if(titleIsRebroadcast(channel.title, patterns)) {
            const liveSince = channel.live.created;
            channel.live = new LiveState(LiveState.REBROADCAST);
            channel.live.created = liveSince;
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
    channel = await fillInUptime(channel, getOldChannel);
    return channel;
};

/**
 * Optimized version of formatChannel for multiple channels.
 *
 * @param {[module:channel/core.Channel]} channels - Channels to format.
 * @param {callback} getOldChannel - Callback to get current version of a channel.
 * @param {boolean} [serialize=false] - If the channels should be serialized
 * while we're at it.
 * @returns {[module:channel/core.Channel|module:channel/core~SerializedChannel]} Formatted channels.
 * @throws When an invalid channel is given.
 */
export const formatChannels = async (channels, getOldChannel, serialize = false) => {
    const patterns = await getRebroadcastTitlePatterns(),
        cb = serialize ? (c) => formatChannel(c, getOldChannel, patterns).then((ch) => ch.serialize()) : (c) => formatChannel(c, getOldChannel, patterns);
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
