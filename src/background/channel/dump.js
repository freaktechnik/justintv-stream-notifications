/**
 * Creates a dump of the whole channel list and other relevant settings and
 * can copy it to the clipboard.
 *
 * @author Martin Giger
 * @license MPL-2.0
 * @module channel/dump
 */
import prefs from "../../preferences.js";
import {
    Channel, User
} from "./core.js";

export const PREFS_MAPPING = Object.freeze({
    queue: Object.freeze({
        interval: "updateInterval",
        requests: "queue_concurrentRequests",
        maxRetries: "queueservice_maxRetries"
    }),
    panel: Object.freeze({
        style: "panel_style",
        extras: "panel_extras",
        badge: "panel_badge"
    }),
    misc: Object.freeze({
        cacheTime: "channellist_cacheTime",
        findMature: "find_mature"
    })
});

/**
 * Frozen
 *
 * @typedef {Object} DataDump
 * @property {[Object]} channels - Serialized channels
 * @property {[Object]} users - Serialized users
 * @property {Object} prefs - Collection of important preferences
 * @property {Object} meta - System information
 */

/**
 * Creates a JSON serialized dump of all importand extension data.
 *
 * @param {[module:channel/core.Channel]} channels - Channels to dump.
 * @param {[module:channel/core.User]} users - Users to dump.
 * @returns {module:channel/dump~DataDump} Serialized data dump.
 * @async
 */
export const create = async (channels, users) => {
    const p = {},
        promises = [];
    for(const branch in PREFS_MAPPING) {
        p[branch] = {};
        for(const name in PREFS_MAPPING[branch]) {
            promises.push(prefs.get(PREFS_MAPPING[branch][name]).then((value) => {
                p[branch][name] = value;
            }));
        }
    }

    await Promise.all(promises);

    for(const branch in p) {
        Object.freeze(p[branch]);
    }

    const platform = await browser.runtime.getPlatformInfo(),
        manifest = browser.runtime.getManifest(),
        debugDump = {
            channels: channels.map((c) => c.serialize()),
            users: users.map((u) => u.serialize()),
            prefs: Object.freeze(p),
            meta: Object.freeze({
                version: manifest.version,
                platform: platform.os,
                platformArch: platform.arch,
                language: browser.i18n.getUILanguage(),
                lastError: browser.runtime.lastError
            })
        };
    Object.freeze(debugDump);

    return debugDump;
};

/**
 * @typedef {Object} ChannelsAndUsers
 * @property {[module:channel/core.Channel]} channels
 * @property {[module:channel/core.User]} users
 */

/**
 * Loads a data dump's data into the extension. Applies dumped settings
 * directly.
 *
 * @param {module:channel/dump~DataDump} debugDump - Dump to decode.
 * @returns {module:channel/dump~ChannelsAndUsers} Deserialized channels and
 *          users.
 * @async
 */
export const load = (debugDump) => {
    const promises = [];
    for(const branch in debugDump.prefs) {
        for(const name in debugDump.prefs[branch]) {
            promises.push(prefs.set(PREFS_MAPPING[branch][name], debugDump.prefs[branch][name]));
        }
    }

    return {
        channels: debugDump.channels.map((c) => Channel.deserialize(c)),
        users: debugDump.users.map((u) => User.deserialize(u))
    };
};
