/**
 * Twitch Provider.
 * @author Martin Giger
 * @license MPL-2.0
 * @module providers/twitch
 */
import prefs from "../../preferences.js";
import querystring from "../querystring.js";
import LiveState from "../channel/live-state.js";
import {
    Channel, User
} from '../channel/core.js';
import { promisedPaginationHelper } from '../pagination-helper.js';
import GenericProvider from "./generic-provider.js";
import { not } from '../logic.js';
import { filterExistingFavs } from '../channel/utils.js';
import { emit } from '../../utils.js';

//TODO helix is missing search
//TODO helix is missing rebroadcasts
//TODO helix is missing mature annotations
//TODO stop doing requests on 429 -> custom requeue

const type = "twitch",
    archiveURL = "/videos/all",
    chatURL = "/chat",
    baseURL = 'https://api.twitch.tv/helix',
    headers = {
        'Client-ID': ''
    },
    defaultAvatar = "https://static-cdn.jtvnw.net/jtv_user_pictures/xarth/404_user_300x300.png",
    itemsPerPage = 100,
    SIZES = [
        '50',
        '70',
        '150',
        '300'
    ],
    urlForSize = (imgURL, size) => imgURL.replace("300x300", `${size}x${size}`),
    getImageObj = (imgURL = defaultAvatar) => {
        const ret = {};
        SIZES.forEach((s) => {
            ret[s] = urlForSize(imgURL, s);
        });
        return ret;
    },
    dedupe = (a, b) => {
        const ids = b.map((c) => c.login);
        return a.filter((c) => !ids.includes(c.login));
    },
    LANG_START = 0,
    LANG_END = 2,
    REBROADCAST_TYPES = [
        'watch_party', // vodcast launch name
        'permiere', // vodcast started after uploading a video
        'playlist', // pre-vodcast replays
        'vodcast', // raw vodcast
        'rerun' // replay of a past vod
    ],
    THUMBNAIL_WIDTH = 640,
    THUMBNAIL_HEIGHT = 360;

prefs.get('twitch_clientId').then((id) => {
    headers['Client-ID'] = id;
})
    .catch(console.error);

function getChannelFromJSON(jsonChannel) {
    const ret = new Channel(jsonChannel.id, type),
        url = `https://twitch.tv/${jsonChannel.login}`;
    ret.slug = jsonChannel.login;
    ret.uname = jsonChannel.display_name;
    ret.url.push(url);
    ret.archiveUrl = url + archiveURL;
    ret.chatUrl = url + chatURL;
    ret.image = getImageObj(jsonChannel.profile_image_url ? jsonChannel.profile_image_url : defaultAvatar);
    //ret.title = jsonChannel.status;
    //ret.category = jsonChannel.game;
    //ret.mature = jsonChannel.mature;
    //ret.language = jsonChannel.broadcaster_language;

    return ret;
}

class Twitch extends GenericProvider {
    constructor(type) {
        super(type);

        this.authURL = [
            "http://www.twitch.tv",
            "https://secure.twitch.tv",
            "https://passport.twitch.tv"
        ];
        this._supportsFavorites = true;
        this._supportsCredentials = true;
        this._supportsFeatured = true;
        this._hasUniqueSlug = true;

        this._loginsToUpdate = new Set();
        this._games = {};

        this.initialize()
            .then(() => this.updateLogins())
            .catch(console.error);
    }

    get optionalPermissions() {
        return [ "https://tmi.twitch.tv/*" ];
    }

    updateLogin(item) {
        this._loginsToUpdate.add(item);
    }

    updateLogins() {
        if(this._loginsToUpdate.size) {
            return this._getUsers(this._loginsToUpdate.values(), 'login')
                .then((result) => Promise.all(this._loginsToUpdate.values().map(async (i) => {
                    const item = await this._list.getChannelByName(i.slug);
                    item._login = result.find((u) => u.login == item.slug).id;
                    if(item instanceof User) {
                        emit(this, "updateduser", item);
                    }
                    else {
                        return item;
                    }
                })))
                .then((updatedItems) => {
                    const updatedChannels = updatedItems.filter();
                    if(updatedChannels.length) {
                        emit(this, "updatedchannels", updatedChannels);
                    }
                });
        }
    }

    async getUserFavorites(username) {
        let data;
        try {
            data = await this._qs.queueRequest(`${baseURL}/users?login=${username}&id=${username}`, headers);
        }
        catch(e) {
            // Fall-through
        }

        if(data.parsedJSON && data.parsedJSON.data && data.parsedJSON.data.length) {
            const [ helixUser ] = data.parsedJSON.data,
                channels = await promisedPaginationHelper({
                    url: `${baseURL}/users/follows?first=${itemsPerPage}&from_id=${helixUser.id}`,
                    pageSize: itemsPerPage,
                    getPageNumber(page, pageSize, d) {
                        return `&after=${d.parsedJSON.pagination.cursor}`;
                    },
                    initialPage: '',
                    request: (url) => this._qs.queueRequest(url, headers),
                    fetchNextPage(d) {
                        return d.parsedJSON && "data" in d.parsedJSON && d.parsedJSON.data.length == itemsPerPage && "pagination" in d.parsedJSON && "cursor" in d.parsedJSON.pagination;
                    },
                    getItems(d) {
                        if(d.parsedJSON && "data" in d.parsedJSON) {
                            return d.parsedJSON.data;
                        }

                        return [];
                    }
                }),
                user = new User(helixUser.id, this._type);
            let following = [];
            if(channels.length) {
                following = await this._getUsers(channels, 'to_id');
            }
            user.slug = helixUser.login;
            user.uname = helixUser.display_name;
            user.image = getImageObj(helixUser.profile_image_url ? helixUser.profile_image_url : defaultAvatar);
            user.favorites = channels.map((c) => c.to_id);

            return [
                user,
                following.map((c) => getChannelFromJSON(c))
            ];
        }

        throw new Error(`Couldn't fetch ${this.name} user ${username}`);
    }
    getChannelDetails(channelname) {
        return this._qs.queueRequest(`${baseURL}/users?login=${channelname}&id=${channelname}`, headers)
            .then((data) => {
                if(data.parsedJSON && data.parsedJSON.data && data.parsedJSON.data.length) {
                    const [ helixChannel ] = data.parsedJSON.data;
                    return getChannelFromJSON(helixChannel);
                }
                throw new Error(data.parsedJSON ? data.parsedJSON.error : `Could not fetch details for ${this.name} channel ${channelname}`);
            });
    }
    updateFavsRequest() {
        const getURLs = async () => {
            const users = await this._list.getUsers(),
                urls = [];
            let offset = 0;
            while(offset < users.length) {
                const slice = users.slice(offset, offset + itemsPerPage);
                urls.push(`${baseURL}/users?id=${slice.map((u) => u.login).join('&id=')}`);
                offset += itemsPerPage;
            }
            return urls;
        };

        return {
            getURLs,
            headers,
            onComplete: async (data) => {
                if(data.parsedJSON && data.parsedJSON.data && data.parsedJSON.data.length) {
                    for(const helixUser of data.parsedJSON.data) {
                        const user = await this._list.getUserByName(helixUser.id),
                            follows = await promisedPaginationHelper({
                                url: `${baseURL}/users/follows?first=${itemsPerPage}&from_id=${user.login}`,
                                pageSize: itemsPerPage,
                                getPageNumber(page, pageSize, d) {
                                    return `&after=${d.parsedJSON.pagination.cursor}`;
                                },
                                initialPage: '',
                                request: (url) => this._qs.queueRequest(url, headers),
                                fetchNextPage(d) {
                                    return d.parsedJSON && "data" in d.parsedJSON && d.parsedJSON.data.length == itemsPerPage && "pagination" in d.parsedJSON && "cursor" in d.parsedJSON.pagination;
                                },
                                getItems(d) {
                                    if(d.parsedJSON && "follows" in d.parsedJSON) {
                                        return d.parsedJSON.data.map((c) => c.to_id);
                                    }

                                    return [];
                                }
                            }),
                            newUsers = filterExistingFavs(user, follows).map((id) => ({ id }));
                        let newChannels = [];
                        if(newUsers.length) {
                            newChannels = await this._getUsers(newUsers, 'id');
                        }

                        user.slug = helixUser.login;
                        user.uname = helixUser.display_name;
                        user.image = getImageObj(helixUser.profile_image_url ? helixUser.profile_image_url : defaultAvatar);
                        user.favorites = follows;
                        return [
                            user,
                            newChannels.map((c) => getChannelFromJSON(c))
                        ];
                    }
                }
                return [];
            }
        };
    }
    updateRequest() {
        const getURLs = async () => {
            const channels = await this._list.getChannels();
            if(channels.length) {
                const urls = [];
                let offset = 0;
                while(offset < channels.length) {
                    const slice = channels.slice(offset, offset + itemsPerPage);
                    urls.push(`${baseURL}/streams?first=${itemsPerPage}&user_id=${slice.map((u) => u.login).join('&user_id=')}`);
                    offset += itemsPerPage;
                }
                return urls;
            }
            return channels;
        };
        return {
            getURLs,
            headers,
            onComplete: async (firstPage, url) => {
                if(firstPage.parsedJSON && "data" in firstPage.parsedJSON) {
                    const jsonChannels = firstPage.parsedJSON.data,
                        // cache games
                        [ updatedChannels ] = await Promise.all([
                            this._qs.queueRequest(url.replace('/streams', '/users').replace(/user_id/g, 'id'), headers),
                            this._getGames(jsonChannels.map((c) => c.game_id))
                        ]),
                        liveChannels = [];
                    if(updatedChannels.parsedJSON && updatedChannels.parsedJSON.data) {
                        const channels = await Promise.all(updatedChannels.parsedJSON.data.map(async (obj) => {
                            const oldCho = await this._list.getChannelByName(obj.id),
                                stream = jsonChannels.find((s) => s.user_id === obj.id),
                                cho = getChannelFromJSON(obj);
                            cho.id = oldCho.id;
                            if(stream) {
                                cho.viewers = stream.viewer_count;
                                cho.category = await this._getGame(stream.game_id);
                                cho.language = stream.language;
                                cho.title = stream.title;
                                cho.thumbnail = this._formatThumbnail(stream.thumbnail_url);
                                if(REBROADCAST_TYPES.includes(stream.type)) {
                                    cho.live = new LiveState(LiveState.REBROADCAST);
                                }
                                else {
                                    cho.live.setLive(true);
                                }
                                cho.live.created = Date.parse(stream.started_at);
                                liveChannels.push(cho);
                            }
                            return cho;
                        }));
                        if(liveChannels.length < channels.length) {
                            const offlineChans = dedupe(channels, liveChannels),
                                chans = await this._getHostedChannels(offlineChans, liveChannels);
                            return liveChannels.concat(chans);
                        }
                        return channels;
                    }
                }
            }
        };
    }
    async updateChannel(channelname, ignoreHosted = false) {
        const [
            data,
            userData
        ] = await Promise.all([
            this._qs.queueRequest(`${baseURL}/streams?user_id=${channelname}`, headers),
            this._qs.queueRequest(`${baseURL}/users?id=${channelname}`, headers)
        ]);
        if(userData.parsedJSON && userData.parsedJSON.data && userData.parsedJSON.data.length) {
            const [ jsonChannel ] = userData.parsedJSON.data,
                channel = getChannelFromJSON(jsonChannel);
            if(data.parsedJSON && data.parsedJSON.data && data.parsedJSON.data.length) {
                const [ obj ] = data.parsedJSON.data;
                channel.viewers = obj.viewer_count;
                channel.category = await this._getGame(obj.game_id);
                channel.language = obj.language;
                channel.title = obj.title;
                channel.thumbnail = this._formatThumbnail(obj.thumbnail_url);
                if(REBROADCAST_TYPES.includes(obj.type)) {
                    channel.live = new LiveState(LiveState.REBROADCAST);
                }
                else {
                    channel.live.setLive(true);
                }
                channel.live.created = Date.parse(obj.started_at);
            }

            if((await channel.live.isLive(LiveState.TOWARD_LIVE)) || ignoreHosted) {
                return channel;
            }

            return this._getHostedChannel(channel);
        }
        throw new Error(`Could not load user details for ${channelname}`);
    }
    async updateChannels(channels, ignoreHosted = false) {
        let offset = 0;
        const logins = channels.map((c) => c.login),
            getPageNumber = (page, pageSize) => {
                const pageParams = `&user_id=${logins.slice(offset, offset + pageSize).join('&user_id=')}`;
                ++offset;
                return pageParams;
            },
            liveChannels = await promisedPaginationHelper({
                url: `${baseURL}/streams?first=${itemsPerPage}`,
                pageSize: itemsPerPage,
                getPageNumber,
                initialPage: getPageNumber(offset, itemsPerPage),
                request: (url) => this._qs.queueRequest(url, headers),
                fetchNextPage(data, pageSize) {
                    return offset + pageSize < logins.length;
                },
                getItems(data) {
                    if(data.parsedJSON && !data.parsedJSON.error) {
                        return data.parsedJSON.data;
                    }

                    return [];
                }
            });

        let ret = [];
        if(liveChannels.length) {
            // cache games
            const [ mergedData ] = await Promise.all([
                this._getUsers(liveChannels),
                this._getGames(liveChannels.map((c) => c.game_id))
            ]);
            ret = await Promise.all(mergedData.map(async (obj) => {
                const cho = getChannelFromJSON(obj);
                try {
                    const oldCho = await this._list.getChannelByName(obj.id);
                    cho.id = oldCho.id;
                }
                catch(e) {
                    // Not a channel in the list.
                }
                cho.viewers = obj.stream.viewer_count;
                cho.thumbnail = this._formatThumbnail(obj.stream.thumbnail_url);
                cho.title = obj.stream.title;
                cho.language = obj.stream.langauge;
                cho.category = await this._getGame(obj.stream.game_id);
                if(REBROADCAST_TYPES.includes(obj.stream.type)) {
                    cho.live = new LiveState(LiveState.REBROADCAST);
                }
                else {
                    cho.live.setLive(true);
                }

                cho.live.created = Date.parse(obj.stream.started_at);
                return cho;
            }));
        }
        if(ret.length != channels.length) {
            const offlineChans = dedupe(channels, ret);
            if(!ignoreHosted) {
                const offChans = await this._getHostedChannels(offlineChans, ret);
                ret = ret.concat(offChans);
            }
            else {
                const offChans = await this._getUsers(offlineChans, 'login');
                ret = ret.concat(offChans.map((c) => getChannelFromJSON(c)));
            }
        }

        return ret;
    }
    async getFeaturedChannels() {
        const data = await this._qs.queueRequest(`${baseURL}/streams?language=${browser.i18n.getUILanguage().substr(LANG_START, LANG_END)}`, headers);
        if(data.parsedJSON && "data" in data.parsedJSON && data.parsedJSON.data.length) {
            //TODO fetch user data for all streams
            let chans = data.parsedJSON.data;
            if(await not(this._mature())) {
                chans = chans.filter((chan) => !chan.stream.channel.mature);
            }

            const [ mergedData ] = await Promise.all([
                this._getUsers(chans),
                this._getGames(chans.map((c) => c.game_id))
            ]);
            return Promise.all(mergedData.map(async (obj) => {
                const channel = getChannelFromJSON(obj);
                channel.thumbnail = this._formatThumbnail(obj.stream.thumbnail_url);
                channel.viewers = obj.stream.viewer_count;
                channel.category = await this._getGame(obj.stream.game_id);
                channel.language = obj.stream.language;
                channel.title = obj.stream.title;
                if(REBROADCAST_TYPES.includes(obj.stream.type)) {
                    channel.live = new LiveState(LiveState.REBROADCAST);
                }
                else {
                    channel.live.setLive(true);
                }
                channel.live.created = Date.parse(obj.stream.started_at);
                return channel;
            }));
        }

        throw new Error(`Could not get any featured channel for ${this.name}`);
    }
    async search(query) {
        const v5Headers = Object.assign({
                Accept: 'application/vnd.twitchtv.v5+json'
            }, headers),
            data = await this._qs.queueRequest(`https://api.twitch.tv/kraken/search/streams?${querystring.stringify({ query })}`, v5Headers);
        if(data.parsedJSON && "streams" in data.parsedJSON && data.parsedJSON.streams.length) {
            let chans = data.parsedJSON.streams;
            if(await not(this._mature())) {
                chans = chans.filter((chan) => !chan.channel.mature);
            }

            return chans.map((chan) => {
                const channel = new Channel(chan.channel._id, type);
                channel.slug = chan.channel.name;
                channel.uname = chan.channel.display_name;
                channel.image = {
                    "300": chan.channel.logo
                };
                channel.language = chan.channel.language;
                channel.mature = chan.channel.mature;
                channel.url.push(chan.channel.url);
                channel.title = chan.channel.status;
                channel.category = chan.game;
                channel.viewers = chan.viewers;
                channel.thumbnail = chan.preview.large;
                if(chan.is_playlist || REBROADCAST_TYPES.includes(chan.stream_type)) {
                    channel.live = new LiveState(LiveState.REBROADCAST);
                }
                else {
                    channel.live.setLive(true);
                }
                channel.live.created = Date.parse(chan.created_at);
                return channel;
            });
        }

        throw new Error(`No results for the search ${query} on ${this.name}`);
    }
    async _getHostedChannels(channels, liveChans) {
        if(await prefs.get("twitch_showHosting")) {
            const channelIds = channels.map((channel) => channel.login),

                data = await this._qs.queueRequest(`https://tmi.twitch.tv/hosts?${querystring.stringify({
                    host: channelIds.join(",")
                })}`, headers);

            if(data.parsedJSON && "hosts" in data.parsedJSON && data.parsedJSON.hosts.length) {
                const existingChans = Array.isArray(liveChans) ? channels.concat(liveChans) : channels,
                    // Check each hosted channel for his status
                    externalHosts = new Map(),
                    hosts = await Promise.all(data.parsedJSON.hosts.map(async (hosting) => {
                        const chan = channels.find((ch) => ch.login == hosting.host_id);
                        if(hosting.target_id) {
                        // Check the hosted channel's status, since he isn't a channel we already have in our lists.
                            let hostedChannel = existingChans.find((ch) => ch.login == hosting.target_id);
                            if(hostedChannel && !hostedChannel.id) {
                                hostedChannel = null;
                            }
                            if(!hostedChannel) {
                                externalHosts.set(hosting.target_id.toString(), chan);
                            }
                            else if(await hostedChannel.live.isLive(LiveState.TOWARD_BROADCASTING)) {
                                chan.live.redirectTo(hostedChannel);
                            }
                            else if(chan.live.state != LiveState.REBROADCAST) {
                                chan.live.setLive(false);
                            }
                            return chan;
                        }

                        if(chan.live.state != LiveState.REBROADCAST) {
                            chan.live.setLive(false);
                        }

                        return chan;
                    }));
                if(externalHosts.size) {
                    const externalChannels = await this.updateChannels(Array.from(externalHosts.keys(), (login) => ({
                        login
                    })), true);
                    for(const externalChannel of externalChannels) {
                        const hoster = externalHosts.get(externalChannel.login);
                        if(await externalChannel.live.isLive(LiveState.TOWARD_OFFLINE)) {
                            const liveSince = externalChannel.live.created;
                            externalChannel.live = new LiveState(LiveState.REDIRECT);
                            externalChannel.live.created = liveSince;
                            hoster.live.redirectTo(externalChannel);
                        }
                        else if(hoster.live.state != LiveState.REBROADCAST) {
                            hoster.live.setLive(false);
                        }
                    }
                }
                return hosts;
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
        return this._getHostedChannels([ channel ]).then((chs) => {
            const [ ch ] = chs;
            return ch;
        });
    }
    _formatThumbnail(thumbnailUrl) {
        return thumbnailUrl.replace('{width}', THUMBNAIL_WIDTH).replace('{height}', THUMBNAIL_HEIGHT);
    }
    _getUsers(streams, property = 'user_id') {
        let offset = 0;
        const userIds = streams.map((s) => s[property]),
            getPageNumber = (page, pageSize) => {
                const pageParams = `&id=${userIds.slice(offset, offset + pageSize).join('&id=')}`;
                ++offset;
                return pageParams;
            };
        return promisedPaginationHelper({
            url: `${baseURL}/users?first=${itemsPerPage}`,
            pageSize: itemsPerPage,
            getPageNumber,
            initialPage: getPageNumber(offset, itemsPerPage),
            request: (url) => this._qs.queueRequest(url, headers),
            fetchNextPage(data, pageSize) {
                return offset + pageSize < userIds.length;
            },
            getItems(data) {
                if(data.parsedJSON && !data.parsedJSON.error) {
                    return data.parsedJSON.data.map((u) => {
                        const stream = streams.find((s) => s[property] === u.id);
                        if(stream) {
                            u.stream = stream;
                        }
                        return u;
                    });
                }

                return [];
            }
        });
    }
    async _getGame(id) {
        if(!this._games.hasOwnProperty(id)) {
            const res = await this._qs.queueRequest(`${baseURL}/games?id=${id}`, headers);
            if(res.ok && res.parsedJSON.data && res.parsedJSON.data.length) {
                const [ game ] = res.parsedJSON.data;
                this._games[id] = game.name;
            }
            else {
                throw new Error(`Could not fetch details for game ${id}`);
            }
        }
        return this._games[id];
    }
    async _getGames(ids) {
        const unknownIds = ids.filter((id) => !this._games.hasOwnProperty(id));
        if(unknownIds.length) {
            let offset = 0;
            const getPageNumber = (page, pageSize) => {
                    const pageParams = `?id=${unknownIds.slice(offset, offset + pageSize).join('&id=')}`;
                    ++offset;
                    return pageParams;
                },
                games = await promisedPaginationHelper({
                    url: `${baseURL}/games`,
                    pageSize: itemsPerPage,
                    getPageNumber,
                    initialPage: getPageNumber(offset, itemsPerPage),
                    request: (url) => this._qs.queueRequest(url, headers),
                    fetchNextPage(data, pageSize) {
                        return offset + pageSize < unknownIds.length;
                    },
                    getItems(data) {
                        if(data.parsedJSON && !data.parsedJSON.error) {
                            return data.parsedJSON.data;
                        }

                        return [];
                    }
                });
            for(const game of games) {
                this._games[game.id] = game.name;
            }
        }
        return ids.map((id) => this._games[id]);
    }
}

export default Object.freeze(new Twitch(type));
