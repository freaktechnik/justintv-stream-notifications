/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */

"use strict";
const { Class: newClass } = require("sdk/core/heritage");
const { emit } = require("sdk/event/core");
const _     = require("sdk/l10n").get;
var { prefs } = require("sdk/simple-prefs");
const { all, resolve } = require("sdk/core/promise");
let { Task: { async } } = require("resource://gre/modules/Task.jsm");

const { Channel, User }    = require('../channeluser'),
    { promisedPaginationHelper, PaginationHelper } = require('../pagination-helper');
const { GenericProvider } = require("./generic-provider");

const type        = "twitch",
    archiveURL    = "/profile/past_broadcasts",
    chatURL       = "/chat",
    intentURL     = "twitch://open/?stream=#",
    clientId      = prefs.twitch_clientId,
    baseURL       = 'https://api.twitch.tv/kraken',
    headers       = {'Client-ID':clientId, 'Accept':'application/vnd.twitchtv.v3+json'},
    defaultAvatar = "http://static-cdn.jtvnw.net/jtv_user_pictures/xarth/404_user_300x300.png",
    itemsPerPage  = 100;

let idOfChannel = new Map();

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

const Twitch = newClass({
    extends: GenericProvider,
    authURL: ["http://www.twitch.tv", "https://secure.twitch.tv"],
    _supportsFavorites: true,
    _supportsCredentials: true,
    getUserFavorites: async(function*(username) {
        let data = yield this._qs.queueRequest(baseURL+'/users/'+username, headers, requeue);

        if(data.json && !data.json.error) {
            let jsonChannels = yield promisedPaginationHelper({
                url: baseURL+'/users/'+username+'/follows/channels?limit='+itemsPerPage+'&offset=',
                pageSize: itemsPerPage,
                request: (url) => {
                    return this._qs.queueRequest(url, headers, requeue);
                },
                fetchNextPage: function(data) {
                    return data.json && "follows" in data.json && data.json.follows.length == itemsPerPage;
                },
                getItems: function(data) {
                    if(data.json && "follows" in data.json)
                        return data.json.follows;
                    else
                        return [];
                }
            });

            let channels = jsonChannels.map(function(channel) {
                return getChannelFromJSON(channel.channel);
            });

            let user = new User();
            user.login = data.json.name;
            user.uname = data.json.display_name;
            user.image = { 300: data.json.logo?data.json.logo:defaultAvatar };
            user.type  = this._type;
            user.favorites = channels.map((channel) => channel.login);

            return [ user, channels ];
        }
        else {
            throw "Couldn't fetch twitch user "+username;
        }
    }),
    getChannelDetails: function(channelname) {
        console.info("twitch.getChannelDetails");
        return this._qs.queueRequest(baseURL+'/channels/'+channelname, headers, requeue).then(function(data) {
            console.info("twitch.getChannelDetails.requestCallback");
            if(data.json && !data.json.error) {
                return getChannelFromJSON(data.json);
            }
            else {
                throw data.json.error;
            }
        });
    },
    updateFavsRequest: function(users) {
        var urls = users.map(function(user) { return baseURL+'/users/'+user.login+'/follows/channels?limit='+itemsPerPage; }),
            ret  = {};
        let updateCbk = (data) => {
            if(data.json && !data.json.error) {
                var username = data.json._links.self.match(/https:\/\/api\.twitch\.tv\/kraken\/users\/([^\/]+?)\//)[1];
                if(!(username in ret)) {
                    ret[username] = [];
                }

                ret[username] = ret[username].concat(data.json.follows.map(function(channel) {
                    return getChannelFromJSON(channel.channel);
                }));
                if(data.json.follows.length == itemsPerPage) {
                    this._qs.queueRequest(data.json._links.next, headers, requeue).then(updateCbk);
                }
                else {
                    var user = users.find(user => user.login == username);
                    emit(this, "newchannels", ret[username].filter((chan) => user.favorites.every((name) => name !== chan.login)));
                    user.favorites = ret[username].map(channel => channel.login);
                    emit(this, "updateduser", user);
                    ret[username].length = 0;
                }
            }
        };
        this._qs.queueUpdateRequest(urls, this._qs.LOW_PRIORITY, updateCbk, headers, requeue);
    },
    updateRequest: function(channels) {
        var channelsString = channels.reduce(function(prev, curr) { return prev+(prev.length?',':'')+curr.login; },"");
        new PaginationHelper({
            url: baseURL+"/streams?channel="+channelsString+"&limit="+itemsPerPage+"&offset=",
            pageSize: itemsPerPage,
            request: (url, callback, initial) => {
                if(initial)
                    this._qs.queueUpdateRequest([url], this._qs.HIGH_PRIORITY, callback, headers, requeue);
                else
                    return this._qs.queueRequest(url, headers, requeue);
            },
            fetchNextPage: function(data, pageSize) {
                return data.json && "streams" in data.json && data.json.streams.length == pageSize;
            },
            getItems: function(data) {
                if(data.json && "streams" in data.json) {
                    return data.json.streams.map((obj) => {
                        let cho = getChannelFromJSON(obj.channel);
                        cho.viewers = obj.viewers;
                        cho.thumbnail = obj.preview.medium;
                        cho.live = true;
                        cho.id = channels.find((ch) => cho.login == ch.login).id;
                        return cho;
                    });
                }
                else {
                    return [];
                }
            },
            onComplete: (data) => {
                emit(this, "updatedchannels", data);
                if(data.length != channels.length) {
                    var offlineChans = channels.filter((channel) => !data.some((cho) => cho.login == channel.login));
                    this._getHostedChannels(offlineChans, data).then((chans) => {
                        emit(this, "updatedchannels", chans);
                    });
                }
            }
        });
    },
    updateChannel: async(function*(channelname, ignoreHosted) {
        let [ data, channel ] = yield all([
            this._qs.queueRequest(baseURL+'/streams/'+channelname, headers, requeue),
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
                return this._getHostedChannel(channel);
            }
            else {
                channel.live = false;
                return channel;
            }
        }
    }),
    updateChannels: async(function*(channels) {
        var channelsString = channels.reduce(function(prev, curr) { return prev+(prev.length?',':'')+curr.login; },"");
        let liveChannels = yield promisedPaginationHelper({
            url: baseURL+'/streams?channel='+channelsString+'&limit='+itemsPerPage+'&offset=',
            pageSize: itemsPerPage,
            request: (url) => {
                return this._qs.queueRequest(url, headers, requeue);
            },
            fetchNextPage: function(data) {
                return data.json && !data.json.error && data.json.streams.length == itemsPerPage;
            },
            getItems: function(data) {
                if(data.json && !data.json.error)
                    return data.json.streams;
                else
                    return [];
            }
        });

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

        if(ret.length != channels.length) {
            var offlineChans = channels.filter((channel) => !ret.some((cho) => cho.login == channel.login));
            let offChans = yield this._getHostedChannels(offlineChans, ret);
            ret = ret.concat(offChans);
        }

        return ret;
    }),
    _getChannelId: function(channel) {
        // get the internal id for each channel.
        if(idOfChannel.has(channel.login)) {
            return resolve(idOfChannel.get(channel.login));
        }
        else {
            return this._qs.queueRequest(baseURL+"/channels/"+channel.login, headers, requeue).then((resp) => {
                if(resp.json && "_id" in resp.json) {
                    idOfChannel.set(channel.login, resp.json._id);
                    return resp.json._id;
                }
                else {
                    return null;
                }
            });
        }
    },
    _getHostedChannels: async(function*(channels, liveChans) {
        if(!prefs.twitch_showHosting) {
            channels.forEach((chan) => {
                chan.uname = getOriginalNameFromHosted(chan.uname);
                chan.live = false;
            });
            return channels;
        }
        else {
            let channelIds = yield all(channels.map((channel) => this._getChannelId(channel)));
            channelIds = channelIds.filter((id) => id !== null);

            let hostIds = channelIds.join(",");
            let existingChans = Array.isArray(liveChans) ? channels.concat(liveChans) : channels;

            let data = yield this._qs.queueRequest("http://tmi.twitch.tv/hosts?include_logins=1&host="+hostIds, {}, requeue);

            if(data.json && data.json.hosts.length) {
                // Check each hosted channel for his status
                return all(data.json.hosts.map((hosting) => {
                    var chan = channels.find((ch) => ch.login === hosting.host_login);

                    if(hosting.target_login &&
                       existingChans.every((ch) => ch.login !== hosting.target_login)) {

                        // Check the hosted channel's status, since he isn't a channel we already have in our lists.
                        return this.updateChannel(hosting.target_login, true).then(function(hostedChannel) {
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
        }
    }),
    _getHostedChannel: function(channel) {
        return this._getHostedChannels([channel]).then((chs) => chs[0]);
    }
});

module.exports = new Twitch(type);
