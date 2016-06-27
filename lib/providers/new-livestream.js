/**
 * New livestream provider. For API reverseenigneering see Issue #99
 * @author Martin Giger
 * @license MPL-2.0
 * @module providers/new-livestream
 */

"use strict";

import { emit } from "sdk/event/core";
import { Channel, User } from "../channel/core";
import GenericProvider from "./generic-provider";
import { promisedPaginationHelper } from "../pagination-helper";

const type = "newlivestream",
      baseURL = "http://livestream.com/api/accounts/";

const getChannelFromJSON = (json) => {
    let chan = new Channel(json.short_name || json.id, type);
    chan.uname = json.full_name;
    chan.image = {
        [json.picture.width]: json.picture.url,
        "170": json.picture.small_url,
        "50": json.picture.thumb_url
    };
    chan.category = json.category_name;
    chan.archiveUrl = "http://livestream.com/"+chan.login;
    chan.chatUrl = "http://livestream.com/"+chan.login;
    return chan;
};

class NewLivestream extends GenericProvider {
    constructor(type) {
        super(type);
        this.authURL = ["http://livestream.com"];
        this._supportsFavorites = true;
    }
    async _getChannelStatus(json, channel) {
       // Checks if there are any upcoming or past events and if yes, if one is currently being broadcast.
        let event = (Array.isArray(json.upcoming_events.data) && json.upcoming_events.data.find((event) => event.broadcast_id != -1)) ||
            (Array.isArray(json.past_events.data) && json.past_events.data.find((event) => event.broadcast_id != -1));

        if(event) {
            channel.title = event.full_name;
            channel.viewers = event.viewer_count;
            channel.url.push("http://livestream.com/"+channel.login+"/events/"+event.id);
            const info = await this._qs.queueRequest(baseURL+json.id+"/events/"+event.id+"/stream_info");

            if(info.json && !("message" in info.json)) {
                channel.live.setLive(info.json.is_live);
                channel.thumbnail = info.json.thumbnail_url;
            }
        }
        return channel;
    }
    async getUserFavorites(username) {
        const user = await this._qs.queueRequest(baseURL+username);

        if(user.json && "id" in user.json) {
            const usr = new User(user.json.short_name || user.json.id, this._type);
            usr.uname = user.json.full_name;
            usr.image = {
                [user.json.picture.width]: user.json.picture.url,
                "170": user.json.picture.small_url,
                "50": user.json.picture.thumb_url
            };
            let follows = await promisedPaginationHelper({
                url: baseURL+user.json.id+"/following?maxItems=50&page=",
                pageSize: 50,
                request: (url) => {
                    return this._qs.queueRequest(url);
                },
                fetchNextPage: function(data, pageSize) {
                    return data.json && data.json.total > this.result.length;
                },
                getItems: function(data) {
                    if(data.json && "data" in data.json) {
                        return data.json.data;
                    }
                    else {
                        return [];
                    }
                },
                getPageNumber: function(page) {
                    return page+1;
                }
            });

            const channels = follows.map((follow) => getChannelFromJSON(follow));

            usr.favorites = channels.map((channel) => channel.login);
            return [ usr, channels ];
        }
        else {
            throw "Couldn't get favorites for the channel " +username+ " on " + this.name;
        }
    }
    getChannelDetails(channelname) {
        return this._qs.queueRequest(baseURL+channelname).then((data) => {
            if(data.json && "id" in data.json) {
                return getChannelFromJSON(data.json);
            }
            else {
                throw "Couldn't get details for the " + this.name + " channel "+channelname;
            }
        });
    }
    updateFavsRequest(users) {
        let urls = users.map((user) => baseURL+user.login);
        this._qs.queueUpdateRequest(urls, this._qs.LOW_PRIORITY, (user) => {
            if(user.json && "id" in user.json) {
                let usr = users.find((u) => u.login == user.json.id || u.login == user.json.short_name);
                usr.uname = user.json.full_name;
                usr.image = {
                    [user.json.picture.width]: user.json.picture.url,
                    "170": user.json.picture.small_url,
                    "50": user.json.picture.thumb_url
                };
                promisedPaginationHelper({
                    url: baseURL+user.json.id+"/following?maxItems=50&page=",
                    pageSize: 50,
                    request: (url) => {
                        return this._qs.queueRequest(url);
                    },
                    fetchNextPage: function(data, pageSize) {
                        return data.json && data.json.total > this.result.length;
                    },
                    getItems: function(data) {
                        if(data.json && "data" in data.json) {
                            return data.json.data;
                        }
                        else {
                            return [];
                        }
                    },
                    getPageNumber: function(page) {
                        return page+1;
                    }
                }).then((follows) => {
                    let channels = follows.map((follow) => getChannelFromJSON(follow));
                    let newChannels = channels.filter((channel) => usr.favorites.some((ch) => ch.login == channel.login));
                    if(newChannels.length > 0)
                        usr.favorites = channels.map((channel) => channel.login);
                    emit(this, "updateduser", usr);
                    emit(this, "newchannels", newChannels);
                });
            }
        });
    }
    updateRequest(channels) {
        let urls = channels.map((channel) => baseURL+channel.login);
        this._qs.queueUpdateRequest(urls, this._qs.HIGH_PRIORITY, (data) => {
            if(data.json && "id" in data.json) {
                let channel = getChannelFromJSON(data.json);

                this._getChannelStatus(data.json, channel).then((channel) =>{
                    emit(this, "updatedchannels", channel);
                });
            }
        });
    }
    async updateChannel(channelname) {
        let data = await this._qs.queueRequest(baseURL+channelname);

        if(data.json && "id" in data.json) {
            let channel = getChannelFromJSON(data.json);

            return this._getChannelStatus(data.json, channel);
        }
        else {
            throw "Couldn't get details for the new livestream channel "+channelname;
        }
    }
}

export default new NewLivestream(type);
