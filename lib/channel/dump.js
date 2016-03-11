/**
 * Creates a dump of the whole channel list and other relevant settings and
 * can copy it to the clipboard.
 * @author Martin Giger
 * @license MPL-2.0
 * @module channel/dump
 */
"use strict";
const clipboard = require("sdk/clipboard");
const { prefs } = require("sdk/simple-prefs");
const self = require("sdk/self");
const system = require("sdk/system");
const { Channel, User } = require("./core");

const PREFS_MAPPING = Object.freeze({
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
    }),
    livestreamer: Object.freeze({
        enabled: "livestreamer_enabled",
        path: "livestreamer_path",
        player: "livestreamer_player",
        quality: "livestreamer_quality",
        fallbackQuality: "livestreamer_fallbackQuality",
        extraArguments: "livestreamer_extraArguments"
    })
});
exports.PREFS_MAPPING = PREFS_MAPPING;

/**
 * Frozen
 * @typedef {Object} DataDump
 * @property {Array.<Object>} channels - Serialized channels
 * @property {Array.<Object>} users - Serialized users
 * @property {Object} prefs - Collection of important preferences
 * @property {Object} meta - System information
 */

/**
 * Creates a JSON serialized dump of all importand extension data.
 * @argument {Array.<module:channel/core.Channel>} channels
 * @argument {Array.<module:channel/core.User>} users
 * @return {module:channel/dump~DataDump}
 */
exports.create = (channels, users) => {
    const p = {};
    for(let branch in PREFS_MAPPING) {
        p[branch] = {};
        for(let name in PREFS_MAPPING[branch]) {
            p[branch][name] = prefs[PREFS_MAPPING[branch][name]];
        }

        Object.freeze(p[branch]);
    }

    const debugDump = {
        channels: channels.map((c) => c.serialize()),
        users: users.map((u) => u.serialize()),
        prefs: Object.freeze(p),
        meta: Object.freeze({
            version: self.version,
            loadReason: self.loadReason,
            application: system.name,
            platform: system.platform,
            platformVersion: system.version
        })
    };
    Object.freeze(debugDump);

    return debugDump;
};

/**
 * Creates and copies the data dump to the clipboard.
 * @argument {Array.<module:channel/core.Channel>} channels
 * @argument {Array.<module:channel/core.User>} users
 */
exports.copy = (channels, users) => {
    clipboard.set(JSON.stringify(exports.create(channels, users), null, 2));
    console.log("Data dump copied to clipboard");
};

/**
 * @typedef {Object} ChannelsAndUsers
 * @property {Array.<module:channel/core.Channel>} channels
 * @property {Array.<module:channel/core.User>} users
 */

/**
 * Loads a data dump's data into the extension.
 * @argument {module:channel/dump~DataDump} debugDump
 * @return {module:channel/dump~ChannelsAndUsers}
 */
exports.import = (debugDump) => {
    for(let branch in debugDump.prefs) {
        for(let name in debugDump.prefs[branch]) {
            prefs[PREFS_MAPPING[branch][name]] = debugDump.prefs[branch][name];
        }
    }

    return {
        channels: debugDump.channels.map((c) => Channel.deserialize(c)),
        users: debugDump.users.map((u) => User.deserialize(u))
    };
};
