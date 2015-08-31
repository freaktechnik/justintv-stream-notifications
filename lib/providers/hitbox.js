/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 *
 * Hitbox provider
 */

//TODO it's not possible to get followers via hitbox API as of yet.

"use strict";
const { Class: newClass } = require("sdk/core/heritage");
const { emit } = require("sdk/event/core");
var { Channel } = require('../channeluser');
const { GenericProvider } = require("./generic-provider");

var type = "hitbox",
    archiveURL = "/videos",
    chatURL = "http://hitbox.tv/embedchat/",
    headers = {},
    baseURL = "http://api.hitbox.tv",
    cdnURL = "http://edge.sf.hitbox.tv";

function requeue(data) {
    return data.status > 499;
}

function getChannelFromJson(json) {
    var cho = new Channel();
    cho.login = json.channel.user_name;
    cho.uname = json.media_display_name;
    cho.url.push(json.channel.channel_link);
    cho.archiveUrl = json.channel.channel_link + archiveURL;
    cho.chatUrl = chatURL + json.channel.user_name;
    cho.type = type;
    cho.image = { "200": cdnURL+json.channel.user_logo,
                  "50": cdnURL+json.channel.user_logo_small };
    cho.title = json.media_status;
    cho.category = json.category_name;
    cho.viewers = json.media_views;
    cho.thumbnail = cdnURL+json.media_thumbnail;
    cho.live = json.media_is_live != "0";
    return cho;
}

const Hitbox = newClass({
    extends: GenericProvider,
    authURL: ["http://www.hitbox.tv"],
    getChannelDetails: function(channelname) {
        return this._qs.queueRequest(baseURL+'/media/live/'+channelname, headers, requeue).then(function(data) {
            if(data.status == 200 && data.json && data.json.livestream )
                return getChannelFromJson(data.json.livestream[0]);
            else
                throw "Error getting details for Hitbox channel " + channelname;
        });
    },
    updateRequest: function(channels) {
        var urls = channels.map((channel) => { return baseURL+'/media/live/'+channel.login; });
        this._qs.queueUpdateRequest(urls, headers, this._qs.HIGH_PRIORITY, requeue, (data) => {
            if(data.status == 200 && data.json && data.json.livestream)
                emit(this, "updatedchannels", getChannelFromJson(data.json.livestream[0]));
        });
    }
});

module.exports = new Hitbox(type);


