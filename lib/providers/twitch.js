/**
 * Twitch Provider.
 * @author Martin Giger
 * @license MPL-2.0
 * @module providers/twitch
 * @todo investigate delayed title updates
 */

"use strict";
const { Class: newClass } = require("sdk/core/heritage");
const { emit } = require("sdk/event/core");
const _     = require("sdk/l10n").get;
var { prefs } = require("sdk/simple-prefs");
let { Task: { async } } = require("resource://gre/modules/Task.jsm");
const querystring = require("sdk/querystring");

const { Channel, User }    = require('../channel/core'),
    { promisedPaginationHelper, PaginationHelper } = require('../pagination-helper');
const { GenericProvider } = require("./generic-provider");

const type        = "twitch",
    archiveURL    = "/profile/past_broadcasts",
    chatURL       = "/chat",
    intentURL     = "twitch://open/?stream=#",
    clientId      = prefs.twitch_clientId,
    baseURL       = 'https://api.twitch.tv/kraken',
    headers       = {'Client-ID':clientId, 'Accept':'application/vnd.twitchtv.v3+json'},
    defaultAvatar = "https://static-cdn.jtvnw.net/jtv_user_pictures/xarth/404_user_300x300.png",
    itemsPerPage  = 100;

let idOfChannel = new Map();

const SIZES = [ '50', '70', '150', '300' ];
const urlForSize = (imgURL, size) => imgURL.replace("300x300", size+"x"+size);
const getImageObj = (imgURL) => {
    let ret = {};
    SIZES.forEach((s) => ret[s] = urlForSize(imgURL, s));
    return ret;
};

function getChannelFromJSON(jsonChannel) {
    var ret        = new Channel(jsonChannel.name, type);
    ret.uname      = jsonChannel.display_name;
    ret.url.push(jsonChannel.url);
    ret.archiveUrl = jsonChannel.url + archiveURL;
    ret.chatUrl    = jsonChannel.url + chatURL;
    ret.image      = getImageObj(jsonChannel.logo?jsonChannel.logo:defaultAvatar);
    ret.title      = jsonChannel.status;
    ret.category   = jsonChannel.game;
    ret.intent     = intentURL + jsonChannel.name;
    ret.mature = jsonChannel.mature;

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

function getStreamTypeParam() {
    if(prefs.twitch_showPlaylist)
        return "&stream_type=all";
    else
        return "&stream_type=live";
}

const Twitch = newClass({
    extends: GenericProvider,
    authURL: ["http://www.twitch.tv", "https://secure.twitch.tv", "https://passport.twitch.tv"],
    _supportsFavorites: true,
    _supportsCredentials: true,
    _supportsFeatured: true,
    getUserFavorites: async(function*(username) {
        let data = yield this._qs.queueRequest(baseURL+'/users/'+username, headers);

        if(data.json && !data.json.error) {
            let channels = yield promisedPaginationHelper({
                url: baseURL+'/users/'+username+'/follows/channels?limit='+itemsPerPage+'&offset=',
                pageSize: itemsPerPage,
                request: (url) => {
                    return this._qs.queueRequest(url, headers);
                },
                fetchNextPage: function(data) {
                    return data.json && "follows" in data.json && data.json.follows.length == itemsPerPage;
                },
                getItems: function(data) {
                    if(data.json && "follows" in data.json)
                        return data.json.follows.map((c) => getChannelFromJSON(c.channel));
                    else
                        return [];
                }
            });

            let user = new User(data.json.name, this._type);
            user.uname = data.json.display_name;
            user.image = { 300: data.json.logo?data.json.logo:defaultAvatar };
            user.favorites = channels.map((channel) => channel.login);

            return [ user, channels ];
        }
        else {
            throw "Couldn't fetch twitch user "+username;
        }
    }),
    getChannelDetails: function(channelname) {
        console.info("twitch.getChannelDetails");
        return this._qs.queueRequest(baseURL+'/channels/'+channelname, headers).then((data) => {
            if(data.json && !data.json.error) {
                return getChannelFromJSON(data.json);
            }
            else {
                throw data.json ? data.json.error : "Could not fetch details for "+this.name+" channel "+channelname;
            }
        });
    },
    updateFavsRequest: function(users) {
        var urls = users.map((user) => baseURL+'/users/'+user.login);

        this._qs.queueUpdateRequest(urls, this._qs.LOW_PRIORITY, (data) => {
            if(data.json && !data.json.error) {
                var user = users.find(user => user.login == data.json.name);
                user.uname = data.json.display_name;
                user.image = { 300: data.json.logo?data.json.logo:defaultAvatar };

                new PaginationHelper({
                    url: baseURL+'/users/'+user.login+'/follows/channels?limit='+itemsPerPage+'&offset=',
                    pageSize: itemsPerPage,
                    request: (url) => {
                        return this._qs.queueRequest(url, headers);
                    },
                    fetchNextPage(data) {
                        return data.json && "follows" in data.json && data.json.follows.length == itemsPerPage;
                    },
                    getItems(data) {
                        if(data.json && "follows" in data.json)
                            return data.json.follows.map((c) => getChannelFromJSON(c.channel));
                        else
                            return [];
                    },
                    onComplete: (follows) => {
                        emit(this, "newchannels", follows.filter((c) => user.favorites.every((name) => name !== c.login)));

                        user.favorites = follows.map((c) => c.login);
                        emit(this, "updateduser", user);
                    }
                });
            }
        }, headers);
    },
    updateRequest: function(channels) {
        var channelsString = channels.map((c) => c.login).join(",");
        new PaginationHelper({
            url: baseURL+"/streams?channel="+channelsString+"&stream_type=all&limit="+itemsPerPage+"&offset=",
            pageSize: itemsPerPage,
            request: (url, callback, initial) => {
                if(initial)
                    this._qs.queueUpdateRequest([url], this._qs.HIGH_PRIORITY, callback, headers);
                else
                    return this._qs.queueRequest(url, headers);
            },
            fetchNextPage: function(data, pageSize) {
                return data.json && "streams" in data.json && data.json.streams.length == pageSize;
            },
            getItems: function(data) {
                if(data.json && "streams" in data.json) {
                    var streams = data.json.streams;
                    if(!prefs.twitch_showPlaylist) {
                        streams = streams.filter((s) => !s.is_playlist);
                    }
                    return streams.map((obj) => {
                        let cho = getChannelFromJSON(obj.channel);
                        cho.viewers = obj.viewers;
                        cho.thumbnail = obj.preview.medium;
                        cho.live = true;
                        let oldChan = channels.find((ch) => cho.login == ch.login);
                        if(oldChan === undefined) {
                            for(let i of idOfChannel.entries()) {
                                if(i[1] == obj.channel._id) {
                                    oldChan = channels.find((ch) => ch.login == i[0]);
                                    if(oldChan !== undefined)
                                        break;
                                }
                            }
                        }
                        if(oldChan !== undefined) {
                            cho.id = oldChan.id;
                            oldChan.live = true;
                        }
                        return cho;
                    });
                }
                else {
                    return [];
                }
            },
            onComplete: (data) => {
                if(data.length)
                    emit(this, "updatedchannels", data);
                if(data.length != channels.length) {
                    var offlineChans = channels.filter((channel) => !data.some((cho) => cho.id == channel.id));
                    this._getHostedChannels(offlineChans, data).then((chans) => {
                        emit(this, "updatedchannels", chans);
                    });
                }
            }
        });
    },
    updateChannel: async(function*(channelname, ignoreHosted) {
        let [ data, channel ] = yield Promise.all([
            this._qs.queueRequest(baseURL+'/streams/'+channelname, headers),
            this.getChannelDetails(channelname)
        ]);

        if(data.json && data.json.stream !== null &&
           (prefs.twitch_showPlaylist || !data.json.stream.is_playlist)) {
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
        var logins = channels.map((c) => c.login);
        var channelsString = logins.join(",");
        let liveChannels = yield promisedPaginationHelper({
            url: baseURL+'/streams?channel='+channelsString+getStreamTypeParam()+'&limit='+itemsPerPage+'&offset=',
            pageSize: itemsPerPage,
            request: (url) => {
                return this._qs.queueRequest(url, headers);
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
            ret = yield Promise.all(liveChannels.map((obj) => {
                cho = getChannelFromJSON(obj.channel);
                cho.viewers   = obj.viewers;
                cho.thumbnail = obj.preview.medium;
                cho.live      = true;
                if(logins.includes(cho.login)) {
                    cho.id = channels[logins.indexOf(cho.login)].id;
                    return Promise.resolve(cho);
                }
                else {
                    return Promise.all(channels.map((c) => this._getChannelId(c))).then((ids) => {
                        ids.some((id, i) => {
                            if(id === obj.channel._id) {
                                cho.id = channels[i].id;
                                return true;
                            }
                            return false;
                        });
                        return cho;
                    });
                }
            }));

        if(ret.length != channels.length) {
            var offlineChans = channels.filter((channel) => ret.every((cho) => cho.id !== channel.id));
            let offChans = yield this._getHostedChannels(offlineChans, ret);
            ret = ret.concat(offChans);
        }

        return ret;
    }),
    getFeaturedChannels: function() {
        return this._qs.queueRequest(baseURL + "/streams/featured", headers).then((data) => {
            if(data.json && "featured" in data.json && data.json.featured.length) {
                var chans = data.json.featured;
                if(!this._mature)
                    chans = chans.filter((chan) => !chan.stream.channel.mature);

                return chans.map((chan) => {
                    var channel = getChannelFromJSON(chan.stream.channel);
                    channel.viewers = chan.stream.viewers;
                    channel.thumbnail = chan.stream.preview.medium;
                    channel.live = true;
                    return channel;
                });
            }
            else {
                throw "Could not get any featured channel for "+this.name;
            }
        });
    },
    search: function(query) {
        return this._qs.queueRequest(baseURL + "/search/streams?" + querystring.stringify({ q: query }), headers).then((data) => {
            if(data.json && "streams" in data.json && data.json.streams.length) {
                var chans = data.json.streams;
                if(!this._mature)
                    chans = chans.filter((chan) => !chan.channel.mature);

                return chans.map((chan) => {
                    var channel = getChannelFromJSON(chan.channel);
                    channel.viewers = chan.viewers;
                    channel.thumbnail = chan.preview.medium;
                    channel.live = true;
                    return channel;
                });
            }
            else {
                throw "No results for the search "+query+" on "+this.name;
            }
        });
    },
    _getChannelId: function(channel) {
        // get the internal id for each channel.
        if(idOfChannel.has(channel.login)) {
            return Promise.resolve(idOfChannel.get(channel.login));
        }
        else {
            return this._qs.queueRequest(baseURL+"/channels/"+channel.login, headers).then((resp) => {
                if(resp.json && "_id" in resp.json) {
                    idOfChannel.set(channel.login, resp.json._id);
                    if(channel.login != resp.json.name)
                        idOfChannel.set(resp.json.name, resp.json._id);
                    return resp.json._id;
                }
                else {
                    return null;
                }
            }, () => null);
        }
    },
    _getHostedChannels: async(function*(channels, liveChans) {
        if(prefs.twitch_showHosting) {
            let channelIds = yield Promise.all(channels.map((channel) => this._getChannelId(channel)));
            channelIds = channelIds.filter((id) => id !== null);

            let existingChans = Array.isArray(liveChans) ? channels.concat(liveChans) : channels;

            let data = yield this._qs.queueRequest("http://tmi.twitch.tv/hosts?"+querystring.stringify({
                include_logins: 1,
                host: channelIds.join(",")
            }));

            if(data.json && "hosts" in data.json && data.json.hosts.length) {
                // Check each hosted channel for his status
                return Promise.all(data.json.hosts.map(async(function*(hosting) {
                    var chan = channels.find((ch) => ch.login === hosting.host_login);
                    if(chan === undefined) {
                        chan = yield this.updateChannel(hosting.host_login, true);
                        chan.id = yield Promise.all(channels.map((c) => this._getChannelId(c))).then((ids) => {
                            let chid;
                            ids.some((id, i) => {
                                if(id === hosting.host_login) {
                                    chid = channels[i].id;
                                    return true;
                                }
                                return false;
                            });
                            return chid;
                        });
                    }

                    if(hosting.target_login &&
                       existingChans.every((ch) => ch.login !== hosting.target_login)) {

                        // Check the hosted channel's status, since he isn't a channel we already have in our lists.
                        return this.updateChannel(hosting.target_login, true).then((hostedChannel) => {
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
                        }, () => {
                            chan.uname = getOriginalNameFromHosted(chan.uname);
                            chan.live = false;
                            return chan;
                        });
                    }
                    else {
                        chan.uname = getOriginalNameFromHosted(chan.uname);
                        chan.live = false;
                        return Promise.resolve(chan);
                    }
                })));
            }
        }
        channels.forEach((chan) => {
            chan.uname = getOriginalNameFromHosted(chan.uname);
            chan.live = false;
        });
        return channels;
    }),
    _getHostedChannel: function(channel) {
        return this._getHostedChannels([channel]).then((chs) => chs[0]);
    }
});

module.exports = new Twitch(type);
