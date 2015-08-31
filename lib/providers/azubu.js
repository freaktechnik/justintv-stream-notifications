/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */

"use strict";
const { Class: newClass } = require("sdk/core/heritage");

let { reject } = require("sdk/core/promise");
var { data } = require("sdk/self");
let { Task: { async } } = require("resource://gre/modules/Task.jsm");

var { Channel, User } = require('../channeluser');
var { PaginationHelper, promisedPaginationHelper } = require('../pagination-helper');
const { GenericProvider } = require("./generic-provider");

var type    = "azubu",
    baseURL = 'https://api.azubu.tv/public/',
    avatar  = { "69": data.url("azubu.png") },
    headers = {};

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

const Azubu = newClass({
    extends: GenericProvider,
    authURL: ["http://www.azubu.tv"],
    _supportsFavorites: true,
    _supportsCredentials: true,
    getUserFavorites: async(function*(username) {
        let data = yield this._qs.queueRequest("http://www.azubu.tv/api/user/"+username+"/followings/list", headers, requeue);
        if(data.json && data.json.data) {
            var user = new User();
            user.login = username;
            user.uname = username;
            user.type = type;
            user.image = avatar;
            user.favorites = data.json.data.map((follow) => follow.username);

            let channels = yield Azubu.updateChannels(data.json.data.map(function(follow) {
                return { login: follow.username };
            }));

            return [ user, channels ];
        }
        else {
            throw "Couldn't get the azubu user "+username;
        }
    }),
    getChannelDetails: function(channelname) {
        return this._qs.queueRequest(baseURL + "channel/list?channels=" + channelname, headers, requeue).then(function(data) {
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
        this._qs.queueUpdateRequest(urls, headers, this._qs.LOW_PRIORITY, requeue, function(data, url) {
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
                }).map((follow) => { return { login: follow.username }; })).then(channelsCallback);
            }
        });
    },
    updateRequest: function(channels, callback) {
        var channelnames = channels.map((ch) => ch.login).join(",");

        new PaginationHelper({
            url: baseURL + "channel/list?channels="+channelnames+"&offset=",
            pageSize: 100,
            request: (url, callback, initial) => {
                if(initial) {
                    this._qs.queueUpdateRequest([url], headers, this._qs.HIGH_PRIORITY, requeue, callback);
                }
                else {
                    this._qs.queueRequest(url, headers, requeue).then(callback);
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
    updateChannels: function(channels) {
        if(channels.length === 0) return reject();

        console.info("Azubu.updateChannels");
        var channelnames = channels.map((ch) => ch.login).join(",");

        return promisedPaginationHelper({
            url: baseURL + "channel/list?channels="+channelnames+"&offset=",
            pageSize: 100,
            request: (url, callback, initial) => {
                this._qs.queueRequest(url, headers, requeue).then(callback);
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
});

module.exports = new Azubu(type);

