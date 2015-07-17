/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */

"use strict";
var _     = require("sdk/l10n").get;
let { all } = require("sdk/core/promise");
let { Task: { async } } = require("resource://gre/modules/Task.jsm");


var { Channel, User }    = require('../channeluser');

var type          = "ustream",
    chatURL       = "http://ustream.tv/socialstream/",
    baseURL       = 'https://api.ustream.tv/',
    headers       = {};

var qs = require("../queueservice").getServiceForProvider(type);

function requeue(response) {
    return response.status > 499;
}

function getChannelFromJSON(jsonChannel) {
    console.info("ustream:getChannelFromJSON");
    var ret        = new Channel();
    ret.login      = jsonChannel.id;
    ret.uname      = jsonChannel.title;
    ret.url.push(jsonChannel.tinyurl);
    ret.archiveUrl = jsonChannel.tinyurl;
    ret.chatUrl    = chatURL + jsonChannel.id;
    ret.image      = { "48": jsonChannel.owner.picture};
    ret.type       = type;
    ret.title      = "";
    ret.category   = "";
    if(jsonChannel.tags.length)
        ret.category = jsonChannel.tags[0];
    ret.live       = jsonChannel.status == "live";
    ret.thumbnail  = jsonChannel.thumbnail.live;
    ret.viewers    = ret.live ? jsonChannel.stats.viewer : jsonChannel.stats.viewer_total;
    return ret;
}

const Ustream = {
    name: _("provider_"+type),
    toString: function() { return this.name; },
    authURL: ["http://ustream.tv"],
    supports: { favorites: false, credentials: false },
    getUserFavorites: function(username, userCallback, channelsCallback) {
        throw new Error("Ustream.getUserFavorites is not supported.");
    },
    getChannelDetails: async(function*(channelname) {
        let data = yield qs.queueRequest("http://ustream.tv/"+channelname, headers, requeue);

        if(data.status == 200) {
            var channelId = data.text.match(/<meta name="ustream:channel_id" content="([0-9]+)">/)[1];
            let response = yield qs.queueRequest(baseURL+"channels/"+channelId+".json", headers, requeue);

            if(response.json && response.json.channel)
                return getChannelFromJSON(response.json.channel);
        }
        else {
            throw "Error getting channel details for channel " + channelname;
        }
    }),
    updateFavsRequest: function(users, userCallback, channelCallback) {
        throw new Error("Ustream.updateFavsRequest is not supported.");
    },
    removeFavsRequest: function() {
        qs.unqueueUpdateRequest(qs.LOW_PRIORITY);
    },
    updateRequest: function(channels, callback) {
        var urls = channels.map(function(channel) { return baseURL+"channels/"+channel.login+".json"; });
        qs.queueUpdateRequest(urls, headers, qs.HIGH_PRIORITY, requeue, function(data) {
            if(data.json && data.json.channel) {
                callback(getChannelFromJSON(data.json.channel));
            }
        });
    },
    removeRequest: function() {
        qs.unqueueUpdateRequest(qs.HIGH_PRIORITY);
    },
    updateChannel: function(channelname) {
        console.info("Ustream.updateChannel");
        return qs.queueRequest(baseURL+'channels/'+channelname, headers, requeue).then(function(data) {
            console.info("Ustream.updateChannel.requestCallback");
            if(data.json && data.json.channel) {
                return getChannelFromJSON(data.json.channel);
            }
        });
    },
    updateChannels: function(channels, callback) {
        console.info("Ustream.updateChannels");
        all(channels.map((channel) => Ustream.updateChannel(channel.login))).then(callback);
    }
};

module.exports = Ustream;

