/**
 * Exports each provider as a property named after the provider's type.
 * @author Martin Giger
 * @license MPL-2.0
 * @module providers
 */

"use strict";

/**
 * @type {module:providers/generic-provider.GenericProvider}
 */
exports.twitch = require("./twitch");
/**
 * @type {module:providers/generic-provider.GenericProvider}
 */
exports.hitbox = require("./hitbox");
/**
 * @type {module:providers/generic-provider.GenericProvider}
 */
exports.ustream = require("./ustream");
/**
 * @type {module:providers/generic-provider.GenericProvider}
 */
exports.youtube = require("./youtube");
/**
 * @type {module:providers/generic-provider.GenericProvider}
 */
exports.livestream = require("./livestream");
/**
 * @type {module:providers/generic-provider.GenericProvider}
 */
exports.mlg = require("./mlg");
/**
 * @type {module:providers/generic-provider.GenericProvider}
 */
exports.azubu = require("./azubu");
/**
 * @type {module:providers/generic-provider.GenericProvider}
 */
exports.beam = require("./beam");
/**
 * @type {module:providers/generic-provider.GenericProvider}
 */
exports.picarto = require("./picarto");
/**
 * @type {module:providers/generic-provider.GenericProvider}
 */
exports.newlivestream = require("./new-livestream");
/**
 * @type {module:providers/generic-provider.GenericProvider}
 */
exports.streamup = require("./streamup");
