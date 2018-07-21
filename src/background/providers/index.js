/**
 * Exports each provider as a property named after the provider's type. Each
 * provider is assumed to be frozen.
 * @author Martin Giger
 * @license MPL-2.0
 * @module providers
 * @todo only initialize the providers that have items in the list.
 */

import twitch from "./twitch.js";
import hitbox from "./hitbox.js";
import ustream from "./ustream.js";
import youtube from "./youtube.js";
import livestream from "./livestream.js";
import mlg from "./mlg.js";
import beam from "./beam.js";
import picarto from "./picarto.js";
import newlivestream from "./new-livestream.js";
import douyutv from "./douyutv.js";
import dailymotion from "./dailymotion.js";

export default {
    twitch,
    hitbox,
    ustream,
    youtube,
    livestream,
    mlg,
    beam,
    picarto,
    newlivestream,
    douyutv,
    dailymotion
};
