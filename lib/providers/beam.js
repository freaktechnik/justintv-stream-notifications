/**
 * Beam provider.
 * @author Martin Giger
 * @license MPL-2.0
 * @module providers/beam
 * @todo checkout socket based events
 */

"use strict";
const { Class: newClass } = require("sdk/core/heritage");
const { emit } = require("sdk/event/core");
var { Channel, User }    = require('../channel/core');
let { all } = require("sdk/core/promise");
let { Task: { async } } = require("resource://gre/modules/Task.jsm");

var type          = "beam",
    chatURL       = "https://beam.pro/embed/chat/",
    baseURL       = 'https://beam.pro/api/v1/',
    pageSize = 50;

const DEFAULT_AVATAR_URL = "https://beam.pro/_latest/img/media/profile.jpg";

var { PaginationHelper, promisedPaginationHelper } = require('../pagination-helper');
const { GenericProvider } = require("./generic-provider");

function getChannelFromJSON(jsonChannel) {
    var ret        = new Channel();
    ret.uname      = jsonChannel.token;
    ret.login      = jsonChannel.token;
    ret.type       = type;
    ret.live       = jsonChannel.online;
    ret.title      = jsonChannel.name;
    ret.viewers    = jsonChannel.viewersCurrent;
    // this is the actual thumbnail and not just the default channel thumbnail thing.
    ret.thumbnail  = "https://thumbs.beam.pro/channel/" + jsonChannel.id + ".big.jpg";
    ret.url.push("https://beam.pro/"+jsonChannel.token);
    ret.archiveUrl = "https://beam.pro/"+jsonChannel.token;
    ret.chatUrl    = chatURL+jsonChannel.token;
    ret.mature = jsonChannel.audience === "18+";
    if(jsonChannel.type !== null)
        ret.category = jsonChannel.type.name;
    return ret;
}

function getImageFromAvatars(avatars) {
    var image = {};
    if(avatars.length) {
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

const Beam = newClass({
    extends: GenericProvider,
    authURL: [ "https://beam.pro" ],
    _supportsFavorites: true,
    _supportsCredentials: true,
    _supportsFeatured: true,
    _getUserIdFromUsername: function(username) {
        return this._qs.queueRequest(baseURL+"users/search?query="+username).then((response) => {
            if(response.status == 200 && response.json) {
                return response.json.find((val) => val.username == username).id;
            }
        });
    },
    getUserFavorites: async(function*(username) {
        let userid = yield this._getUserIdFromUsername(username);

        let user = yield this._qs.queueRequest(baseURL+"users/"+userid);

        if(user.json) {
            var ch = new User();
            ch.uname = user.json.username;
            ch.login = user.json.username; //Set this to the ID, so we have that when updating?
            ch.image = getImageFromAvatars(user.json.avatars);
            ch.type  = this._type;

            let subscriptions = yield promisedPaginationHelper({
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

            let channels = yield all(subscriptions.map((sub) => this.getChannelDetails(sub.token)));

            return [ ch, channels ];
        }
        else {
            throw "Could not get favorites for user " + username + " on " + this.name;
        }
    }),
    updateFavsRequest: async(function*(users) {
        let urls = yield all(
            users.map((user) => this._getUserIdFromUsername(user.login)
                                .then((id) => baseURL + "users/" + id))
        );

        this._qs.queueUpdateRequest(urls, this._qs.LOW_PRIORITY, (data, url) => {
            if(data.json) {
                var ch = new User();
                ch.uname = data.json.username;
                ch.login = data.json.username; //Set this to the ID, so we have that when updating?
                ch.image = getImageFromAvatars(data.json.avatars);
                ch.type  = this._type;

                let oldUser = users.find((usr) => usr.login === ch.login);
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

                        all(follows.filter((sub) => {
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
    }),
    getChannelDetails: async(function*(channelname) {
        let response = yield this._qs.queueRequest(baseURL+"channels/"+channelname);
        if(response.json) {
            var channel = getChannelFromJSON(response.json);
            let resp = yield this._qs.queueRequest(baseURL+"users/"+response.json.user.id);
            if(resp.json)
                channel.image = getImageFromAvatars(resp.json.avatars);
            else
                channel.image = getImageFromAvatars([]);
            return channel;
        }
        else {
            throw "Error getting the details for the beam channel " + channelname;
        }
    }),
    updateRequest: function(channels) {
        var urls = channels.map(function(channel) { return baseURL+"channels/"+channel.login; });
        this._qs.queueUpdateRequest(urls, this._qs.HIGH_PRIORITY, (data) => {
            if(data.json) {
                var channel = getChannelFromJSON(data.json);
                this._qs.queueRequest(baseURL+"users/"+data.json.user.id).then((resp) => {
                    if(resp.json)
                        channel.image = getImageFromAvatars(resp.json.avatars);
                    else
                        channel.image = getImageFromAvatars([]);
                    emit(this, "updatedchannels", channel);
                });
            }
        });
    },
    getFeaturedChannels() {
        return this._qs.queueRequest(baseURL+"channels?limit=8&page=0&order=online%3Adesc%2CviewersCurrent%3Adesc%2CviewersTotal%3Adesc&where=suspended.eq.0%2Conline.eq.1").then((data) => {
            if(data.json && data.json.length) {
                let chans = data.json;
                if(!this._mature)
                    chans = chans.filter((ch) => ch.audience !== "18+");

                return Promise.all(chans.map((chan) => {
                    let ch = getChannelFromJSON(chan);
                    return this._qs.queueRequest(baseURL+"users/"+chan.user.id).then((resp) => {
                        if(resp.json)
                            ch.image = getImageFromAvatars(resp.json.avatars);
                        else
                            ch.image = getImageFromAvatars([]);
                        return ch;
                    });
                }));
            }
            else {
                throw "Didn't find any featured channels for "+this.name;
            }
        });
    },
    search(query) {
        return this._qs.queueRequest(baseURL+"channels?where=online.eq.1%2Ctoken.eq."+query).then((data) => {
            if(data.json && data.json.length) {
                let chans = data.json;
                if(!this._mature)
                    chans = chans.filter((ch) => ch.audience !== "18+");

                return Promise.all(chans.map((chan) => {
                    let ch = getChannelFromJSON(chan);
                    return this._qs.queueRequest(baseURL+"users/"+chan.user.id).then((resp) => {
                        if(resp.json)
                            ch.image = getImageFromAvatars(resp.json.avatars);
                        else
                            ch.image = getImageFromAvatars([]);
                        return ch;
                    });
                }));
            }
            else {
                throw "No reqults for "+query+" on "+this.name;
            }
        });
    }
});

module.exports = new Beam(type);
