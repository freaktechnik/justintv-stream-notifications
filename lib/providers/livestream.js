/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */

"use strict";
const _     = require("sdk/l10n").get;
var { prefs } = require("sdk/simple-prefs");
let { all } = require("sdk/core/promise");
let { Task: { async } } = require("resource://gre/modules/Task.jsm");

const { Channel, User }    = require('../channeluser');

var type = "livestream",
    archiveURL = "/videos",
    headers = {},
    baseURL = ".api.channel.livestream.com/2.0/";

var qs = require("../queueservice").getServiceForProvider(type);

function requeue(data) {
    return data.status > 499;
}

function getChannelAPIUrl(channellogin) {
    return "http://x"+channellogin.replace("_","-","g")+"x"+baseURL;
}

const getLivestreamChannelInfo = async(function*(username) {
    var ch = new Channel();
    ch.type = type;
    ch.login = username.toLowerCase();

    let [ data, response ] = yield all([
        qs.queueRequest(getChannelAPIUrl(ch.login)+"info.json", headers, requeue),
        qs.queueRequest(getChannelAPIUrl(ch.login)+"latestclips.json?maxresults=1", headers, requeue)
    ]);

    if(data.json && data.json.channel) {
        console.debug("Creating livestream channel");
        ch.uname = data.json.channel.title;
        ch.title = "";
        ch.url.push(data.json.channel.link);
        ch.image = { "100": data.json.channel.image.url };
        ch.category = data.json.channel.category;
        ch.live = data.json.channel.isLive;
        ch.viewers = data.json.channel.currentViewerCount;
        ch.archiveUrl = data.json.channel.link;
        ch.chatUrl = data.json.channel.link+"/chat";

        if(response.json && response.json.channel.item && response.json.channel.item.length > 0) {
            ch.thumbnail = response.json.channel.item[0].thumbnail["@url"];
        }

        return ch;
    }
    else {
        throw "Error getting details for the Livestream channel " + username;
    }
});

const Livestream = {
    name: _("provider_"+type),
    toString: function() { return this.name; },
    authURL: ["http://new.livestream.com"],
    supports:  { favorites: false, credentials: false },
    getUserFavorites: function(username, userCallback, channelsCallback) {
        //TODO
        qs.queueRequest(baseURL+''+username, headers, requeue).then(function(data) {
            userCallback(Object.assign(new User(), data.user));
            var channels = [];
            data.follows.forEach(function(channel) {
                channels.push(Object.assign(new Channel(), channel));
            });
            channelsCallback(channels);
        });
    },
    getChannelDetails: getLivestreamChannelInfo,
    updateFavsRequest: function(users, userCallback, channelsCallback) {
        //TODO
        //qs.queueUpdateRequest(channels, headers, qs.LOW_PRIORITY, requeue, function(data) {
        //    callback(data);
        //});
    },
    removeFavsRequest: function() {
        qs.unqueueUpdateRequest(qs.LOW_PRIORITY);
    },
    updateRequest: function(channels, callback) {
        var urls = channels.map((channel) => { return getChannelAPIUrl(channel.login)+"livestatus.json"; });
        qs.queueUpdateRequest(urls, headers, qs.HIGH_PRIORITY, requeue, function(data, url) {
            if(data.json && data.json.channel) {
                var requestLogin = url.match(/http:\/\/x([a-zA-Z0-9-]+)x\./)[1].replace("-","_"),
                    channel = channels.find((channel) => { return requestLogin == channel.login;});
                channel.live = data.json.channel.isLive;
                channel.viewers = data.json.channel.currentViewerCount;
                qs.queueRequest(getChannelAPIUrl(channel.login)+"latestclips.json?maxresults=1", headers, requeue).then(function(data) {
                    if(data.json && data.json.channel.item) {
                        channel.thumbnail = data.json.channel.item[0].thumbnail["@url"];
                        callback(channel);
                    }
                });
            }
        });
    },
    removeRequest: function() {
        qs.unqueueUpdateRequest(qs.HIGH_PRIORITY);
    },
    updateChannel: getLivestreamChannelInfo,
    updateChannels: function(channels, callback) {
        all(channels.map((channel) => this.updateChannel(channel.login, callback))).then(callback);
    }
};

module.exports = Livestream;

