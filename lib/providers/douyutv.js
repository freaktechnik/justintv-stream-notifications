/**
 * Douyutv provider. API reverseengineering is in #125.
 * @author Martin Giger
 * @license MPL-2.0
 * @module providers/douyutv
 * @todo support adding by url slug name
 */

"use strict";
const { Class: newClass } = require("sdk/core/heritage");
const { emit } = require("sdk/event/core");
const { Channel } = require('../channel/core');
const { GenericProvider } = require("./generic-provider");
const md5 = require('md5');

const type = "douyutv",
      baseURL = "http://www.douyutv.com/api/v1/",
      roomURL = "http://www.douyutv.com";

const getChannelFromJSON = (json) => {
    const chan = new Channel(json.room_id, type);
    chan.uname = json.room_name;
    chan.title = json.subject;
    chan.url.push(roomURL + json.url);
    chan.image = {
        200: json.owner_avatar
    };
    chan.archiveUrl = roomURL + json.url;
    chan.live = json.show_status == "1";
    chan.thumbnail = json.room_src;
    chan.category = json.game_name;
    chan.viewers = json.online;
    return chan;
};

const signAPI = (endpoint, id) => {
    const argument = endpoint + id + "?aid=android&client_sys=android&time=" + Date.now();
    const sign = md5(argument + '1231');
    return argument + "&auth=" + sign;
};

const Douyutv = newClass(
/** @lends module:providers/douyutv~Douyutv */
{
    extends: GenericProvider,
    authURL: ["http://www.douyutv.com"],
    getChannelDetails: function(username) {
        return this._qs.queueRequest(baseURL + signAPI("room/", username)).then((data) => {
            if(data.json && data.json.error === 0) {
                return getChannelFromJSON(data.json.data);
            }
            else {
                throw "Couldn't get room info for douyutv channel with ID " +username;
            }
        });
    },
    updateRequest: function(channels) {
        const urls = channels.map((ch) => baseURL + signAPI("room/", ch.login));
        this._qs.queueUpdateRequest(urls, this._qs.HIGH_PRIORITY, (data) => {
            if(data.json && data.json.error === 0) {
                emit(this, "updatedchannels", getChannelFromJSON(data.json.data));
            }
        });
    }
});

module.exports = Object.freeze(new Douyutv(type));
