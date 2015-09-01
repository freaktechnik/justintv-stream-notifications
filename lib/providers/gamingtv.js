/**
 * Gaming.tv provider. See Issue #87 for API reverse engineering infos.
 * @author Martin Giger
 * @license MPL-2.0
 * @module providers/gamingtv
 */

"use strict";

const { Class: newClass } = require("sdk/core/heritage");
const { emit } = require("sdk/event/core");
const { Channel } = require("../channeluser");
const { GenericProvider } = require("./generic-provider");

const type = "gamingtv",
      baseURL = "https://api.gaming.tv/v1",
      headers = {},
      requeue = (data) => data.status > 499;

const getChannelFromJSON = (json) => {
    let chan = new Channel();
    chan.login = json.username;
    chan.uname = json.channel.username;
    chan.image = {
        "400": json.imageUrl
    };
    chan.title = json.channel.title;
    chan.live = json.channel.isLive;
    chan.viewers = json.channel.stats.viewers;
    chan.thumbnail = json.channel.imagePreviewUrl;
    chan.category = json.channel.game.name;
    chan.chatUrl = "http://www.gaming.tv/embed/"+json.username+"?chat=true";
    chan.url.push("http://gaming.tv/"+json.channel.username);
    chan.archiveUrl = "http://gaming.tv/"+json.channel.username;
    chan.type = type;
    return chan;
};

const Gamingtv = newClass({
    extends: GenericProvider,
    authURL: [ "http://gaming.tv" ],
    getChannelDetails: function(channelname) {
        return this._qs.queueRequest(baseURL + "/user/" + channelname, headers, requeue).then((data) => {
            if(data.json && !data.json.code) {
                return getChannelFromJSON(data.json);
            }
            else {
                throw "Couldn't get details for Gaming.tv channel "+channelname;
            }
        });
    },
    updateRequest: function(channels) {
        let urls = channels.map((channel) => baseURL + "/user/" + channel.login);
        this._qs.queueUpdateRequest(urls, headers, this._qs.HIGH_PRIORITY, requeue, (data) => {
            if(data.json && !data.json.code) {
                emit(this, "updatedchannels", getChannelFromJSON(data.json));
            }
        });
    }
});

module.exports = new Gamingtv(type);
