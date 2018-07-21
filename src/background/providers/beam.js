/**
 * Beam provider.
 *
 * @author Martin Giger
 * @license MPL-2.0
 * @module providers/beam
 * @todo checkout socket based events
 */
import {
    Channel, User
} from '../channel/core.js';
import { memoize } from "lodash";
import { promisedPaginationHelper } from '../pagination-helper.js';
import GenericProvider from "./generic-provider.js";
import { not } from '../logic.js';
import LiveState from '../channel/live-state.js';
import { filterExistingFavs } from '../channel/utils.js';
import prefs from "../../preferences.js";

const type = "beam",
    chatURL = "https://mixer.com/embed/chat/",
    baseURL = 'https://mixer.com/api/v1/',
    headers = {},
    PAGE_SIZE = 50,
    SIZES = [
        '50',
        '70',
        '150',
        '300'
    ],
    NOT_FOUND = 404,
    getImageFromUserID = (id) => {
        const image = {};
        SIZES.forEach((s) => {
            image[s] = `${baseURL}users/${id}/avatar?w=${s}&h=${s}`;
        });
        return image;
    };

prefs.get('mixer_clientID').then((id) => {
    headers['Client-ID'] = id;
})
    .catch(console.error);

function getChannelFromJSON(jsonChannel) {
    const ret = new Channel(jsonChannel.token, type);
    ret.live.setLive(jsonChannel.online);
    ret.live.created = 0;
    ret.title = jsonChannel.name;
    ret.viewers = jsonChannel.viewersCurrent;
    if(jsonChannel.thumbnail) {
        ret.thumbnail = jsonChannel.thumbnail.url;
    }
    else {
        // this is the actual thumbnail and not just the default channel thumbnail thing.
        ret.thumbnail = `https://thumbs.mixer.com/channel/${jsonChannel.id}.big.jpg`;
    }
    ret.url.push(`https://mixer.com/${jsonChannel.token}`);
    ret.archiveUrl = `https://mixer.com/${jsonChannel.token}`;
    ret.chatUrl = chatURL + jsonChannel.token;
    ret.mature = jsonChannel.audience === "18+";
    ret.image = getImageFromUserID(jsonChannel.user.id);
    if(jsonChannel.type !== null) {
        ret.category = jsonChannel.type.name;
    }
    ret.language = jsonChannel.languageId;
    return ret;
}

function getImageFromAvatars(avatars) {
    const image = {};
    if(Array.isArray(avatars) && avatars.length) {
        for(const avatar of avatars) {
            image[avatar.meta.size.split("x").shift()] = avatar.url;
        }
    }
    return image;
}

class Beam extends GenericProvider {
    constructor(type) {
        super(type);
        this._getUserIdFromUsername = memoize((username) => this._qs.queueRequest(`${baseURL}users/search?query=${username}`, headers).then((response) => {
            if(response.ok && response.parsedJSON) {
                return response.parsedJSON.find((val) => val.username == username).id;
            }
            throw new Error(`Could not find user for ${username}`);
        }));

        this.authURL = [
            "https://mixer.com",
            "https://beam.pro"
        ];
        this._supportsFavorites = true;
        this._supportsCredentials = true;
        this._supportsFeatured = true;

        this.initialize();
    }

    async getUserFavorites(username) {
        const userid = await this._getUserIdFromUsername(username),
            user = await this._qs.queueRequest(`${baseURL}users/${userid}`, headers);

        if(user.parsedJSON) {
            const ch = new User(user.parsedJSON.username, this._type),
                subscriptions = await promisedPaginationHelper({
                    url: `${baseURL}users/${userid}/follows?limit=${PAGE_SIZE}&page=`,
                    pageSize: PAGE_SIZE,
                    initialPage: 0,
                    request: (url) => this._qs.queueRequest(url, headers),
                    getPageNumber(page) {
                        return ++page;
                    },
                    fetchNextPage(data, pageSize) {
                        return data.parsedJSON && data.parsedJSON.length == pageSize;
                    },
                    getItems(data) {
                        return data.parsedJSON || [];
                    }
                }),
                channels = await Promise.all(subscriptions.map((sub) => this.getChannelDetails(sub.token)));

            ch.favorites = subscriptions.map((sub) => sub.token);

            if("avatars" in user.parsedJSON) {
                ch.image = getImageFromAvatars(user.parsedJSON.avatars);
            }
            else {
                ch.image = getImageFromUserID(user.parsedJSON.id);
            }

            return [
                ch,
                channels
            ];
        }

        throw new Error(`Could not get favorites for user ${username} on ${this.name}`);
    }
    updateFavsRequest() {
        const getURLs = async () => {
            const users = await this._list.getUsers();
            return Promise.all(users.map((user) => this._getUserIdFromUsername(user.login).then((id) => `${baseURL}users/${id}`)));
        };

        return {
            getURLs,
            headers,
            onComplete: async (data, url) => {
                if(data.parsedJSON) {
                    const ch = new User(data.parsedJSON.username, this._type),
                        [
                            oldUser,
                            follows
                        ] = await Promise.all([
                            this._list.getUserByName(ch.login),
                            promisedPaginationHelper({
                                url: `${url}/follows?limit=${PAGE_SIZE}&page=`,
                                pageSize: PAGE_SIZE,
                                initialPage: 0,
                                request: (pageURL) => this._qs.queueRequest(pageURL, headers),
                                getPageNumber: (page) => ++page,
                                fetchNextPage(pageData, pageSize) {
                                    return pageData.parsedJSON && pageData.parsedJSON.length == pageSize;
                                },
                                getItems: (pageData) => pageData.parsedJSON || []
                            })
                        ]),
                        channels = await Promise.all(follows.map((sub) => this.getChannelDetails(sub.token))),
                        newChannels = filterExistingFavs(oldUser, channels);
                    ch.favorites = follows.map((sub) => sub.token);
                    ch.id = oldUser.id;

                    if("avatars" in data.parsedJSON) {
                        ch.image = getImageFromAvatars(data.parsedJSON.avatars);
                    }
                    else {
                        ch.image = getImageFromUserID(data.parsedJSON.id);
                    }
                    return [
                        ch,
                        newChannels
                    ];
                }
                return [];
            }
        };
    }
    async getChannelDetails(channelname) {
        const response = await this._qs.queueRequest(`${baseURL}channels/${channelname}`, headers);
        if(response.parsedJSON) {
            const channel = getChannelFromJSON(response.parsedJSON);
            if(channel.live.state === LiveState.OFFLINE) {
                const hostedChannel = await this._getHostee(response.parsedJSON.id);
                if(hostedChannel !== null) {
                    channel.live.redirectTo(hostedChannel);
                }
            }
            return channel;
        }
        throw new Error(`Error getting the details for the beam channel ${channelname}`);
    }
    updateRequest() {
        const getURLs = async () => {
            const channels = await this._list.getChannels();
            return channels.map((channel) => `${baseURL}channels/${channel.login}`);
        };
        return {
            getURLs,
            headers,
            onComplete: async (data) => {
                if(data.parsedJSON) {
                    const channel = getChannelFromJSON(data.parsedJSON);

                    if(channel.live.state === LiveState.OFFLINE) {
                        const hostedChannel = await this._getHostee(data.parsedJSON.id);
                        if(hostedChannel !== null) {
                            channel.live.redirectTo(hostedChannel);
                        }
                    }
                    return channel;
                }
            }
        };
    }
    async getFeaturedChannels() {
        const data = await this._qs.queueRequest(`${baseURL}channels?limit=8&page=0&order=online%3Adesc%2CviewersCurrent%3Adesc%2CviewersTotal%3Adesc&where=suspended:eq:0%2Conline:eq:1`, headers);
        if(data.parsedJSON && data.parsedJSON.length) {
            let chans = data.parsedJSON;
            if(await not(this._mature())) {
                chans = chans.filter((ch) => ch.audience !== "18+");
            }

            return chans.map((chan) => getChannelFromJSON(chan));
        }

        throw new Error(`Didn't find any featured channels for ${this.name}`);
    }
    async search(query) {
        const data = await this._qs.queueRequest(`${baseURL}channels?where=online:eq:1%2Ctoken:eq:${query}`, headers);
        if(data.parsedJSON && data.parsedJSON.length) {
            let chans = data.parsedJSON;
            if(await not(this._mature())) {
                chans = chans.filter((ch) => ch.audience !== "18+");
            }

            return chans.map((chan) => getChannelFromJSON(chan));
        }

        throw new Error(`No results for ${query} on ${this.name}`);
    }

    async _getHostee(channelId) {
        return this._qs.queueRequest(`${baseURL}channels/${channelId}/hostee`, headers).then((response) => {
            if(response.ok && response.status !== NOT_FOUND && response.parsedJSON) {
                return getChannelFromJSON(response.parsedJSON);
            }

            return null;
        });
    }
}

export default Object.freeze(new Beam(type));
