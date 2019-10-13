/**
 * Dailymotion provider.
 *
 * @author Martin Giger
 * @license MPL-2.0
 * @module providers/dailymotion
 */
import GenericProvider from "./generic-provider.js";
import {
    Channel, User
} from "../channel/core.js";
import { promisedPaginationHelper } from "../pagination-helper.js";
import qs from "../querystring.js";
import { filterExistingFavs } from '../channel/utils.js';

const type = "dailymotion",
    baseUrl = "https://api.dailymotion.com/",
    AVATAR_SIZES = [ /* eslint-disable no-magic-numbers */
        25,
        60,
        80,
        120,
        190,
        240,
        360,
        480,
        720
    ], /* eslint-enable no-magic-numbers */
    USER_FIELDS = `screenname,url,id,${AVATAR_SIZES.map((s) => `avatar_${s}_url`).join(",")}`,
    getChannelFromJSON = (json, doUser = false) => {
        let ch;
        if(doUser) {
            ch = new User(json.id, type);
        }
        else {
            ch = new Channel(json.id, type);
            ch.url.push(json.url);
            ch.archiveUrl = json.url;
        }
        ch.uname = json.screenname;
        ch.image = AVATAR_SIZES.reduce((p, c) => {
            p[c] = json[`avatar_${c}_url`];
            return p;
        }, {});
        ch.language = json.language;

        return ch;
    };

class Dailymotion extends GenericProvider {
    constructor(type) {
        super(type);

        this._supportsFavorites = true;
        this._supportsFeatured = true;

        this.initialize();
    }

    async getUserFavorites(username) {
        const user = await this.getChannelDetails(username, true),
            channels = await this._getFavs(user.login);
        user.favorites = channels.map((ch) => ch.login);

        return [
            user,
            channels
        ];
    }
    getChannelDetails(username, doUser = false) {
        return this._qs.queueRequest(`${baseUrl}users?${qs.stringify({
            usernames: username,
            fields: USER_FIELDS
        })}`, {}).then((result) => {
            if(result.ok && result.parsedJSON && result.parsedJSON.list && result.parsedJSON.list.length) {
                const [ channel ] = result.parsedJSON.list;
                return getChannelFromJSON(channel, doUser);
            }

            return this._getChannelByID(username, doUser);
        });
    }
    updateFavsRequest() {
        return {
            getURLs: async () => {
                const users = await this._list.getUsers();
                if(!users.length) {
                    return users;
                }
                const ids = users.map((ch) => ch.login).join(","),
                    params = qs.stringify({
                        ids,
                        fields: USER_FIELDS,
                        limit: 100
                    });
                return [ `${baseUrl}users?${params}` ];
            },
            onComplete: async (firstPage, url) => {
                if(firstPage.ok && firstPage.parsedJSON && firstPage.parsedJSON.list) {
                    const fetchNextPage = (data) => data.parsedJSON && data.parsedJSON.has_more,
                        users = [],
                        channels = [];
                    let data = firstPage.parsedJSON.list;
                    if(fetchNextPage(firstPage)) {
                        const otherPages = await promisedPaginationHelper({
                            url: `${url}&page=`,
                            initialPage: 2,
                            pageSize: 1,
                            request: (pageURL) => this._qs.queueRequest(pageURL),
                            fetchNextPage,
                            getItems(pageData) {
                                if(pageData.ok && pageData.parsedJSON && pageData.parsedJSON.list) {
                                    return pageData.parsedJSON.list;
                                }

                                return [];
                            }
                        });
                        data = data.concat(otherPages);
                    }
                    data = data.map((d) => getChannelFromJSON(d, true));

                    await Promise.all(data.map(async (user) => {
                        const [
                            oldUser,
                            favChannels
                        ] = await Promise.all([
                            this._list.getUserByName(user.login),
                            this._getFavs(user.login)
                        ]);
                        user.favorites = favChannels.map((ch) => ch.login); // eslint-disable-line require-atomic-updates
                        users.push(user);

                        channels.push(...filterExistingFavs(oldUser, favChannels));
                    }));
                    return [
                        users,
                        channels
                    ];
                }
                return [];
            }
        };
    }
    updateRequest() {
        return {
            getURLs: async () => {
                const channels = await this._list.getChannels();
                if(!channels.length) {
                    return channels;
                }
                const ids = channels.map((ch) => ch.login).join(","),
                    props = qs.stringify({
                        ids,
                        fields: USER_FIELDS,
                        limit: 100
                    });
                return [ `${baseUrl}users?${props}` ];
            },
            onComplete: async (result, url) => {
                if(result.ok && result.parsedJSON && result.parsedJSON.list) {
                    const fetchNextPage = (data) => data.parsedJSON && data.parsedJSON.has_more;
                    let channels = result.parsedJSON.list;
                    if(fetchNextPage(result)) {
                        const otherChannels = await promisedPaginationHelper({
                            url: `${url}&page=`,
                            initialPage: 2,
                            pageSize: 1,
                            request: (pageURL) => this._qs.queueRequest(pageURL),
                            fetchNextPage,
                            getItems(data) {
                                if(data.ok && data.parsedJSON && data.parsedJSON.list) {
                                    return data.parsedJSON.list;
                                }

                                return [];
                            }
                        });
                        channels = channels.concat(otherChannels);
                    }
                    channels = channels.map((v) => getChannelFromJSON(v));

                    return Promise.all(channels.map((ch) => this._getStreamDetailsForChannel(ch)));
                }
            }
        };
    }
    updateChannel(username) {
        return this._getChannelByID(username).then((channel) => this._getStreamDetailsForChannel(channel));
    }
    async updateChannels(channels) {
        const response = await promisedPaginationHelper({
            url: `${baseUrl}users?${qs.stringify({
                ids: channels.map((ch) => ch.login).join(","),
                fields: USER_FIELDS,
                limit: 100
            })}&page=`,
            pageSize: 1,
            initialPage: 1,
            request: (url) => this._qs.queueRequest(url),
            fetchNextPage(data) {
                return data.parsedJSON && data.parsedJSON.has_more;
            },
            getItems(data) {
                if(data.parsedJSON && data.parsedJSON.list) {
                    return data.parsedJSON.list;
                }

                return [];
            }
        });

        return Promise.all(response.map((ch) => this._getStreamDetailsForChannel(getChannelFromJSON(ch))));
    }
    search(query) {
        const q = {
            fields: `owner.id,owner.screenname,owner.url,chat_embed_url,title,url,channel.name,thumbnail_240_url,${AVATAR_SIZES.map((s) => `owner.avatar_${s}_url`).join(",")},live_airing_time`,
            sort: "live-audience",
            "live_onair": 1
        };
        if(query) {
            q.search = query;
        }
        return this._qs.queueRequest(`${baseUrl}videos?${qs.stringify(q)}`).then((data) => {
            if(data.ok && data.parsedJSON && data.parsedJSON.list && data.parsedJSON.list.length) {
                return data.parsedJSON.list.map((json) => {
                    const ch = new Channel(json['owner.id'], this._type);
                    ch.live.setLive(true);
                    ch.title = json.title;
                    ch.uname = json['owner.screenname'];
                    ch.url.push(json.url, json['owner.url']);
                    ch.archiveUrl = json['owner.url'];
                    ch.chatUrl = json.chat_embed_url;
                    ch.category = json['channel.name'];
                    ch.thumbnail = json.thumbnail_240_url;
                    ch.image = AVATAR_SIZES.reduce((p, s) => {
                        p[s] = json[`owner.avatar_${s}_url`];
                        return p;
                    }, {});
                    ch.live.created = Date.parse(json.live_airing_time);

                    return ch;
                });
            }

            throw new Error(`Didn't find any search results channels with ${query} for ${this._type}`);
        });
    }

    _getChannelByID(id, doUser = false) {
        return this._qs.queueRequest(`${baseUrl}user/${id}?${qs.stringify({
            fields: USER_FIELDS
        })}`).then((result) => {
            if(result.ok && result.parsedJSON) {
                if("list" in result.parsedJSON) {
                    const [ channel ] = result.parsedJSON.list;
                    return getChannelFromJSON(channel, doUser);
                }

                return getChannelFromJSON(result.parsedJSON, doUser);
            }

            throw new Error(`Could not get details for ${id} on ${this._type}`);
        });
    }

    _getStreamDetailsForChannel(channel) {
        return this._qs.queueRequest(`${baseUrl}user/${channel.login}/videos?${qs.stringify({
            id: channel.login,
            fields: "chat_embed_url,title,url,channel.name,onair,thumbnail_240_url,live_airing_time",
            sort: "live-audience",
            limit: 1
        })}`).then((response) => {
            if(response.ok && response.parsedJSON) {
                if(response.parsedJSON.list.length) {
                    const [ item ] = response.parsedJSON.list;
                    channel.chatUrl = item.chat_embed_url;
                    channel.thumbnail = item.thumbnail_url;
                    channel.url = [ item.url ];
                    channel.category = item['channel.name'];
                    channel.live.setLive(item.onair);
                    channel.live.created = Date.parse(item.live_airing_time);
                    channel.title = item.title;
                }
                else {
                    channel.live.setLive(false);
                }
                return channel;
            }

            throw new Error(`Could not update ${channel.login} on ${this._type}`);
        });
    }

    _getFavs(userId) {
        return promisedPaginationHelper({
            url: `${baseUrl}user/${userId}/following?${qs.stringify({
                fields: USER_FIELDS,
                limit: 100
            })}&page=`,
            pageSize: 1,
            initialPage: 1,
            request: (url) => this._qs.queueRequest(url),
            fetchNextPage(data) {
                return data.json && data.parsedJSON.has_more;
            },
            getItems(data) {
                if(data.ok && data.parsedJSON && data.parsedJSON.list) {
                    return data.parsedJSON.list.map(getChannelFromJSON);
                }

                return [];
            }
        });
    }
}

export default Object.freeze(new Dailymotion(type));
