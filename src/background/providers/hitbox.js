/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 *
 * Hitbox provider
 */
import { Channel, User } from '../channel/core';
import GenericProvider from "./generic-provider";
import { promisedPaginationHelper } from "../pagination-helper";
import querystring from "../querystring";
import { not } from '../logic';
import { filterExistingFavs } from '../channel/utils';

const type = "hitbox",
    archiveURL = "/videos",
    chatURL = "https://smashcast.tv/embedchat/",
    pageSize = 100,
    baseURL = "https://api.smashcast.tv",
    cdnURL = "https://edge.sf.hitbox.tv";

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

    _getChannels(channels) {
        return Promise.all(channels.map((channel) => {
            return this._qs.queueRequest(baseURL + '/media/live/' + channel).then((data) => {
                if(data.ok && data.parsedJSON && "livestream" in data.parsedJSON) {
                    return getChannelFromJson(data.parsedJSON.livestream[0]);
                }
                else {
                    return null;
                }
            });
        })).then((channels) => channels.filter((channel) => channel !== null));
    }
    async getUserFavorites(username) {
        const [ follows, user ] = await Promise.all([
            promisedPaginationHelper({
                url: baseURL + '/following/user?user_name=' + username + '&limit=' + pageSize + '&offset=',
                pageSize,
                request: (url) => this._qs.queueRequest(url),
                fetchNextPage(data, pageSize) {
                    return data.parsedJSON && "following" in data.parsedJSON && data.parsedJSON.following.length == pageSize;
                },
                getItems(data) {
                    if(data.parsedJSON && "following" in data.parsedJSON) {
                        return data.parsedJSON.following;
                    }
                    else {
                        return [];
                    }
                }
            }),
            this._qs.queueRequest(baseURL + '/user/' + username)
        ]);

        if(user.ok && user.parsedJSON && user.parsedJSON.user_name !== null) {
            const usr = new User(user.parsedJSON.user_name, this._type);
            usr.image = {
                "200": cdnURL + user.parsedJSON.user_logo,
                "50": cdnURL + user.parsedJSON.user_logo_small
            };
            usr.favorites = follows.map((follow) => follow.user_name);

            const channels = await this._getChannels(usr.favorites);
            return [ usr, channels ];
        }
        else {
            throw new Error("Error getting info for Hitbox user " + username);
        }
    }
    getChannelDetails(channelname) {
        return this._qs.queueRequest(baseURL + '/media/live/' + channelname).then((data) => {
            if(data.ok && data.parsedJSON && data.parsedJSON.livestream) {
                return getChannelFromJson(data.parsedJSON.livestream[0]);
            }
            else {
                throw new Error(`Error getting details for ${this.name} channel ${channelname}`);
            }
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
                    const user = await this._list.getUserByName(data.parsedJSON.user_name);
                    user.image = {
                        "200": cdnURL + data.parsedJSON.user_logo,
                        "50": cdnURL + data.parsedJSON.user_logo_small
                    };

                    const follows = await promisedPaginationHelper({
                        url: baseURL + '/following/user?user_name=' + user.login + '&limit=' + pageSize + '&offset=',
                        pageSize,
                        request: (url) => this._qs.queueRequest(url),
                        fetchNextPage(data, pageSize) {
                            return data.parsedJSON && "following" in data.parsedJSON && data.parsedJSON.following.length == pageSize;
                        },
                        getItems(data) {
                            if(data.parsedJSON && "following" in data.parsedJSON) {
                                return data.parsedJSON.following;
                            }
                            else {
                                return [];
                            }
                        }
                    });
                    const channels = await this._getChannels(follows.map((follow) => follow.user_name)),
                        newChannels = filterExistingFavs(user, channels);
                    user.favorites = follows.map((follow) => follow.user_name);
                    return [ user, newChannels ];
                }
                return [];
            }
        };
    }
    updateRequest() {
        const getURLs = async () =>{
            const channels = await this._list.getChannels();
            return channels.map((channel) => `${baseURL}/media/live/${channel.login}`);
        };
        return {
            getURLs,
            onComplete: async (data) => {
                if(data.ok && data.parsedJSON && data.parsedJSON.livestream) {
                    return getChannelFromJson(data.parsedJSON.livestream[0]);
                }
            }
        };
    }
    async search(query) {
        const data = await this._qs.queueRequest(baseURL + "/media/live/list?" + querystring.stringify({
            publicOnly: true,
            filter: "popular",
            search: query
        }));
        if(data.ok && data.parsedJSON && data.parsedJSON.livestream && data.parsedJSON.livestream.length) {
            let chans = data.parsedJSON.livestream;
            if(await not(this._mature())) {
                chans = chans.filter((m) => m.media_mature !== "1");
            }

            return chans.map((chan) => getChannelFromJson(chan));
        }
        else {
            throw new Error(`Couldn't find any channels for the search on ${this.name} that match ${query}`);
        }
    }
}

export default Object.freeze(new Hitbox(type));
