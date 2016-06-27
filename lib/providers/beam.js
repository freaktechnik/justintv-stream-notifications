/**
 * Beam provider.
 * @author Martin Giger
 * @license MPL-2.0
 * @module providers/beam
 * @todo checkout socket based events
 */

"use strict";
import { emit } from "sdk/event/core";
import { Channel, User } from '../channel/core';
import { memoize } from "sdk/lang/functional";
import { PaginationHelper, promisedPaginationHelper } from '../pagination-helper';
import GenericProvider from "./generic-provider";

var type          = "beam",
    chatURL       = "https://beam.pro/embed/chat/",
    baseURL       = 'https://beam.pro/api/v1/',
    pageSize = 50;

const DEFAULT_AVATAR_URL = "https://beam.pro/_latest/img/media/profile.jpg";

const SIZES = [ '50', '70', '150', '300' ];
const getImageFromUserID = (id) => {
    const image = {};
    SIZES.forEach((s) => {
        image[s] = baseURL + 'users/' + id + '/avatar?w=' + s + '&h=' + s;
    });
    return image;
};

function getChannelFromJSON(jsonChannel) {
    var ret        = new Channel(jsonChannel.token, type);
    ret.live.setLive(jsonChannel.online);
    ret.title      = jsonChannel.name;
    ret.viewers    = jsonChannel.viewersCurrent;
    // this is the actual thumbnail and not just the default channel thumbnail thing.
    ret.thumbnail  = "https://thumbs.beam.pro/channel/" + jsonChannel.id + ".big.jpg";
    ret.url.push("https://beam.pro/"+jsonChannel.token);
    ret.archiveUrl = "https://beam.pro/"+jsonChannel.token;
    ret.chatUrl    = chatURL+jsonChannel.token;
    ret.mature = jsonChannel.audience === "18+";
    ret.image = getImageFromUserID(jsonChannel.user.id);
    if(jsonChannel.type !== null)
        ret.category = jsonChannel.type.name;
    return ret;
}

function getImageFromAvatars(avatars) {
    var image = {};
    if(Array.isArray(avatars) && avatars.length) {
        avatars.forEach(function(avatar) {
            /*
             * The URL given by the API doesn't work at this point. Reconstruct
             * the one used on the site.
             */
            image[avatar.meta.size.split("x")[0]] = "https://images.beam.pro/"+avatar.meta.size+"/https://uploads.beam.pro/avatar/"+avatar.relid+".jpg";
        });
    }
    else {
        image["220"] = DEFAULT_AVATAR_URL;
    }
    return image;
}

class Beam extends GenericProvider {
    constructor(type) {
        super(type);
        this.authURL = [ "https://beam.pro" ];
        this._supportsFavorites = true;
        this._supportsCredentials = true;
        this._supportsFeatured = true;
        this._getUserIdFromUsername = memoize(function(username) {
            return this._qs.queueRequest(baseURL+"users/search?query="+username).then((response) => {
                if(response.status == 200 && response.json) {
                    return response.json.find((val) => val.username == username).id;
                }
            });
        });
    }
    async getUserFavorites(username) {
        const userid = await this._getUserIdFromUsername(username);

        const user = await this._qs.queueRequest(baseURL+"users/"+userid);

        if(user.json) {
            const ch = new User(user.json.username, this._type);
            if("avatars" in user.json)
                ch.image = getImageFromAvatars(user.json.avatars);
            else
                ch.image = getImageFromUserID(user.json.id);

            let subscriptions = await promisedPaginationHelper({
                url: baseURL+"users/"+userid+"/follows?limit="+pageSize+"&page=",
                pageSize: pageSize,
                initialPage: 0,
                request: (url) => this._qs.queueRequest(url),
                getPageNumber: function(page) {
                    return ++page;
                },
                fetchNextPage: function(data, pageSize) {
                    return data.json && data.json.length == pageSize;
                },
                getItems: function(data) {
                    return data.json || [];
                }
            });

            ch.favorites = subscriptions.map(function(sub) {
                return sub.token;
            });

            const channels = await Promise.all(subscriptions.map((sub) => this.getChannelDetails(sub.token)));

            return [ ch, channels ];
        }
        else {
            throw "Could not get favorites for user " + username + " on " + this.name;
        }
    }
    async updateFavsRequest(users) {
        const urls = await Promise.all(
            users.map((user) => this._getUserIdFromUsername(user.login)
                                .then((id) => baseURL + "users/" + id))
        );

        this._qs.queueUpdateRequest(urls, this._qs.LOW_PRIORITY, (data, url) => {
            if(data.json) {
                const ch = new User(data.json.username, this._type);
                if("avatars" in data.json)
                    ch.image = getImageFromAvatars(data.json.avatars);
                else
                    ch.image = getImageFromUserID(data.json.id);

                const oldUser = users.find((usr) => usr.login === ch.login);
                ch.id = oldUser.id;

                new PaginationHelper({
                    url: url+"/follows?limit="+pageSize+"&page=",
                    pageSize: pageSize,
                    initialPage: 0,
                    request: (url) => this._qs.queueRequest(url),
                    getPageNumber: (page) => page + 1,
                    fetchNextPage: function(data, pageSize) {
                        return data.json && data.json.length == pageSize;
                    },
                    getItems: (data) => data.json || [],
                    onComplete: (follows) => {
                        ch.favorites = follows.map((sub) => sub.token);
                        emit(this, "updateduser", ch);

                        Promise.all(follows.filter((sub) => {
                            return oldUser.favorites.every((fav) => fav !== sub.token);
                        }).map((sub) => this.getChannelDetails(sub.token)))
                        .then((channels) => {
                            emit(this, "newchannels", channels);
                            oldUser.favorites = ch.favorites;
                        });
                    }
                });
            }
        });
    }
    getChannelDetails(channelname) {
        return this._qs.queueRequest(baseURL+"channels/"+channelname).then((response) => {
            if(response.json) {
                return getChannelFromJSON(response.json);
            }
            else {
                throw "Error getting the details for the beam channel " + channelname;
            }
        });
    }
    updateRequest(channels) {
        var urls = channels.map(function(channel) { return baseURL+"channels/"+channel.login; });
        this._qs.queueUpdateRequest(urls, this._qs.HIGH_PRIORITY, (data) => {
            if(data.json) {
                var channel = getChannelFromJSON(data.json);
                emit(this, "updatedchannels", channel);
            }
        });
    }
    getFeaturedChannels() {
        return this._qs.queueRequest(baseURL+"channels?limit=8&page=0&order=online%3Adesc%2CviewersCurrent%3Adesc%2CviewersTotal%3Adesc&where=suspended.eq.0%2Conline.eq.1").then((data) => {
            if(data.json && data.json.length) {
                let chans = data.json;
                if(!this._mature)
                    chans = chans.filter((ch) => ch.audience !== "18+");

                return chans.map((chan) => getChannelFromJSON(chan));
            }
            else {
                throw "Didn't find any featured channels for "+this.name;
            }
        });
    }
    search(query) {
        return this._qs.queueRequest(baseURL+"channels?where=online.eq.1%2Ctoken.eq."+query).then((data) => {
            if(data.json && data.json.length) {
                let chans = data.json;
                if(!this._mature)
                    chans = chans.filter((ch) => ch.audience !== "18+");

                return chans.map((chan) => getChannelFromJSON(chan));
            }
            else {
                throw "No reqults for "+query+" on "+this.name;
            }
        });
    }
}

export default new Beam(type);
