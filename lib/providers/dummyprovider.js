/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */

"use strict";
var _ = require("sdk/l10n").get;
var { Channel, User } = require('../channeluser');

var type          = "dummy",
    chatURL       = "http://example.com/chat",
    baseURL       = 'https://example.com/api/',
    headers       = {};

var qs = require("../queueservice").getServiceForProvider(type);

function requeue(response) {
    return response.status > 499;
}

function getChannelFromJSON(jsonChannel) {
    var ret        = new Channel();
    ret.uname      = jsonChannel;
    ret.login      = jsonChannel;
    ret.type       = type;
    ret.image      = {};
    ret.live       = jsonChannel;
    ret.title      = jsonChannel;
    ret.viewers    = jsonChannel;
    ret.thumbnail  = jsonChannel;
    ret.url.push(jsonChannel);
    ret.archiveUrl = jsonChannel;
    ret.chatUrl    = chatURL+jsonChannel/*.TODO*/;
    ret.category = jsonChannel;
    return ret;
}

const Dummy = {
    name: _("provider_"+type),
    toString: function() { return this.name; },
    authURL: ["http://example.com"],
    supports: { favorites: false, credentials: false },
    getUserFavorites: function(username, userCallback, channelsCallback) {
        throw new Error("Dummy.getUserFavorites is not supported.");
    },
    getChannelDetails: function(channelname, callback) {
        qs.queueRequest(baseURL+"channels/"+channelname+".json", headers, requeue, function(response) {
            if(response.json && response.json.channel)
                callback(getChannelFromJSON(response.json.channel));
        });
    },
    updateFavsRequest: function(users, userCallback, channelCallback) {
        throw new Error("Dummy.updateFavsRequest is not supported.");
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
    updateChannel: function(channelname, callback) {
        this.getChannelDetails(channelname, callback);
    },
    updateChannels: function(channels, callback) {
        var ret = [];
        channels.forEach(function(channel) {
            this.updateChannel(channel.login, callback);
        }, this);
    }
};

module.exports = Dummy;

