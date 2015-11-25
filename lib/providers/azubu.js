/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */

"use strict";
const { Class: newClass } = require("sdk/core/heritage");
const { emit } = require("sdk/event/core");
let { resolve, all } = require("sdk/core/promise");
let { Task: { async } } = require("resource://gre/modules/Task.jsm");
const qs = require("sdk/querystring");

var { Channel, User } = require('../channel/core');
var { PaginationHelper, promisedPaginationHelper } = require('../pagination-helper');
const { GenericProvider } = require("./generic-provider");

var type = "azubu",
    baseURL = 'https://api.azubu.tv/public/',
    pageSize = 100;

function getChannelFromJSON(jsonChannel) {
    console.info("Azubu:getChannelFromJSON");
    var ret        = new Channel(jsonChannel.user.username, type);
    if("display_name" in jsonChannel.user)
        ret.uname = jsonChannel.user.display_name;
    if(!("url_channel" in jsonChannel))
        jsonChannel.url_channel = "http://www.azubu.tv/"+ret.login;
    ret.url.push(jsonChannel.url_channel);
    ret.archiveUrl = jsonChannel.url_channel;
    ret.chatUrl    = jsonChannel.url_chat;
    ret.image      = {
        50: jsonChannel.user.profile.url_photo_small,
        260: jsonChannel.user.profile.url_photo_large
    };
    ret.live       = jsonChannel.is_live;
    ret.thumbnail  = jsonChannel.url_thumbnail;
    ret.viewers    = jsonChannel.view_count;
    if(ret.title !== null)
        ret.title = jsonChannel.title;
    ret.category   = jsonChannel.category.title;
    return ret;
}

const Azubu = newClass({
    extends: GenericProvider,
    authURL: ["http://www.azubu.tv"],
    _supportsFavorites: true,
    _supportsCredentials: true,
    _supportsFeatured: true,
    getUserFavorites: async(function*(username) {
        let [follows, userData] = yield all([
            promisedPaginationHelper({
                url: baseURL + "user/"+username+"/followings/list?limit="+pageSize+"&offset=",
                pageSize: pageSize,
                request: (url) => {
                    return this._qs.queueRequest(url);
                },
                fetchNextPage: function(data, pageSize) {
                    return data.json && "data" in data.json && data.json.data.length == data.json.limit;
                },
                getItems: function(data) {
                    if(data.json && "data" in data.json)
                        return data.json.data;
                    else
                        return [];
                }
            }),
            this._qs.queueRequest(baseURL + "user/"+username+"/profile")
        ]);
        if(userData.json && "data" in userData.json) {
            var user = new User(userData.json.data.user.username, this._type);
            if("display_name" in userData.json.data.user)
                user.uname = userData.json.data.user.display_name;
            user.image = {
                50: userData.json.data.url_photo_small,
                260: userData.json.data.url_photo_large
            };
            user.favorites = follows.map((follow) => follow.follow.username);

            let channels = yield this.updateChannels(follows.map((follow) => {
                return { login: follow.follow.username };
            }));

            return [ user, channels ];
        }
        else {
            throw "Couldn't fetch the details for the azubu user "+username;
        }
    }),
    getChannelDetails: function(channelname) {
        return this._qs.queueRequest(baseURL + "channel/" + channelname).then(function(data) {
            if(data.status == 200 && data.json && data.json.data.length) {
                 return getChannelFromJSON(data.json.data[0]);
            }
            else {
                throw "Error getting channel details for channel " + channelname;
            }
        });
    },
    updateFavsRequest: function(users) {
        var urls = users.map((user) => baseURL + "user/"+user.login+"/profile");
        this._qs.queueUpdateRequest(urls, this._qs.LOW_PRIORITY, (data, url) => {
            if(data.json && data.json.data) {
                var user = new User(data.json.data.user.username, this._type);
                if("display_name" in data.json.data.user)
                    user.uname = data.json.data.user.display_name;
                user.image = {
                    50: data.json.data.url_photo_small,
                    260: data.json.data.url_photo_large
                };

                var oldUser = users.find((u) => u.login === user.login);
                user.id = oldUser.id;

                new PaginationHelper({
                    url: baseURL + "user/"+user.login+"/followings/list?limit="+pageSize+"&offset=",
                    pageSize: pageSize,
                    request: (url) => {
                        return this._qs.queueRequest(url);
                    },
                    fetchNextPage: function(data, pageSize) {
                        return data.json && "data" in data.json && data.json.data.length == data.json.limit;
                    },
                    getItems: function(data) {
                        if(data.json && "data" in data.json)
                            return data.json.data;
                        else
                            return [];
                    },
                    onComplete: (follows) => {
                        user.favorites = follows.map((follow) => follow.follow.username);
                        emit(this, "updateduser", user);

                        // only add the channels the user wasn't following already.
                        this.updateChannels(follows
                            .filter((follow) => oldUser.favorites.every((fav) => fav !== follow.follow.username))
                            .map((follow) => ({ login: follow.follow.username }))
                        ).then((channels) => {
                            emit(this, "newchannels", channels);
                        });

                        oldUser.favorites = user.favorites;
                    }
                });
            }
        });
    },
    updateRequest: function(channels) {
        var channelnames = channels.map((ch) => ch.login).join(",");

        new PaginationHelper({
            url: baseURL + "channel/list?channels="+channelnames+"&limit="+pageSize+"&offset=",
            pageSize: pageSize,
            request: (url, callback, initial) => {
                if(initial) {
                    this._qs.queueUpdateRequest([url], this._qs.HIGH_PRIORITY, callback);
                }
                else {
                    return this._qs.queueRequest(url);
                }
            },
            fetchNextPage: function(data, pageSize) {
                return data.json && "data" in data.json && data.json.data.length === data.json.limit;
            },
            onComplete: (chans) => {
                emit(this, "updatedchannels", chans.map(getChannelFromJSON));
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
        console.info("Azubu.updateChannels");
        if(channels.length === 0) return resolve([]);

        var channelnames = channels.map((ch) => ch.login).join(",");

        return promisedPaginationHelper({
            url: baseURL + "channel/list?channels="+channelnames+"&limit="+pageSize+"&offset=",
            pageSize: pageSize,
            request: (url) => {
                return this._qs.queueRequest(url);
            },
            fetchNextPage: function(data, pageSize) {
                return data.json && "data" in data.json && data.json.data.length === data.json.limit;
            },
            getItems: function(data) {
                if(data.json && data.json.data) {
                    return data.json.data;
                }
                else {
                    return [];
                }
            }
        }).then((chans) => chans.map(getChannelFromJSON));
    },
    getFeaturedChannels() {
        return this._qs.queueRequest(baseURL + "channel/live/list?limit=60").then((data) => {
            if(data.json && "data" in data.json && data.json.data.length) {
                return data.json.data.map(getChannelFromJSON);
            }
            else {
                throw "No featured channels found for "+this.name;
            }
        });
    },
    search(query) {
        return this._qs.queueRequest(baseURL + 'modules/search/channel?' + qs.stringify({
            orderBy: '{"channel.updatedAt":"desc"}',
            access_token: '',
            _format: "json",
            q: query
        })).then((data) => {
            if(data.json && "data" in data.json && data.json.data.length) {
                return data.json.data.map(getChannelFromJSON);
            }
            else {
                throw "No results found for "+query+" on "+this.name;
            }
        });
    }
});

module.exports = new Azubu(type);

