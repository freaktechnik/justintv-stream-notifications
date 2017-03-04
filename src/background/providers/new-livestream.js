/**
 * New livestream provider. For API reverseenigneering see Issue #99
 * @author Martin Giger
 * @license MPL-2.0
 * @module providers/new-livestream
 */
import { emit } from "../../utils";
import { Channel, User } from "../channel/core";
import GenericProvider from "./generic-provider";
import { promisedPaginationHelper } from "../pagination-helper";

const type = "newlivestream",
    baseURL = "http://livestream.com/api/accounts/",
    getChannelFromJSON = (json) => {
        const chan = new Channel(json.short_name || json.id, type);
        chan.uname = json.full_name;
        chan.image = {
            [json.picture.width]: json.picture.url,
            "170": json.picture.small_url,
            "50": json.picture.thumb_url
        };
        chan.category = json.category_name;
        chan.archiveUrl = "http://livestream.com/" + chan.login;
        chan.chatUrl = "http://livestream.com/" + chan.login;
        return chan;
    };

class NewLivestream extends GenericProvider {
    authURL = [ "http://livestream.com" ];
    _supportsFavorites = true;

    async _getChannelStatus(json, channel) {
       // Checks if there are any upcoming or past events and if yes, if one is currently being broadcast.
        const event = (Array.isArray(json.upcoming_events.data) && json.upcoming_events.data.find((event) => event.broadcast_id != -1)) ||
            (Array.isArray(json.past_events.data) && json.past_events.data.find((event) => event.broadcast_id != -1));

        if(event) {
            channel.title = event.full_name;
            channel.viewers = event.viewer_count;
            channel.url.push("http://livestream.com/" + channel.login + "/events/" + event.id);
            const info = await this._qs.queueRequest(baseURL + json.id + "/events/" + event.id + "/stream_info");

            if(info.parsedJSON && !("message" in info.parsedJSON)) {
                channel.live.setLive(info.parsedJSON.is_live);
                channel.thumbnail = info.parsedJSON.thumbnail_url;
            }
        }
        return channel;
    }
    async getUserFavorites(username) {
        const user = await this._qs.queueRequest(baseURL + username);

        if(user.parsedJSON && "id" in user.parsedJSON) {
            const usr = new User(user.parsedJSON.short_name || user.parsedJSON.id, this._type);
            usr.uname = user.parsedJSON.full_name;
            usr.image = {
                [user.parsedJSON.picture.width]: user.parsedJSON.picture.url,
                "170": user.parsedJSON.picture.small_url,
                "50": user.parsedJSON.picture.thumb_url
            };
            const follows = await promisedPaginationHelper({
                    url: baseURL + user.parsedJSON.id + "/following?maxItems=50&page=",
                    pageSize: 50,
                    request: (url) => {
                        return this._qs.queueRequest(url);
                    },
                    fetchNextPage(data) {
                        return data.parsedJSON && data.parsedJSON.total > this.result.length;
                    },
                    getItems(data) {
                        if(data.parsedJSON && "data" in data.parsedJSON) {
                            return data.parsedJSON.data;
                        }
                        else {
                            return [];
                        }
                    },
                    getPageNumber(page) {
                        return page + 1;
                    }
                }),
                channels = follows.map((follow) => getChannelFromJSON(follow));

            usr.favorites = channels.map((channel) => channel.login);
            return [ usr, channels ];
        }
        else {
            throw new Error(`Couldn't get favorites for the channel ${username} on ${this.name}`);
        }
    }
    getChannelDetails(channelname) {
        return this._qs.queueRequest(baseURL + channelname).then((data) => {
            if(data.parsedJSON && "id" in data.parsedJSON) {
                return getChannelFromJSON(data.parsedJSON);
            }
            else {
                throw new Error(`Couldn't get details for the ${this.name} channel ${channelname}`);
            }
        });
    }
    updateFavsRequest(users) {
        const urls = users.map((user) => baseURL + user.login);
        this._qs.queueUpdateRequest(urls, this._qs.LOW_PRIORITY, (user) => {
            if(user.parsedJSON && "id" in user.parsedJSON) {
                const usr = users.find((u) => u.login == user.parsedJSON.id || u.login == user.parsedJSON.short_name);
                usr.uname = user.parsedJSON.full_name;
                usr.image = {
                    [user.parsedJSON.picture.width]: user.parsedJSON.picture.url,
                    "170": user.parsedJSON.picture.small_url,
                    "50": user.parsedJSON.picture.thumb_url
                };
                promisedPaginationHelper({
                    url: baseURL + user.parsedJSON.id + "/following?maxItems=50&page=",
                    pageSize: 50,
                    request: (url) => {
                        return this._qs.queueRequest(url);
                    },
                    fetchNextPage(data) {
                        return data.parsedJSON && data.parsedJSON.total > this.result.length;
                    },
                    getItems(data) {
                        if(data.parsedJSON && "data" in data.parsedJSON) {
                            return data.parsedJSON.data;
                        }
                        else {
                            return [];
                        }
                    },
                    getPageNumber(page) {
                        return page + 1;
                    }
                }).then((follows) => {
                    const channels = follows.map((follow) => getChannelFromJSON(follow)),
                        newChannels = channels.filter((channel) => usr.favorites.some((ch) => ch.login == channel.login));
                    if(newChannels.length > 0) {
                        usr.favorites = channels.map((channel) => channel.login);
                    }
                    emit(this, "updateduser", usr);
                    emit(this, "newchannels", newChannels);
                });
            }
        });
    }
    updateRequest(channels) {
        const urls = channels.map((channel) => baseURL + channel.login);
        this._qs.queueUpdateRequest(urls, this._qs.HIGH_PRIORITY, (data) => {
            if(data.parsedJSON && "id" in data.parsedJSON) {
                const channel = getChannelFromJSON(data.parsedJSON);

                this._getChannelStatus(data.parsedJSON, channel).then((channel) =>{
                    emit(this, "updatedchannels", channel);
                });
            }
        });
    }
    async updateChannel(channelname) {
        const data = await this._qs.queueRequest(baseURL + channelname);

        if(data.parsedJSON && "id" in data.parsedJSON) {
            const channel = getChannelFromJSON(data.parsedJSON);

            return this._getChannelStatus(data.parsedJSON, channel);
        }
        else {
            throw new Error("Couldn't get details for the new livestream channel " + channelname);
        }
    }
}

export default Object.freeze(new NewLivestream(type));
