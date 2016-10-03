/**
 * Twitch Provider.
 * @author Martin Giger
 * @license MPL-2.0
 * @module providers/twitch
 * @todo investigate delayed title updates
 */
//TODO properly wait for clientID
import { emit, filterAsync } from "../../utils";
import prefs from "../preferences";
import querystring from "../querystring";
import LiveState from "../channel/live-state";
import { Channel, User } from '../channel/core';
import { promisedPaginationHelper, PaginationHelper } from '../pagination-helper';
import GenericProvider from "./generic-provider";
import { not } from '../logic';

const type = "twitch",
    archiveURL = "/videos/all",
    chatURL = "/chat",
    baseURL = 'https://api.twitch.tv/kraken',
    headers = { 'Client-ID': '', 'Accept': 'application/vnd.twitchtv.v3+json' },
    defaultAvatar = "https://static-cdn.jtvnw.net/jtv_user_pictures/xarth/404_user_300x300.png",
    itemsPerPage = 100,
    idOfChannel = new Map(),
    SIZES = [ '50', '70', '150', '300' ],
    urlForSize = (imgURL, size) => imgURL.replace("300x300", size + "x" + size),
    getImageObj = (imgURL = defaultAvatar) => {
        const ret = {};
        SIZES.forEach((s) => {
            ret[s] = urlForSize(imgURL, s);
        });
        return ret;
    };
prefs.get('twitch_clientId').then((id) => {
    headers['Client-ID'] = id;
});

function getChannelFromJSON(jsonChannel) {
    const ret = new Channel(jsonChannel.name, type);
    ret.uname = jsonChannel.display_name;
    ret.url.push(jsonChannel.url);
    ret.archiveUrl = jsonChannel.url + archiveURL;
    ret.chatUrl = jsonChannel.url + chatURL;
    ret.image = getImageObj(jsonChannel.logo ? jsonChannel.logo : defaultAvatar);
    ret.title = jsonChannel.status;
    ret.category = jsonChannel.game;
    ret.mature = jsonChannel.mature;

    return ret;
}

function getStreamTypeParam(delim = "&") {
    return prefs.get('twitch_showPlaylist').then((showPlaylist) => {
        if(showPlaylist) {
            return delim + "stream_type=all";
        }
        else {
            return delim + "&stream_type=live";
        }
    });
}

class Twitch extends GenericProvider {
    authURL = [
        "http://www.twitch.tv",
        "https://secure.twitch.tv",
        "https://passport.twitch.tv"
    ];
    _supportsFavorites = true;
    _supportsCredentials = true;
    _supportsFeatured = true;

    async getUserFavorites(username) {
        const data = await this._qs.queueRequest(baseURL + '/users/' + username, headers);

        if(data.json && !data.json.error) {
            const channels = await promisedPaginationHelper({
                    url: baseURL + '/users/' + username + '/follows/channels?limit=' + itemsPerPage + '&offset=',
                    pageSize: itemsPerPage,
                    request: (url) => {
                        return this._qs.queueRequest(url, headers);
                    },
                    fetchNextPage(data) {
                        return data.parseJSON && "follows" in data.parseJSON && data.parseJSON.follows.length == itemsPerPage;
                    },
                    getItems(data) {
                        if(data.parseJSON && "follows" in data.parseJSON) {
                            return data.parseJSON.follows.map((c) => getChannelFromJSON(c.channel));
                        }
                        else {
                            return [];
                        }
                    }
                }),
                user = new User(data.parseJSON.name, this._type);
            user.uname = data.parseJSON.display_name;
            user.image = getImageObj(data.parseJSON.logo ? data.parseJSON.logo : defaultAvatar);
            user.favorites = channels.map((channel) => channel.login);

            return [ user, channels ];
        }
        else {
            throw "Couldn't fetch twitch user " + username;
        }
    }
    getChannelDetails(channelname) {
        console.info("twitch.getChannelDetails");
        return this._qs.queueRequest(baseURL + '/channels/' + channelname, headers).then((data) => {
            if(data.parseJSON && !data.parseJSON.error) {
                idOfChannel.set(data.parseJSON.name, data.parseJSON._id);
                return getChannelFromJSON(data.parseJSON);
            }
            else {
                throw data.parseJSON ? data.parseJSON.error : "Could not fetch details for " + this.name + " channel " + channelname;
            }
        });
    }
    updateFavsRequest(users) {
        const urls = users.map((user) => baseURL + '/users/' + user.login);

        this._qs.queueUpdateRequest(urls, this._qs.LOW_PRIORITY, (data) => {
            if(data.parseJSON && !data.parseJSON.error) {
                const user = users.find((user) => user.login == data.parseJSON.name);
                user.uname = data.parseJSON.display_name;
                user.image = getImageObj(data.parseJSON.logo ? data.parseJSON.logo : defaultAvatar);

                new PaginationHelper({
                    url: baseURL + '/users/' + user.login + '/follows/channels?limit=' + itemsPerPage + '&offset=',
                    pageSize: itemsPerPage,
                    request: (url) => {
                        return this._qs.queueRequest(url, headers);
                    },
                    fetchNextPage(data) {
                        return data.parseJSON && "follows" in data.parseJSON && data.parseJSON.follows.length == itemsPerPage;
                    },
                    getItems(data) {
                        if(data.parseJSON && "follows" in data.parseJSON) {
                            return data.parseJSON.follows.map((c) => getChannelFromJSON(c.channel));
                        }
                        else {
                            return [];
                        }
                    },
                    onComplete: (follows) => {
                        emit(this, "newchannels", follows.filter((c) => user.favorites.every((name) => name !== c.login)));

                        user.favorites = follows.map((c) => c.login);
                        emit(this, "updateduser", user);
                    }
                });
            }
        }, headers);
    }
    updateRequest(channels) {
        const channelsString = channels.map((c) => c.login).join(",");
        new PaginationHelper({
            url: baseURL + "/streams?channel=" + channelsString + "&stream_type=all&limit=" + itemsPerPage + "&offset=",
            pageSize: itemsPerPage,
            request: (url, callback, initial) => {
                if(initial) {
                    this._qs.queueUpdateRequest([ url ], this._qs.HIGH_PRIORITY, callback, headers);
                }
                else {
                    return this._qs.queueRequest(url, headers);
                }
            },
            fetchNextPage(data, pageSize) {
                return data.parseJSON && "streams" in data.parseJSON && data.parseJSON.streams.length == pageSize;
            },
            getItems: (data) => {
                if(data.parseJSON && "streams" in data.parseJSON) {
                    let streams = data.parseJSON.streams;
                    if(!prefs.twitch_showPlaylist) {
                        streams = streams.filter((s) => !s.is_playlist);
                    }
                    return streams.map((obj) => {
                        const cho = getChannelFromJSON(obj.channel);
                        cho.viewers = obj.viewers;
                        cho.thumbnail = obj.preview.medium;
                        if(obj.is_playlist) {
                            cho.live = new LiveState(LiveState.REBROADCAST);
                        }
                        else {
                            cho.live.setLive(true);
                        }

                        let oldChan = channels.find((ch) => cho.login == ch.login);
                        if(oldChan === undefined) {
                            const findChan = (chan, ch) => ch.login == chan;
                            for(let i of idOfChannel.entries()) {
                                if(i[1] == obj.channel._id) {
                                    oldChan = channels.find(findChan.bind(null, i[0]));
                                    if(oldChan !== undefined) {
                                        break;
                                    }
                                }
                            }
                        }
                        if(oldChan !== undefined) {
                            cho.id = oldChan.id;
                            oldChan.live = cho.live;
                        }
                        return cho;
                    });
                }
                else {
                    return [];
                }
            },
            onComplete: async (data) => {
                const liveChans = await filterAsync(data, (cho) => cho.live.isLive(LiveState.TOWARD_OFFLINE));
                if(liveChans.length) {
                    emit(this, "updatedchannels", liveChans);
                }
                if(liveChans.length != channels.length) {
                    let offlineChans = channels.filter((channel) => !data.some((cho) => cho.id == channel.id));
                    const playlistChans = await filterAsync(data, (cho) => not(cho.live.isLive(LiveState.TOWARD_OFFLINE)));
                    offlineChans = offlineChans.concat(playlistChans);
                    let chans = await this._getHostedChannels(offlineChans, liveChans);
                    chans = await Promise.all(chans.map((chan) => {
                        if(chan.live.state == LiveState.REBROADCAST) {
                            return this._getActivePlaylistInfo(chan).then((meta) => {
                                chan.title = meta.title;
                                chan.category = meta.game;
                                chan.thumbnail = meta.thumbnail;
                                return chan;
                            }, () => chan);
                        }
                        else {
                            return chan;
                        }
                    }));
                    emit(this, "updatedchannels", chans);
                }
            }
        });
    }
    async updateChannel(channelname, ignoreHosted = false) {
        console.log("twitch.updateChannel:", channelname, ignoreHosted);
        const [ data, channel ] = await Promise.all([
            getStreamTypeParam("?").then((p) => this._qs.queueRequest(baseURL + '/streams/' + channelname + p, headers)),
            this.getChannelDetails(channelname)
        ]);

        if(data.parseJSON && data.parseJSON.stream !== null &&
           (!ignoreHosted || !data.parseJSON.stream.is_playlist)) {
            channel.viewers = data.parseJSON.stream.viewers;
            channel.thumbnail = data.parseJSON.stream.preview.medium;
            if(data.parseJSON.stream.is_playlist) {
                channel.live = new LiveState(LiveState.REBROADCAST);
                try {
                    const meta = await this._getActivePlaylistInfo(channel);
                    channel.title = meta.title;
                    channel.category = meta.game;
                    channel.thumbnail = meta.thumbnail;
                }
                catch(e) {
                    // empty
                }
            }
            else {
                channel.live.setLive(true);
            }
        }

        if(await channel.live.isLive(LiveState.TOWARD_OFFLINE)) {
            return channel;
        }
        else {
            if(!ignoreHosted) {
                return this._getHostedChannel(channel);
            }
            else {
                return channel;
            }
        }
    }
    async updateChannels(channels) {
        const logins = channels.map((c) => c.login),
            channelsString = logins.join(","),
            streamTypeParam = await getStreamTypeParam(),
            liveChannels = await promisedPaginationHelper({
                url: baseURL + '/streams?channel=' + channelsString + streamTypeParam + '&limit=' + itemsPerPage + '&offset=',
                pageSize: itemsPerPage,
                request: (url) => {
                    return this._qs.queueRequest(url, headers);
                },
                fetchNextPage(data) {
                    return data.parseJSON && !data.parseJSON.error && data.parseJSON.streams.length == itemsPerPage;
                },
                getItems(data) {
                    if(data.parseJSON && !data.parseJSON.error) {
                        return data.parseJSON.streams;
                    }
                    else {
                        return [];
                    }
                }
            });

        let cho,
            ret = await Promise.all(liveChannels.map((obj) => {
                cho = getChannelFromJSON(obj.channel);
                cho.viewers = obj.viewers;
                cho.thumbnail = obj.preview.medium;
                if(obj.is_playlist) {
                    cho.live = new LiveState(LiveState.REBROADCAST);
                }
                else {
                    cho.live.setLive(true);
                }

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

        const liveChans = await filterAsync(ret, (cho) => cho.live.isLive(LiveState.TOWARD_OFFLINE));

        if(liveChans.length != channels.length) {
            const playlistChans = await Promise.all(ret.map(async (cho) => {
                if(await cho.live.isLive(LiveState.TOWARD_OFFLINE)) {
                    try {
                        const meta = await this._getActivePlaylistInfo(cho);
                        cho.title = meta.title;
                        cho.category = meta.game;
                        cho.thumbnail = meta.thumbnail;
                    }
                    catch(e) { /* emtpy */ }
                    return cho;
                }
            }));
            let offlineChans = channels.filter((channel) => ret.every((cho) => cho.id !== channel.id));
            offlineChans = offlineChans.concat(playlistChans);
            const offChans = await this._getHostedChannels(offlineChans, liveChans);
            ret = liveChans.concat(offChans);
        }

        return ret;
    }
    async getFeaturedChannels() {
        const data = await this._qs.queueRequest(baseURL + "/streams/featured", headers);
        if(data.parseJSON && "featured" in data.parseJSON && data.parseJSON.featured.length) {
            let chans = data.parseJSON.featured;
            if(await not(this._mature)) {
                chans = chans.filter((chan) => !chan.stream.channel.mature);
            }

            return chans.map((chan) => {
                const channel = getChannelFromJSON(chan.stream.channel);
                channel.viewers = chan.stream.viewers;
                channel.thumbnail = chan.stream.preview.medium;
                channel.live.setLive(true);
                return channel;
            });
        }
        else {
            throw "Could not get any featured channel for " + this.name;
        }
    }
    async search(query) {
        const data = await this._qs.queueRequest(baseURL + "/search/streams?" + querystring.stringify({ q: query }), headers);
        if(data.parseJSON && "streams" in data.parseJSON && data.parseJSON.streams.length) {
            let chans = data.parseJSON.streams;
            if(await not(this._mature)) {
                chans = chans.filter((chan) => !chan.channel.mature);
            }

            return chans.map((chan) => {
                const channel = getChannelFromJSON(chan.channel);
                channel.viewers = chan.viewers;
                channel.thumbnail = chan.preview.medium;
                channel.live.setLive(true);
                return channel;
            });
        }
        else {
            throw "No results for the search " + query + " on " + this.name;
        }
    }
    _getChannelId(channel) {
        // get the internal id for each channel.
        if(idOfChannel.has(channel.login)) {
            return Promise.resolve(idOfChannel.get(channel.login));
        }
        else {
            return this._qs.queueRequest(baseURL + "/channels/" + channel.login, headers).then((resp) => {
                if(resp.parseJSON && "_id" in resp.parseJSON) {
                    idOfChannel.set(channel.login, resp.parseJSON._id);
                    if(channel.login != resp.parseJSON.name) {
                        idOfChannel.set(resp.parseJSON.name, resp.parseJSON._id);
                    }
                    return resp.parseJSON._id;
                }
                else {
                    return null;
                }
            }, () => null);
        }
    }
    async _getHostedChannels(channels, liveChans) {
        if(prefs.twitch_showHosting) {
            let channelIds = await Promise.all(channels.map((channel) => this._getChannelId(channel)));
            channelIds = channelIds.filter((id) => id !== null);

            const existingChans = Array.isArray(liveChans) ? channels.concat(liveChans) : channels,
                data = await this._qs.queueRequest("https://tmi.twitch.tv/hosts?" + querystring.stringify({
                    "include_logins": 1,
                    host: channelIds.join(",")
                }));

            if(data.parseJSON && "hosts" in data.parseJSON && data.parseJSON.hosts.length) {
                // Check each hosted channel for his status
                return Promise.all(data.parseJSON.hosts.map(async (hosting) => {
                    let chan = channels.find((ch) => ch.login === hosting.host_login);
                    if(chan === undefined) {
                        chan = await this.updateChannel(hosting.host_login, true);
                        chan.id = await Promise.all(channels.map((c) => this._getChannelId(c))).then((ids) => {
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
                        try {
                            const hostedChannel = await this.updateChannel(hosting.target_login, true);
                            if(await hostedChannel.live.isLive(LiveState.TOWARD_OFFLINE)) {
                                chan.title = hostedChannel.title;
                                chan.thumbnail = hostedChannel.thumbnail;
                                chan.viewers = hostedChannel.viewers;
                                chan.category = hostedChannel.category;
                                chan.live = new LiveState(LiveState.REDIRECT);
                                chan.live.alternateUsername = hostedChannel.uname;
                                chan.live.alternateURL = hostedChannel.url[0];
                            }
                            else {
                                chan.live.setLive(false);
                            }

                            return chan;
                        }
                        catch(e) {
                            if(chan.live.state != LiveState.REBROADCAST) {
                                chan.live.setLive(false);
                            }
                            return chan;
                        }
                    }
                    else {
                        if(chan.live.state != LiveState.REBROADCAST) {
                            chan.live.setLive(false);
                        }

                        return chan;
                    }
                }));
            }
        }
        channels.forEach((chan) => {
            if(chan.live.state != LiveState.REBROADCAST) {
                chan.live.setLive(false);
            }
        });
        return channels;
    }
    _getHostedChannel(channel) {
        return this._getHostedChannels([ channel ]).then((chs) => chs[0]);
    }
    async _getActivePlaylistInfo(channel) {
        const id = await this._getChannelId(channel),
            playlist = await this._qs.queueRequest("https://api.twitch.tv/api/playlists/channels/" + id, headers);

        if(playlist.parseJSON && playlist.parseJSON.enabled && playlist.parseJSON.active && playlist.parseJSON.playhead) {
            const playhead = playlist.parseJSON.playhead,
                vod = await this._qs.queueRequest(baseURL + "/videos/v" + playhead.vods[playhead.active_vod_index].id, headers);
            if(vod.parseJSON) {
                return {
                    title: vod.parseJSON.title,
                    game: vod.parseJSON.game,
                    thumbnail: vod.parseJSON.preview
                };
            }
            else {
                throw "VOD not found";
            }
        }
        else {
            throw "Not a channel with an active playlist";
        }
    }
}

export default Object.freeze(new Twitch(type));
