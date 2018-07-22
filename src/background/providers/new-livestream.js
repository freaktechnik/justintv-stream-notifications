/**
 * New livestream provider. For API reverseenigneering see Issue #99
 * @author Martin Giger
 * @license MPL-2.0
 * @module providers/new-livestream
 */
import {
    Channel, User
} from "../channel/core.js";
import GenericProvider from "./generic-provider.js";
import { promisedPaginationHelper } from "../pagination-helper.js";

const type = "newlivestream",
    baseURL = "https://livestream.com/api/accounts/",
    getChannelFromJSON = (json) => {
        const chan = new Channel(json.short_name || json.id, type);
        chan.uname = json.full_name;
        chan.image = {
            [json.picture.width]: json.picture.url,
            "170": json.picture.small_url,
            "50": json.picture.thumb_url
        };
        chan.category = json.category_name;
        chan.archiveUrl = `https://livestream.com/${chan.login}`;
        chan.chatUrl = `https://livestream.com/${chan.login}`;
        return chan;
    },
    NO_BROADCAST = -1;

class NewLivestream extends GenericProvider {
    constructor(type) {
        super(type);

        this.authURL = [ "https://livestream.com" ];
        this._supportsFavorites = true;

        this.initialize();
    }

    async getUserFavorites(username) {
        const user = await this._qs.queueRequest(baseURL + username);

        if(user.parsedJSON && "id" in user.parsedJSON) {
            const usr = new User(user.parsedJSON.short_name || user.parsedJSON.id, this._type),
                follows = await promisedPaginationHelper({
                    url: `${baseURL}${user.parsedJSON.id}/following?maxItems=50&page=`,
                    pageSize: 50,
                    request: (url) => this._qs.queueRequest(url),
                    fetchNextPage(data) {
                        return data.parsedJSON && data.parsedJSON.total > this.result.length;
                    },
                    getItems(data) {
                        if(data.parsedJSON && "data" in data.parsedJSON) {
                            return data.parsedJSON.data;
                        }

                        return [];
                    },
                    getPageNumber(page) {
                        return ++page;
                    }
                }),
                channels = follows.map((follow) => getChannelFromJSON(follow));

            usr.uname = user.parsedJSON.full_name;
            usr.image = {
                [user.parsedJSON.picture.width]: user.parsedJSON.picture.url,
                "170": user.parsedJSON.picture.small_url,
                "50": user.parsedJSON.picture.thumb_url
            };
            usr.favorites = channels.map((channel) => channel.login);
            return [
                usr,
                channels
            ];
        }

        throw new Error(`Couldn't get favorites for the channel ${username} on ${this.name}`);
    }
    getChannelDetails(channelname) {
        return this._qs.queueRequest(baseURL + channelname).then((data) => {
            if(data.parsedJSON && "id" in data.parsedJSON) {
                return getChannelFromJSON(data.parsedJSON);
            }

            throw new Error(`Couldn't get details for the ${this.name} channel ${channelname}`);
        });
    }
    updateFavsRequest() {
        const getURLs = async () => {
            const users = await this._list.getUsers();
            return users.map((user) => baseURL + user.login);
        };
        return {
            getURLs,
            onComplete: async (user) => {
                if(user.parsedJSON && "id" in user.parsedJSON) {
                    const usr = await this._list.getUserByName(user.parsedJSON.short_name || user.parsedJSON.id),
                        follows = await promisedPaginationHelper({
                            url: `${baseURL}${user.parsedJSON.id}/following?maxItems=50&page=`,
                            pageSize: 50,
                            request: (url) => this._qs.queueRequest(url),
                            fetchNextPage(data) {
                                return data.parsedJSON && data.parsedJSON.total > this.result.length;
                            },
                            getItems(data) {
                                if(data.parsedJSON && "data" in data.parsedJSON) {
                                    return data.parsedJSON.data;
                                }

                                return [];
                            },
                            getPageNumber(page) {
                                return ++page;
                            }
                        }),
                        channels = follows.map((follow) => getChannelFromJSON(follow)),
                        newChannels = channels.filter((channel) => !usr.favorites.includes(channel.login));

                    usr.uname = user.parsedJSON.full_name;
                    usr.image = {
                        [user.parsedJSON.picture.width]: user.parsedJSON.picture.url,
                        "170": user.parsedJSON.picture.small_url,
                        "50": user.parsedJSON.picture.thumb_url
                    };
                    if(newChannels.length) {
                        usr.favorites = channels.map((channel) => channel.login);
                    }
                    return [
                        usr,
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
            return channels.map((channel) => baseURL + channel.login);
        };
        return {
            getURLs,
            onComplete: async (data) => {
                if(data.parsedJSON && "id" in data.parsedJSON) {
                    const channel = getChannelFromJSON(data.parsedJSON);

                    return this._getChannelStatus(data.parsedJSON, channel);
                }
            }
        };
    }
    async updateChannel(channelname) {
        const data = await this._qs.queueRequest(baseURL + channelname);

        if(data.parsedJSON && "id" in data.parsedJSON) {
            const channel = getChannelFromJSON(data.parsedJSON);

            return this._getChannelStatus(data.parsedJSON, channel);
        }

        throw new Error(`Couldn't get details for the new livestream channel ${channelname}`);
    }

    async _getChannelStatus(json, channel) {
        // Checks if there are any upcoming or past events and if yes, if one is currently being broadcast.
        const event = (Array.isArray(json.upcoming_events.data) && json.upcoming_events.data.find((e) => e.broadcast_id != NO_BROADCAST)) ||
            (Array.isArray(json.past_events.data) && json.past_events.data.find((e) => e.broadcast_id != NO_BROADCAST));

        if(event) {
            channel.title = event.full_name;
            channel.viewers = event.viewer_count;
            channel.url.push(`https://livestream.com/${channel.login}/events/${event.id}`);
            const info = await this._qs.queueRequest(`${baseURL + json.id}/events/${event.id}/stream_info`);

            if(info.parsedJSON && !("message" in info.parsedJSON)) {
                channel.live.setLive(info.parsedJSON.is_live);
                channel.thumbnail = info.parsedJSON.thumbnail_url;
            }
            channel.live.created = Date.parse(event.start_time);
        }
        return channel;
    }
}

export default Object.freeze(new NewLivestream(type));
