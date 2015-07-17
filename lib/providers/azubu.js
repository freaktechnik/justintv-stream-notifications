/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */

"use strict";
var _ = require("sdk/l10n").get;
let { reject } = require("sdk/core/promise");
var { data } = require("sdk/self");

var { Channel, User } = require('../channeluser');
var { PaginationHelper, promisedPaginationHelper } = require('../pagination-helper');
var channelUtils = require("../channel-utils");

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
    ret.image      = { 50: jsonChannel.user.profile.url_photo_small };
    ret.type       = type;
    ret.live       = jsonChannel.is_live;
    ret.thumbnail  = jsonChannel.url_thumbnail;
    ret.viewers    = jsonChannel.view_count;
    ret.title      = jsonChannel.title;
    ret.category   = jsonChannel.category.title;
    return ret;
}

const Azubu = {
    name: _("provider_"+type),
    toString: function() { return this.name; },
    authURL: ["http://www.azubu.tv"],
    supports: { favorites: true, credentials: true },
    getUserFavorites: function(username, userCallback, channelsCallback) {
        qs.queueRequest("http://www.azubu.tv/api/user/"+username+"/followings/list", headers, requeue).then(function(data) {
            if(data.json && data.json.data) {
                var user = new User();
                user.login = username;
                user.uname = username;
                user.type = type;
                user.image = avatar;
                user.favorites = data.json.data.map((follow) => follow.username);
                userCallback(user);

                Azubu.updateChannels(data.json.data.map(function(follow) {
                    return { login: follow.username };
                }), channelsCallback);
            }
        });
    },
    getChannelDetails: function(channelname) {
        return qs.queueRequest(baseURL + "channel/list?channels=" + channelname, headers, requeue).then(function(data) {
            if(data.status == 200 && data.json) {
                 return getChannelFromJSON(data.json.data[0]);
            }
            else {
                throw "Error getting channel details for channel " + channelname;
            }
        });
    },
    updateFavsRequest: function(users, userCallback, channelsCallback) {
        var urls = users.map(function(user) { return "http://wwww.azubu.tv/api/user/"+user.login+"/followings/list"; });
        qs.queueUpdateRequest(urls, headers, qs.LOW_PRIORITY, requeue, function(data, url) {
            if(data.json && data.json.data) {
                var username = url.match(/http:\/\/www.\.azubu\.tv\/\/user\/([^\/]+?)\/followings\/list/)[1];
                var user = users.find((u) => u.login === username);
                var usr = new User();
                usr.login = user.login;
                usr.uname = user.uname;
                usr.type = type;
                usr.image = user.image;
                usr.favorites = data.json.data.map((follow) => follow.username);
                userCallback(usr);

                // only add the channels the user wasn't following already.
                Azubu.updateChannels(data.json.data.filter((follow) => {
                    return !user.favorites.some((fav) => fav === follow.username);
                }).map((follow) => { return { login: follow.username }; }), channelsCallback);
            }
        });
    },
    removeFavsRequest: function() {
        qs.unqueueUpdateRequest(qs.LOW_PRIORITY);
    },
    updateRequest: function(channels, callback) {
        var channelnames = channels.map((ch) => ch.login).join(",");

        new PaginationHelper({
            url: baseURL + "channel/list?channels="+channelnames+"&offset=",
            pageSize: 100,
            request: function(url, callback, initial) {
                if(initial) {
                    qs.queueUpdateRequest([url], headers, qs.HIGH_PRIORITY, requeue, callback);
                }
                else {
                    qs.queueRequest(url, headers, requeue).then(callback);
                }
            },
            fetchNextPage: function(data, pageSize) {
                return data.json.data.length === pageSize;
            },
            onComplete: function(chans) {
                callback(chans.map((channel) => getChannelFromJSON(channel)));
            },
            getItems: function(data) {
                if(data.json && data.json.data) {
                    return data.json.data;
                }
                else {
                    return [];
                }
            }
        });
    },
    removeRequest: function() {
        qs.unqueueUpdateRequest(qs.HIGH_PRIORITY);
    },
    updateChannel: function(channelname) {
        console.info("Azubu.updateChannel");
        return this.getChannelDetails(channelname);
    },
    updateChannels: function(channels) {
        if(channels.length === 0) return reject();

        console.info("Azubu.updateChannels");
        var channelnames = channels.map((ch) => ch.login).join(",");

        return promisedPaginationHelper({
            url: baseURL + "channel/list?channels="+channelnames+"&offset=",
            pageSize: 100,
            request: function(url, callback, initial) {
                qs.queueRequest(url, headers, requeue).then(callback);
            },
            fetchNextPage: function(data, pageSize) {
                return data.json.data.length === pageSize;
            },
            getItems: function(data) {
                if(data.json && data.json.data) {
                    return data.json.data;
                }
                else {
                    return [];
                }
            }
        }).then((chans) => chans.map((channel) => getChannelFromJSON(channel)));
    }
};

module.exports = Azubu;

