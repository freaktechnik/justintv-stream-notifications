/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 *
 * Hitbox provider
 */

"use strict";
import { emit } from "sdk/event/core";
import { Channel, User } from '../channel/core';
import GenericProvider from "./generic-provider";
import { promisedPaginationHelper } from "../pagination-helper";
import querystring from "sdk/querystring";

var type = "hitbox",
    archiveURL = "/videos",
    chatURL = "http://hitbox.tv/embedchat/",
    pageSize = 100,
    baseURL = "http://api.hitbox.tv",
    cdnURL = "http://edge.sf.hitbox.tv";

function getChannelFromJson(json) {
    var cho = new Channel(json.channel.user_name, type);
    cho.uname = json.media_display_name;
    cho.url.push(json.channel.channel_link);
    cho.archiveUrl = json.channel.channel_link + archiveURL;
    cho.chatUrl = chatURL + json.channel.user_name;
    cho.image = { "200": cdnURL+json.channel.user_logo,
                  "50": cdnURL+json.channel.user_logo_small };
    cho.title = json.media_status;
    cho.category = json.category_name;
    cho.viewers = json.media_views;
    cho.thumbnail = cdnURL+json.media_thumbnail;
    cho.live.setLive(json.media_is_live != "0");
    cho.mature = json.media_mature === "1";
    return cho;
}

class Hitbox extends GenericProvider {
    constructor(type) {
        super(type);

        this.authURL = ["http://www.hitbox.tv"];
        this._supportsFavorites = true;
        this._supportsCredentials = true;
        this._supportsFeatured = true;
    }
    _getChannels(channels) {
        return Promise.all(channels.map((channel) => {
            return this._qs.queueRequest(baseURL+'/media/live/'+channel).then((data) => {
                if(data.status == 200 && data.json && "livestream" in data.json)
                    return getChannelFromJson(data.json.livestream[0]);
                else
                    return null;
            });
        })).then((channels) => channels.filter((channel) => channel !== null));
    }
    async getUserFavorites(username) {
        let [follows, user] = await Promise.all([
            promisedPaginationHelper({
                url: baseURL+'/following/user?user_name='+username+'&limit='+pageSize+'&offset=',
                pageSize: pageSize,
                request: (url) => this._qs.queueRequest(url),
                fetchNextPage: function(data, pageSize) {
                    return data.json && "following" in data.json && data.json.following.length == pageSize;
                },
                getItems: function(data) {
                    if(data.json && "following" in data.json)
                        return data.json.following;
                    else
                        return [];
                }
            }),
            this._qs.queueRequest(baseURL+'/user/'+username)
        ]);

        if(user.status == 200 && user.json && user.json.user_name !== null) {
            let usr = new User(user.json.user_name, this._type);
            usr.image = {
                "200": cdnURL + user.json.user_logo,
                "50": cdnURL + user.json.user_logo_small
            };
            usr.favorites = follows.map((follow) => follow.user_name);

            let channels = await this._getChannels(usr.favorites);
            return [ usr, channels ];
        }
        else {
            throw "Error getting info for Hitbox user "+username;
        }
    }
    getChannelDetails(channelname) {
        return this._qs.queueRequest(baseURL+'/media/live/'+channelname).then(function(data) {
            if(data.status == 200 && data.json && data.json.livestream )
                return getChannelFromJson(data.json.livestream[0]);
            else
                throw "Error getting details for Hitbox channel " + channelname;
        });
    }
    updateFavsRequest(users) {
        let urls = users.map((user) => baseURL + '/user/' + user.login);
        this._qs.queueUpdateRequest(urls, this._qs.LOW_PRIORITY, (data) => {
            if(data.status == 200 && data.json) {
                let user = users.find((user) => user.login == data.json.user_name);
                user.image = {
                    "200": cdnURL + data.json.user_logo,
                    "50": cdnURL + data.json.user_logo_small
                };

                promisedPaginationHelper({
                    url: baseURL+'/following/user?user_name='+user.login+'&limit='+pageSize+'&offset=',
                    pageSize: pageSize,
                    request: (url) => this._qs.queueRequest(url),
                    fetchNextPage: function(data, pageSize) {
                        return data.json && "following" in data.json && data.json.following.length == pageSize;
                    },
                    getItems: function(data) {
                        if(data.json && "following" in data.json)
                            return data.json.following;
                        else
                            return [];
                    }
                }).then((follows) => {
                    let newChannels = follows.filter((follow) => user.favorites.every((fav) => fav != follow.user_name));
                    user.favorites = follows.map((follow) => follow.user_name);
                    emit(this, "updateduser", user);
                    return this._getChannels(user.favorites);
                }).then((channels) => {
                    emit(this, "newchannels", channels);
                });
            }
        });
    }
    updateRequest(channels) {
        var urls = channels.map((channel) => { return baseURL+'/media/live/'+channel.login; });
        this._qs.queueUpdateRequest(urls, this._qs.HIGH_PRIORITY, (data) => {
            if(data.status == 200 && data.json && data.json.livestream)
                emit(this, "updatedchannels", getChannelFromJson(data.json.livestream[0]));
        });
    }
    search(query) {
        return this._qs.queueRequest(baseURL+"/media/live/list?" + querystring.stringify({
            publicOnly: true,
            filter: "popular",
            search: query
        })).then((data) => {
            if(data.status == 200 && data.json && data.json.livestream && data.json.livestream.length) {
                let chans = data.json.livestream;
                if(!this._mature)
                    chans = chans.filter((m) => m.media_mature !== "1");

                return chans.map((chan) => getChannelFromJson(chan));
            }
            else {
                throw "Couldn't find any channels for the search on "+this.name+" that match "+query;
            }
        });
    }
}

export default Object.freeze(new Hitbox(type));
