    /*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */
 
"use strict";
const _     = require("sdk/l10n").get;
var prefs = require("sdk/simple-prefs");
const { Channel, User }    = require('../channeluser'),
    { PaginationHelper } = require('../pagination-helper');

var type          = "twitch",
    archiveURL    = "/profile/past_broadcasts",
    chatURL       = "/chat",
    clientId      = prefs.twitch_clientId,
    baseURL       = 'https://api.twitch.tv/kraken',
    headers       = {'Client-ID':clientId, 'Accept':'application/vnd.twitchtv.v2+json'},
    defaultAvatar = "http://static-cdn.jtvnw.net/jtv_user_pictures/xarth/404_user_300x300.png",
    itemsPerPage  = 100;

const qs = require("../queueservice").getServiceForProvider(type);

function requeue(response) {
    console.info("twitch:requeue");
    // check if we even got a response
    if(response!=null) {
        // check if we got any content
        if(response.status==200) {
            var json = response.json;
            // check if we encountered an API error
            var e = json.hasOwnProperty("error");
            if(!e) {
                console.log("request ok");
                return false;
            }
            // ignore not fatal API errors
            else {
                console.log("No fatal error: "+(json.message)+". Retrying");
                return true;
            }
        }
        // check the response error
        else if((response.status<400||response.status>=500)&&response.status!=0) {
            console.log("Status code OK, retrying: "+response.status);
            return true;
        }
        console.log("Request failed: "+response.status);
        return false;
    }
    // if it was empty, retry.
    console.log("Empty response. Retrying");
    return true;
}

function getChannelFromJSON(jsonChannel) {
    console.info("twitch:getChannelFromJSON");
    var ret        = new Channel();
    ret.login      = jsonChannel.name;
    ret.uname      = jsonChannel.display_name;
    ret.url.push(jsonChannel.url);
    ret.archiveUrl = jsonChannel.url + archiveURL;
    ret.chatUrl    = jsonChannel.url + chatURL;
    ret.image      = { "300": jsonChannel.logo?jsonChannel.logo:defaultAvatar};
    ret.type       = type;
    ret.title      = jsonChannel.status;
    ret.category   = jsonChannel.game;
    return ret;
}

const Twitch = {
    name: _("provider_"+type),
    toString: function() { return this.name; },
    authURL: ["http://www.twitch.tv", "https://secure.twitch.tv"],
    getUserFavorites: function(username, userCallback, channelsCallback) {
        new PaginationHelper({
            url: baseURL+'/users/'+username+'/follows/channels?limit='+itemsPerPage+'&offset=',
            pageSize: itemsPerPage,
            request: function(url, callback) {
                qs.queueRequest(url, headers, requeue, callback);
            },
            fetchNextPage: function(data) {
                return data.json && data.json.follows && data.json.follows.length == itemsPerPage;
            },
            getItems: function(data) {
                if(data.json && data.json.follows)
                    return data.json.follows;
                else
                    return [];
            },
            onComplete: function(jsonChannels) {
                var channels = jsonChannels.map(function(channel) {
                    return getChannelFromJSON(channel.channel);
                });
                channelsCallback(channels);
                qs.queueRequest(baseURL+'/users/'+username, headers, requeue, function(data) {
                    if(data.json && !data.json.error) {
                        var user = new User();
                        user.login = data.json.name;
                        user.uname = data.json.display_name;
                        user.image = { 300: data.json.logo?data.json.logo:defaultAvatar };
                        user.type  = type;
                        user.favorites = channels.map(function(channel) { return channel.login; });
                        userCallback(user);
                    }
                });
            }
        });
    },
    getChannelDetails: function(channelname, callback) {
        console.info("twitch.getChannelDetails");
        qs.queueRequest(baseURL+'/channels/'+channelname, headers, requeue, function(data) {
            console.info("twitch.getChannelDetails.requestCallback");
            if(data.json && !data.json.error)
                callback(getChannelFromJSON(data.json));
        });
    },
    updateFavsRequest: function(users, userCallback, channelCallback) {
        var urls = users.map(function(user) { return baseURL+'/users/'+user.login+'/follows/channels?limit='+itemsPerPage; }),
            ret  = [];
        qs.queueUpdateRequest(urls, headers, qs.LOW_PRIORITY, requeue, function updateCbk(data) {
            if(data.json && !data.json.error) {
                ret = ret.concat(data.json.follows.map(function(channel) {
                    return getChannelFromJSON(channel.channel);
                }));
                //TODO remove channels?
                if(data.json.follows.length == itemsPerPage) {
                    qs.queueRequest(data.json._links.next, headers, requeue, updateCbk);
                }
                else {
                    channelCallback(ret);
                    var username = data.json._links.self.match(/https:\/\/api\.twitch\.tv\/kraken\/users\/([^\/]+?)\//)[1];
                    var user = users.find(user => user.login == username);
                    user.favorites = ret.map(channel => channel.login);
                    userCallback(user);
                    ret.length = 0;
                }
            }
        });
    },
    removeFavsRequest: function() {
        qs.unqueueUpdateRequest(qs.LOW_PRIORITY);
    },
    updateRequest: function(channels, callback) {
        var channelsString = channels.reduce(function(prev, curr) { return prev+(prev.length?',':'')+curr.login; },""), ret = [];
        qs.queueUpdateRequest([baseURL+'/streams?channel='+channelsString+'&limit='+itemsPerPage+'&offset=0'], headers, qs.HIGH_PRIORITY, requeue, function updateCbk(data) {
            if(data.json && !data.json.error) {
                var cho;
                data.json.streams.forEach(function(obj) {
                    cho = getChannelFromJSON(obj.channel);
                    cho.viewers   = obj.viewers;
                    cho.thumbnail = obj.preview;
                    cho.live      = true;
                    cho.id        = channels.find(function(ch) {
                                        return cho.login == ch.login;
                                    }).id;
                    ret.push(cho);
                });

                if(data.json.streams.length == itemsPerPage) {
                    qs.queueRequest(data.json._links.next, headers, requeue, updateCbk);
                }
                else {
                    channels.forEach(function(channel) {
                        if(channel.live && !ret.find(function(cho) {
                            return cho.login == channel.login;
                        })) {
                            channel.live = false;
                            ret.push(channel);
                        }
                    });
                    callback(ret);
                    ret.length = 0;
                }
            }
        });
    },
    removeRequest: function() {
        qs.unqueueUpdateRequest(qs.HIGH_PRIORITY);
    },
    updateChannel: function(channelname, callback) {
        console.info("twitch.updateChannel");
        qs.queueRequest(baseURL+'/streams/'+channelname, headers, requeue, function(data) {
            console.info("twitch.updateChannel.requestCallback");
            if(data.json && data.json.stream) {
                exports.getChannelDetails(channelname, function(channel) {
                    channel.viewers   = data.json.stream.viewers;
                    channel.thumbnail = data.json.stream.preview;
                    channel.live      = true;
                    callback(channel);
                });
            }
            else {
                exports.getChannelDetails(channelname, function(channel) {
                    channel.live = false;
                    callback(channel);
                });
            }
        });
    },
    updateChannels: function(channels, callback) {
        console.info("twitch.updateChannels");
        var channelsString = channels.reduce(function(prev, curr) { return prev+(prev.length?',':'')+curr.login; },""), ret = [];
        new PaginationHelper({
            url: baseURL+'/streams?channel='+channelsString+'&limit='+itemsPerPage+'&offset=',
            pageSize: itemsPerPage,
            request: function(url, callback) {
                console.info("twitch.updateChannels.request");
                qs.queueRequest(url, headers, requeue, callback);
            },
            fetchNextPage: function(data) {
                console.info("twitch.updateChannels.fetchNextPage");
                return data.json && !data.json.error && data.json.streams.length == itemsPerPage;
            },
            getItems: function(data) {
                console.info("twitch.updateChannels.getItems");
                if(data.json && !data.json.error)
                    return data.json.streams;
                else
                    return [];
            },
            onComplete: function(liveChannels) {
                console.info("twitch.updateChannels.onComplete");
                var cho,
                    ret = liveChannels.map(function(obj) {
                        console.info("twitch.updateChannels.onComplete:liveChannels.forEach");
                        cho = getChannelFromJSON(obj.channel);
                        cho.viewers   = obj.viewers;
                        cho.thumbnail = obj.preview;
                        cho.live      = true;
                        cho.id        = channels.find(function(ch) {
                                            return cho.login == ch.login;
                                        }).id;
                        return cho;
                    });
                channels.forEach(function(channel) {
                    console.info("twitch.updateChannels.onComplete:channels.forEach");
                    if(channel.live && !ret.find(function(cho) {
                        return cho.login == channel.login;
                    })) {
                        channel.live = false;
                        ret.push(channel);
                    }
                });
                callback(ret);
            }
        });
    }
};

module.exports = Twitch;

