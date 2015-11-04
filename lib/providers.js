/**
 * Exports each provider as a property named after the provider's type.
 * @author Martin Giger
 * @license MPL-2.0
 * @module providers
 * @hastests
 */

"use strict";

exports.twitch = require("./providers/twitch");
exports.hitbox = require("./providers/hitbox");
exports.ustream = require("./providers/ustream");
exports.youtube = require("./providers/youtube");
exports.livestream = require("./providers/livestream");
exports.mlg = require("./providers/mlg");
exports.azubu = require("./providers/azubu");
exports.beam = require("./providers/beam");
exports.picarto = require("./providers/picarto");
exports.newlivestream = require("./providers/new-livestream");
exports.streamup = require("./providers/streamup");
