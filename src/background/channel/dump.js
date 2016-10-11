/**
 * Creates a dump of the whole channel list and other relevant settings and
 * can copy it to the clipboard.
 *
 * @author Martin Giger
 * @license MPL-2.0
 * @module channel/dump
 */
import prefs from "../preferences";
import { Channel, User } from "./core";
import { when } from "../../utils";

export const PREFS_MAPPING = Object.freeze({
    queue: Object.freeze({
        interval: "updateInterval",
        ratio: "queue_ratio",
        maxAmount: "queue_maxRequestBatchSize",
        maxRetries: "queueservice_maxRetries"
    }),
    panel: Object.freeze({
        style: "panel_style",
        extras: "panel_extras",
        width: "panel_minWidth",
        height: "panel_maxHeight",
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
 * @property {Array.<Object>} channels - Serialized channels
 * @property {Array.<Object>} users - Serialized users
 * @property {Object} prefs - Collection of important preferences
 * @property {Object} meta - System information
 */

/**
 * Creates a JSON serialized dump of all importand extension data.
 *
 * @param {Array.<module:channel/core.Channel>} channels - Channels to dump.
 * @param {Array.<module:channel/core.User>} users - Users to dump.
 * @returns {module:channel/dump~DataDump} Serialized data dump.
 * @async
 */
export const create = async (channels, users) => {
    const p = {};
    const promises = [];
    for(let branch in PREFS_MAPPING) {
        p[branch] = {};
        for(let name in PREFS_MAPPING[branch]) {
            promises.push(prefs.get(PREFS_MAPPING[branch][name]).then((value) => {
                p[branch][name] = value;
            }));
        }
    }

    await Promise.all(promises);

    for(let branch in p) {
        Object.freeze(p[branch]);
    }

    const platform = await browser.runtime.getPlatformInfo();
    const manifest = browser.runtime.getManifest();

    const debugDump = {
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
 * Creates and copies the data dump to the clipboard.
 *
 * @param {Array.<module:channel/core.Channel>} channels - Channels to dump.
 * @param {Array.<module:channel/core.User>} users - Users to dump.
 */
export const copy = async (channels, users) => {
    const data = await exports.create(channels, users),
        p = when(document, "copy");
    document.execCommand("copy", false, null);
    const e = await p;

    e.clipboardData.setData("application/json", JSON.stringify(data, null, 2));
    e.preventDefault();
    console.log("Data dump copied to clipboard");
};

/**
 * @typedef {Object} ChannelsAndUsers
 * @property {Array.<module:channel/core.Channel>} channels
 * @property {Array.<module:channel/core.User>} users
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
    for(let branch in debugDump.prefs) {
        for(let name in debugDump.prefs[branch]) {
            promises.push(prefs.set(PREFS_MAPPING[branch][name], debugDump.prefs[branch][name]));
        }
    }

    return {
        channels: debugDump.channels.map((c) => Channel.deserialize(c)),
        users: debugDump.users.map((u) => User.deserialize(u))
    };
};
