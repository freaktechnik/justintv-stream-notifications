/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */

//TODO get live status and maybe a title or something

"use strict";
var _ = require("sdk/l10n").get;
let { all, reject, resolve } = require("sdk/core/promise");
var { Channel, User } = require('../channeluser');

var type          = "picarto",
    chatURL       = "",
    baseURL       = 'https://picarto.tv',
    headers       = {};

var qs = require("../queueservice").getServiceForProvider(type);

function requeue(response) {
    return response.status > 499;
}

function getChannelFromUsername(username) {
    var ret        = new Channel();
    ret.uname      = username;
    ret.login      = username;
    ret.type       = type;
    ret.image      = {101: baseURL + "/channel_img/" + username + "/dsdefault.jpg"};
    ret.live       = false;
    ret.title      = "";
    ret.thumbnail  = baseURL + "/channel_img/" + username + "/thumbnail_stream.png";
    ret.url.push(baseURL + "/live/channel.php?watch=" + username);
    ret.archiveUrl = baseURL + "/live/channel.php?watch=" + username;
    return ret;
}

const Picarto = {
    name: _("provider_"+type),
    toString: function() { return this.name; },
    authURL: ["http://picarto.tv"],
    supports: { favorites: false, credentials: false },
    getUserFavorites: function(username) {
        return reject(this.name+".getUserFavorites is not supported.");
    },
    getChannelDetails: function(channelname) {
        return resolve(getChannelFromUsername(channelname));
    },
    updateFavsRequest: function(users, userCallback, channelCallback) {
        throw new Error(this.name+".updateFavsRequest is not supported.");
    },
    removeFavsRequest: function() {
        qs.unqueueUpdateRequest(qs.LOW_PRIORITY);
    },
    updateRequest: function(channels, callback) {
        var urls = channels.map(function(channel) { return baseURL+"channels/"+channel.login+".json"; });
        qs.queueUpdateRequest(urls, headers, qs.HIGH_PRIORITY, requeue, function(data) {
            if(data.json && data.json.channel) {
                callback(getChannelFromUsername(data.json.channel.login));
            }
        });
    },
    removeRequest: function() {
        qs.unqueueUpdateRequest(qs.HIGH_PRIORITY);
    },
    updateChannel: function(channelname) {
        return this.getChannelDetails(channelname);
    },
    updateChannels: function(channels) {
        return all(channels.map((channel) => this.updateChannel(channel.login)));
    }
};

module.exports = Picarto;

