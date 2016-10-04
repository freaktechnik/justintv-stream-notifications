/**
 * Exports each provider as a property named after the provider's type. Each
 * provider is assumed to be frozen.
 * @author Martin Giger
 * @license MPL-2.0
 * @module providers
 */
import twitch from "./twitch";
import hitbox from "./hitbox";
import ustream from "./ustream";
import youtube from "./youtube";
import livestream from "./livestream";
import mlg from "./mlg";
import azubu from "./azubu";
import beam from "./beam";
import picarto from "./picarto";
import newlivestream from "./new-livestream";
import douyutv from "./douyutv";
import dailymotion from "./dailymotion";

export default {
    twitch,
    hitbox,
    ustream,
    youtube,
    livestream,
    mlg,
    azubu,
    beam,
    picarto,
    newlivestream,
    douyutv,
    dailymotion
};
