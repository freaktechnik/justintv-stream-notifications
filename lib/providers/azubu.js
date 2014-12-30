/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */
 
"use strict";
var _     = require("sdk/l10n").get;
var { data } = require("sdk/self");
var { Channel, User }    = require('../channeluser');

var type    = "azubu",
    baseURL = 'https://api.azubu.tv/public/',
    avatar  = { "69": data.url("azubu.png") },
    headers = {};

var qs = require("../queueservice").getServiceForProvider(type);

function requeue(response) {
    return response.status > 499;
}

function getChannelFromJSON(jsonChannel) {
    console.info("Azubu:getChannelFromJSON");
    var ret        = new Channel();
    ret.login      = jsonChannel.user.username;
    ret.uname      = jsonChannel.user.display_name;
    ret.url.push(jsonChannel.url_channel);
    ret.archiveUrl = jsonChannel.url_channel;
    ret.chatUrl    = jsonChannel.url_chat;
    ret.image      = avatar;
    ret.type       = type;
    ret.live       = jsonChannel.is_live;
    ret.thumbnail  = jsonChannel.url_thumbnail;
    ret.viewers    = jsonChannel.view_count;
    return ret;
}

const Azubu = {
    name: _("provider_"+type),
    toString: function() { return this.name; },
    authURL: ["http://www.azubu.tv"],
    supports: { favorites: true, credentials: true },
    getUserFavorites: function(username, userCallback, channelsCallback) {
        qs.queueRequest("http://www.azubu.tv/api/user/"+username+"/followings/list", headers, requeue, function(data) {
            if(data.json && data.json.data) {
                var user = new User();
                user.login = username;
                user.uname = username;
                user.type = type;
                user.image = avatar;
                user.favorites = data.json.data.map(function(follow) { return follow.username; });
                userCallback(user);

                data.json.data.forEach(function(follow) {
                    Azubu.getChannelDetails(follow.username, function(channel) {
                        channelsCallback([channel]);
                    });
                });
            }
        });
    },
    getChannelDetails: function(channelname, callback) {
        qs.queueRequest(baseURL + "channel/" + channelname, headers, requeue, function(data) {
            if(data.status == 200 && data.json) {
                callback(getChannelFromJSON(data.json.data));
            }
        });
    },
    updateFavsRequest: function(users, userCallback, channelsCallback) {
        var urls = users.map(function(user) { return "http://wwww.azubu.tv/api/user/"+user.login+"/followings/list"; });
        qs.queueUpdateRequest(urls, headers, qs.LOW_PRIORITY, requeue, function(data) {
            if(data.json && data.json.data) {
                var user = new User();
                user.login = username;
                user.uname = username;
                user.type = type;
                user.image = avatar;
                user.favorites = data.json.data.map(function(follow) { return follow.username; });
                userCallback(user);

                data.json.data.forEach(function(follow) {
                    Azubu.getChannelDetails(follow.username, function(channel) {
                        channelsCallback([channel]);
                    });
                });
            }
        });
    },
    removeFavsRequest: function() {
        qs.unqueueUpdateRequest(qs.LOW_PRIORITY);
    },
    updateRequest: function(channels, callback) {
        qs.queueUpdateRequest([baseURL + "channel/live/list"], headers, qs.HIGH_PRIORITY, requeue, function(data) {
            if(data.json && data.json.data && data.json.data.length > 0) {
                var ret = [];
                data.json.data.forEach(function(channel) {
                    if(channels.some(function(ch) { return ch.login == channel.user.username; })) {
                        ret.push(getChannelFromJSON(channel));
                    }
                });
                channels.forEach(function(channel) {
                    if(channel.live && !ret.some(function(ch) { return ch.login == channel.login; })) {
                        channel.live == false;
                        ret.push(channel);
                    }
                });
                callback(ret);
            }
        });
    },
    removeRequest: function() {
        qs.unqueueUpdateRequest(qs.HIGH_PRIORITY);
    },
    updateChannel: function(channelname, callback) {
        console.info("Azubu.updateChannel");
        this.getChannelDetails(channelname, callback);
    },
    updateChannels: function(channels, callback) {
        console.info("Azubu.updateChannels");
        var ret = [];
        channels.forEach(function(channel) {
            this.updateChannel(channel.login, function(channel) {
                ret.push(channel);
                if(ret.length == channels.length)
                    callback(ret);
            });
        }, this);
    }
};

module.exports = Azubu;

