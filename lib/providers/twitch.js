/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */

"use strict";
const _     = require("sdk/l10n").get;
var { prefs } = require("sdk/simple-prefs");
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

function getOriginalNameFromHosted(name) {
    //TODO Breaks for usernames with spaces in them (wcs_europe and _america!)
    return name.split(" ")[0];
}

function getHostedChannels(channels, callback) {
    var channelIds = [];
    var failed = 0;
    channels.forEach(function(channel) {
        qs.queueRequest(baseURL+"/channels/"+channel.login, headers, requeue, function(resp) {
            if(resp.json && resp.json._id) {
                channelIds.push(resp.json._id);
            }
            else {
                failed++;
            }

            if(channelIds.length + failed == channels.length) {
                var hostIds = channelIds.join(",");
                var doneCount = 0;
                var done = () => {
                    doneCount++;
                    if(doneCount+1 == channelIds.length) {
                        callback(channels);
                    }
                };
                qs.queueRequest("http://tmi.twitch.tv/hosts?include_logins=1&host="+hostIds, {}, requeue, function(data) {
                    if(data.json && data.json.hosts.length) {
                        data.json.hosts.forEach(function(hosting) {
                            var chan = channels.find((ch) => ch.login === hosting.host_login);
                            if(hosting.target_login && !channels.some((ch) => ch.login === hosting.target_login)) {
                                Twitch.updateChannel(hosting.target_login, function(hostedChannel) {
                                    chan.uname = _("provider_twitch_hosted", getOriginalNameFromHosted(chan.uname), hostedChannel.uname);
                                    chan.live = hostedChannel.live;
                                    chan.title = hostedChannel.title;
                                    chan.thumbnail = hostedChannel.thumbnail;
                                    chan.viewers = hostedChannel.viewers;
                                    chan.category = hostedChannel.category;
                                    if(!chan.live) {
                                        chan.uname = getOriginalNameFromHosted(chan.uname);
                                    }
                                    done();
                                }, true);
                            }
                            else {
                                chan.uname = getOriginalNameFromHosted(chan.uname);
                                chan.live = false;
                                done();
                            }
                        });
                    }
                });

            }
        });
    });
}

function getHostedChannel(channel, callback) {
    getHostedChannels([channel], (chs) => callback(chs[0]));
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
                if(data.json.follows.length == itemsPerPage) {
                    qs.queueRequest(data.json._links.next, headers, requeue, updateCbk);
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
                    qs.queueRequest(data.json._links.next, headers, requeue, updateCbk);
                }
                else {
                    callback(ret);
                    if(ret.length != channels.length) {
                        var offlineChans = channels.filter((channel) => !ret.some((cho) => cho.login == channel.login));
                        getHostedChannels(offlineChans, callback);
                    }
                    ret.length = 0;
                }
            }
        });
    },
    removeRequest: function() {
        qs.unqueueUpdateRequest(qs.HIGH_PRIORITY);
    },
    updateChannel: function(channelname, callback, ignoreHosted) {
        qs.queueRequest(baseURL+'/streams/'+channelname, headers, requeue, (function(data) {
            console.info("twitch.updateChannel.requestCallback");
            if(data.json && data.json.stream) {
                this.getChannelDetails(channelname, function(channel) {
                    channel.viewers   = data.json.stream.viewers;
                    channel.thumbnail = data.json.stream.preview.medium;
                    channel.live      = true;
                    callback(channel);
                });
            }
            else {
                this.getChannelDetails(channelname, function(channel) {
                    if(!ignoreHosted) {
                        getHostedChannel(channel, callback);
                    }
                    else {
                        channel.live = false;
                        callback(channel);
                    }
                });
            }
        }).bind(this));
    },
    updateChannels: function(channels, callback) {
        var channelsString = channels.reduce(function(prev, curr) { return prev+(prev.length?',':'')+curr.login; },"");
        new PaginationHelper({
            url: baseURL+'/streams?channel='+channelsString+'&limit='+itemsPerPage+'&offset=',
            pageSize: itemsPerPage,
            request: function(url, callback) {
                qs.queueRequest(url, headers, requeue, callback);
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
                    getHostedChannels(offlineChans, callback);
                }
            }
        });
    }
};

module.exports = Twitch;

