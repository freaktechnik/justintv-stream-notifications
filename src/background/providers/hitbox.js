/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 *
 * Hitbox provider
 */
import {
    Channel, User
} from '../channel/core';
import GenericProvider from "./generic-provider";
import { promisedPaginationHelper } from "../pagination-helper";
import querystring from "../querystring";
import { not } from '../logic';
import { filterExistingFavs } from '../channel/utils';

const type = "hitbox",
    archiveURL = "/videos",
    chatURL = "https://smashcast.tv/embedchat/",
    PAGE_SIZE = 100,
    baseURL = "https://api.smashcast.tv",
    cdnURL = "https://edge.sf.hitbox.tv",
    LANG_START = 0,
    LANG_END = 2;

function getChannelFromJson(json) {
    const cho = new Channel(json.channel.user_name, type);
    cho.uname = json.media_display_name;
    cho.url.push(json.channel.channel_link);
    cho.archiveUrl = json.channel.channel_link + archiveURL;
    cho.chatUrl = chatURL + json.channel.user_name;
    cho.image = {
        "200": cdnURL + json.channel.user_logo,
        "50": cdnURL + json.channel.user_logo_small
    };
    cho.title = json.media_status;
    cho.category = json.category_name;
    cho.viewers = json.media_views;
    cho.thumbnail = cdnURL + json.media_thumbnail;
    cho.live.setLive(json.media_is_live != "0");
    cho.live.created = Date.parse(json.media_live_since);
    cho.mature = json.media_mature === "1";
    return cho;
}

class Hitbox extends GenericProvider {
    constructor(type) {
        super(type);

        this.authURL = [ "https://www.smashcast.tv" ];
        this._supportsFavorites = true;
        this._supportsCredentials = true;
        this._supportsFeatured = true;

        this.initialize();
    }

    async getUserFavorites(username) {
        const [
            follows,
            user
        ] = await Promise.all([
            promisedPaginationHelper({
                url: `${baseURL}/following/user?user_name=${username}&limit=${PAGE_SIZE}&offset=`,
                pageSize: PAGE_SIZE,
                request: (url) => this._qs.queueRequest(url),
                fetchNextPage(data, pageSize) {
                    return data.parsedJSON && "following" in data.parsedJSON && data.parsedJSON.following.length == pageSize;
                },
                getItems(data) {
                    if(data.parsedJSON && "following" in data.parsedJSON) {
                        return data.parsedJSON.following;
                    }

                    return [];
                }
            }),
            this._qs.queueRequest(`${baseURL}/user/${username}`)
        ]);

        if(user.ok && user.parsedJSON && user.parsedJSON.user_name !== null) {
            const usr = new User(user.parsedJSON.user_name, this._type);
            usr.image = {
                "200": cdnURL + user.parsedJSON.user_logo,
                "50": cdnURL + user.parsedJSON.user_logo_small
            };
            usr.favorites = follows.map((follow) => follow.user_name);

            const channels = await this._getChannels(usr.favorites);
            return [
                usr,
                channels
            ];
        }

        throw new Error(`Error getting info for Hitbox user ${username}`);
    }
    getChannelDetails(channelname) {
        return this._qs.queueRequest(`${baseURL}/media/live/${channelname}`).then((data) => {
            if(data.ok && data.parsedJSON && data.parsedJSON.livestream) {
                const [ channel ] = data.parsedJSON.livestream;
                return getChannelFromJson(channel);
            }

            throw new Error(`Error getting details for ${this.name} channel ${channelname}`);
        });
    }
    updateFavsRequest() {
        const getURLs = async () => {
            const users = await this._list.getUsers();
            return users.map((user) => `${baseURL}/user/${user.login}`);
        };
        return {
            getURLs,
            onComplete: async (data) => {
                if(data.ok && data.parsedJSON) {
                    const [
                            user,
                            follows
                        ] = await Promise.all([
                            this._list.getUserByName(data.parsedJSON.user_name),
                            promisedPaginationHelper({
                                url: `${baseURL}/following/user?user_name=${data.parsedJSON.user_name}&limit=${PAGE_SIZE}&offset=`,
                                pageSize: PAGE_SIZE,
                                request: (url) => this._qs.queueRequest(url),
                                fetchNextPage(pageData, pageSize) {
                                    return pageData.parsedJSON && "following" in pageData.parsedJSON && pageData.parsedJSON.following.length == pageSize;
                                },
                                getItems(pageData) {
                                    if(pageData.parsedJSON && "following" in pageData.parsedJSON) {
                                        return pageData.parsedJSON.following;
                                    }

                                    return [];
                                }
                            })
                        ]),
                        channels = await this._getChannels(follows.map((follow) => follow.user_name)),
                        newChannels = filterExistingFavs(user, channels);
                    user.favorites = follows.map((follow) => follow.user_name);
                    user.image = {
                        "200": cdnURL + data.parsedJSON.user_logo,
                        "50": cdnURL + data.parsedJSON.user_logo_small
                    };
                    return [
                        user,
                        newChannels
                    ];
                }
                return [];
            }
        };
    }
    updateRequest() {
        const getURLs = async () => {
            const channels = await this._list.getChannels();
            return channels.map((channel) => `${baseURL}/media/live/${channel.login}`);
        };
        return {
            getURLs,
            onComplete: async (data) => {
                if(data.ok && data.parsedJSON && data.parsedJSON.livestream) {
                    const [ channel ] = data.parsedJSON.livestream;
                    return getChannelFromJson(channel);
                }
            }
        };
    }
    async search(query) {
        const data = await this._qs.queueRequest(`${baseURL}/media/live/list?${querystring.stringify({
            publicOnly: true,
            filter: "popular",
            search: query,
            language: browser.i18n.getUILanguage().substr(LANG_START, LANG_END)
        })}`);
        if(data.ok && data.parsedJSON && data.parsedJSON.livestream && data.parsedJSON.livestream.length) {
            let chans = data.parsedJSON.livestream;
            if(await not(this._mature())) {
                chans = chans.filter((m) => m.media_mature !== "1");
            }

            return chans.map((chan) => getChannelFromJson(chan));
        }

        throw new Error(`Couldn't find any channels for the search on ${this.name} that match ${query}`);
    }

    _getChannels(channels) {
        return Promise.all(channels.map((channel) => this._qs.queueRequest(`${baseURL}/media/live/${channel}`).then((data) => {
            if(data.ok && data.parsedJSON && "livestream" in data.parsedJSON) {
                const [ rawChannel ] = data.parsedJSON.livestream;
                return getChannelFromJson(rawChannel);
            }

            return null;
        }))).then((resultChans) => resultChans.filter((channel) => channel !== null));
    }
}

export default Object.freeze(new Hitbox(type));
