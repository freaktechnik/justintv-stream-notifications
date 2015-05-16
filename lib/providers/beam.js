/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */

"use strict";
var _     = require("sdk/l10n").get;
var { Channel, User }    = require('../channeluser');

var type          = "beam",
    chatURL       = "https://beam.pro/embed/chat/",
    baseURL       = 'https://beam.pro/api/v1/',
    headers       = {};

var qs = require("../queueservice").getServiceForProvider(type),
    { PaginationHelper } = require('../pagination-helper');

function requeue(response) {
    return response.status > 499;
}

function getChannelFromJSON(jsonChannel) {
    var ret        = new Channel();
    ret.uname      = jsonChannel.token;
    ret.login      = jsonChannel.token;
    ret.type       = type;
    ret.live       = jsonChannel.online;
    ret.title      = jsonChannel.name;
    ret.viewers    = jsonChannel.viewers_current;
    ret.thumbnail  = jsonChannel.thumbnail.url;
    ret.url.push("https://beam.pro/"+jsonChannel.token);
    ret.archiveUrl = "https://beam.pro/"+jsonChannel.token;
    ret.chatUrl    = chatURL+jsonChannel.token;
    ret.category   = jsonChannel.type;
    return ret;
}

function getImageFromAvatars(avatars) {
    var image = {};
    avatars.forEach(function(avatar) {
        image[avatar.meta.size.split("x")[0]] = avatar.url;
    });
    return image;
}

function getUserIdFromUsername(username, callback) {
    qs.queueRequest(baseURL+"users/search?query="+username, headers, requeue, function(response) {
        if(response.status == 200 && response.json) {
            callback(response.json.find(function(val) {
                return val.username == username;
            }).id);
        }
    });
}

const Beam = {
    name: _("provider_"+type),
    toString: function() { return this.name; },
    authURL: ["http://example.com"],
    supports: { favorites: false, credentials: false },
    getUserFavorites: function(username, userCallback, channelsCallback) {
        getUserIdFromUsername(username, function(userid) {
            qs.queueRequest(baseURL+"users/"+userid, headers, requeue, function(user) {
                if(user.json) {
                    var ch = new User();
                    ch.uname = user.json.username;
                    ch.login = user.json.username; //Set this to the ID, so we have that when updating?
                    ch.image = getImageFromAvatars(user.json.avatars);
                    ch.type  = type;
                    new PaginationHelper({
                        url: baseURL+"users/"+userid+"/follows?limit=50&page=",
                        pageSize: 50,
                        initialPage: 0,
                        request: function(url, callback) {
                            qs.queueRequest(url, headers, requeue, callback);
                        },
                        getPageNumber: function(page) {
                            return ++page;
                        },
                        fetchNextPage: function(data, pageSize) {
                            return data.json && data.json.length == pageSize;
                        },
                        getItems: function(data) {
                            return data.json || [];
                        },
                        onComplete: function(subscriptions) {
                            ch.favoites = subscriptions.map(function(sub) {
                                Beam.getChannelDetails(sub.token, channelsCallback);
                                return sub.token;
                            });
                            userCallback(ch);
                        }
                    });
                }
            });
        });
    },
    getChannelDetails: function(channelname, callback) {
        qs.queueRequest(baseURL+"channels/"+channelname, headers, requeue, function(response) {
            if(response.json) {
                var channel = getChannelFromJSON(response.json);
                qs.queueRequest(baseURL+"users/"+response.json.user.id, headers, requeue, function(resp) {
                    if(resp.json)
                        channel.image = getImageFromAvatars(resp.json.avatars);
                    callback(channel);
                });
            }
        });
    },
    updateFavsRequest: function(users, userCallback, channelCallback) {
        //TODO
    },
    removeFavsRequest: function() {
        qs.unqueueUpdateRequest(qs.LOW_PRIORITY);
    },
    updateRequest: function(channels, callback) {
        var urls = channels.map(function(channel) { return baseURL+"channels/"+channel.login; });
        qs.queueUpdateRequest(urls, headers, qs.HIGH_PRIORITY, requeue, function(data) {
            if(data.json) {
                var channel = getChannelFromJSON(data.json);
                qs.queueRequest(baseURL+"users/"+data.json.user.id, headers, requeue, function(resp) {
                    if(resp.json)
                        channel.image = getImageFromAvatars(resp.json.avatars);
                    callback(channel);
                });
            }
        });
    },
    removeRequest: function() {
        qs.unqueueUpdateRequest(qs.HIGH_PRIORITY);
    },
    updateChannel: function(channelname, callback) {
        Beam.getchannelDetails(channelname, callback);
    },
    updateChannels: function(channels, callback) {
        channels.forEach(function(channel) {
            Beam.updateChannel(channel.login, callback);
        }, this);
    }
};

module.exports = Beam;

