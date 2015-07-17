/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */

"use strict";
const _     = require("sdk/l10n").get;
var { prefs } = require("sdk/simple-prefs");
const { all, resolve } = require("sdk/core/promise");
let { Task: { spawn, async } } = require("resource://gre/modules/Task.jsm");

const { Channel, User }    = require('../channeluser'),
    { PaginationHelper } = require('../pagination-helper');

var type          = "twitch",
    archiveURL    = "/profile/past_broadcasts",
    chatURL       = "/chat",
    intentURL     = "twitch://open/?stream=#",
    clientId      = prefs.twitch_clientId,
    baseURL       = 'https://api.twitch.tv/kraken',
    headers       = {'Client-ID':clientId, 'Accept':'application/vnd.twitchtv.v3+json'},
    defaultAvatar = "http://static-cdn.jtvnw.net/jtv_user_pictures/xarth/404_user_300x300.png",
    itemsPerPage  = 100;

const qs = require("../queueservice").getServiceForProvider(type);

function requeue(response) {
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
        else if((response.status < 400 || response.status >= 500) && response.status !== 0) {
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
    ret.intent     = intentURL + jsonChannel.name;
    return ret;
}

//TODO: going offline doesn't remove the hosting part.
function getOriginalNameFromHosted(name) {
    var hostingRegExp = "^" + _("provider_twitch_hosted", "(.+?)", ".+") + "$";
    var matches = name.match(new RegExp(hostingRegExp));
    if(Array.isArray(matches) && matches.length > 1) {
        return matches[1];
    }
    else {
        return name;
    }
}

function getHostedChannel(channel) {
    return getHostedChannels([channel]).then((chs) => chs[0]);
}

const Twitch = {
    name: _("provider_"+type),
    toString: function() { return this.name; },
    authURL: ["http://www.twitch.tv", "https://secure.twitch.tv"],
    supports: { favorites: true, credentials: true },
    getUserFavorites: function(username, userCallback, channelsCallback) {
        new PaginationHelper({
            url: baseURL+'/users/'+username+'/follows/channels?limit='+itemsPerPage+'&offset=',
            pageSize: itemsPerPage,
            request: function(url, callback) {
                qs.queueRequest(url, headers, requeue).then(callback);
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
                qs.queueRequest(baseURL+'/users/'+username, headers, requeue).then(function(data) {
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
    getChannelDetails: function(channelname) {
        console.info("twitch.getChannelDetails");
        return qs.queueRequest(baseURL+'/channels/'+channelname, headers, requeue).then(function(data) {
            console.info("twitch.getChannelDetails.requestCallback");
            if(data.json && !data.json.error) {
                return getChannelFromJSON(data.json);
            }
            else {
                throw data.json.error;
            }
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
                if(data.json.follows.length == itemsPerPage) {
                    qs.queueRequest(data.json._links.next, headers, requeue).then(updateCbk);
                }
                else {
                    var username = data.json._links.self.match(/https:\/\/api\.twitch\.tv\/kraken\/users\/([^\/]+?)\//)[1];
                    var user = users.find(user => user.login == username);
                    channelCallback(ret.filter((chan) => !user.favorites.some((name) => name === chan.login)));
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
                    cho.thumbnail = obj.preview.medium;
                    cho.live      = true;
                    cho.id        = channels.find(function(ch) {
                                        return cho.login == ch.login;
                                    }).id;
                    ret.push(cho);
                });

                if(data.json.streams.length == itemsPerPage) {
                    qs.queueRequest(data.json._links.next, headers, requeue).then(updateCbk);
                }
                else {
                    callback(ret);
                    if(ret.length != channels.length) {
                        var offlineChans = channels.filter((channel) => !ret.some((cho) => cho.login == channel.login));
                        getHostedChannels(offlineChans, Array.slice(ret)).then(callback);
                    }
                    ret.length = 0;
                }
            }
        });
    },
    removeRequest: function() {
        qs.unqueueUpdateRequest(qs.HIGH_PRIORITY);
    },
    updateChannel: async(function*(channelname, ignoreHosted) {
        let [ data, channel ] = yield all([
            qs.queueRequest(baseURL+'/streams/'+channelname, headers, requeue),
            this.getChannelDetails(channelname)
        ]);

        if(data.json && data.json.stream) {
            channel.viewers   = data.json.stream.viewers;
            channel.thumbnail = data.json.stream.preview.medium;
            channel.live      = true;

            return channel;
        }
        else {
            if(!ignoreHosted) {
                return getHostedChannel(channel);
            }
            else {
                channel.live = false;
                return channel;
            }
        }
    }),
    updateChannels: function(channels, callback) {
        var channelsString = channels.reduce(function(prev, curr) { return prev+(prev.length?',':'')+curr.login; },"");
        new PaginationHelper({
            url: baseURL+'/streams?channel='+channelsString+'&limit='+itemsPerPage+'&offset=',
            pageSize: itemsPerPage,
            request: function(url, callback) {
                qs.queueRequest(url, headers, requeue).then(callback);
            },
            fetchNextPage: function(data) {
                return data.json && !data.json.error && data.json.streams.length == itemsPerPage;
            },
            getItems: function(data) {
                if(data.json && !data.json.error)
                    return data.json.streams;
                else
                    return [];
            },
            onComplete: function(liveChannels) {
                var cho,
                    ret = liveChannels.map(function(obj) {
                        cho = getChannelFromJSON(obj.channel);
                        cho.viewers   = obj.viewers;
                        cho.thumbnail = obj.preview.medium;
                        cho.live      = true;
                        cho.id        = channels.find(function(ch) {
                                            return cho.login == ch.login;
                                        }).id;
                        return cho;
                    });
                callback(ret);
                if(ret.length != channels.length) {
                    var offlineChans = channels.filter((channel) => !ret.some((cho) => cho.login == channel.login));
                    getHostedChannels(offlineChans, ret).then(callback);
                }
            }
        });
    }
};

module.exports = Twitch;

var idOfChannel = new Map();
function getHostedChannels(channels, liveChans) {
    if(!prefs.twitch_showHosting) {
        channels.forEach((chan) => {
            chan.uname = getOriginalNameFromHosted(chan.uname);
            chan.live = false;
        });
        return resolve(channels);
    }
    else {
        return spawn(function*() {
            let channelIds = yield all(channels.map(function(channel) {
                // get the internal id for each channel.

                if(idOfChannel.has(channel.login)) {
                    return resolve(idOfChannel.get(channel.login));
                }
                else {
                    return qs.queueRequest(baseURL+"/channels/"+channel.login, headers, requeue).then(function(resp) {
                        if(resp.json && "_id" in resp.json) {
                            idOfChannel.set(channel.login, resp.json._id);
                            return resp.json._id;
                        }
                        else {
                            return null;
                        }
                    });
                }
            })).then((ids) => ids.filter((id) => id !== null));

            let hostIds = channelIds.join(",");
            let existingChans = Array.isArray(liveChans) ? channels.concat(liveChans) : channels;

            let data = yield qs.queueRequest("http://tmi.twitch.tv/hosts?include_logins=1&host="+hostIds, {}, requeue);

            if(data.json && data.json.hosts.length) {
                // Check each hosted channel for his status
                return all(data.json.hosts.map(function(hosting) {
                    var chan = channels.find((ch) => ch.login === hosting.host_login);

                    if(hosting.target_login &&
                        existingChans.every((ch) => ch.login !== hosting.target_login)) {

                        // Check the hosted channel's status, since he isn't a channel we already have in our lists.
                        return Twitch.updateChannel(hosting.target_login, true).then(function(hostedChannel) {
                            chan.live = hostedChannel.live;
                            chan.title = hostedChannel.title;
                            chan.thumbnail = hostedChannel.thumbnail;
                            chan.viewers = hostedChannel.viewers;
                            chan.category = hostedChannel.category;
                            if(!chan.live) {
                                chan.uname = getOriginalNameFromHosted(chan.uname);
                            }
                            else {
                                chan.uname = _("provider_twitch_hosted", getOriginalNameFromHosted(chan.uname), hostedChannel.uname);
                            }

                            return chan;
                        });
                    }
                    else {
                        chan.uname = getOriginalNameFromHosted(chan.uname);
                        chan.live = false;
                        return resolve(chan);
                    }
                }));
            }
        });
    }
}

