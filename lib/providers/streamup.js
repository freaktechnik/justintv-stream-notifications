/**
 * Streamup provider. API reverseengineering is in #114.
 * @author Martin Giger
 * @license MPL-2.0
 * @module providers/streamup
 */

"use strict";
const { Class: newClass } = require("sdk/core/heritage");
const { emit } = require("sdk/event/core");
const { reject, all } = require("sdk/core/promise");
const { Task: { async } } = require("resource://gre/modules/Task.jsm");

const { Channel, User } = require('../channeluser');
const { PaginationHelper, promisedPaginationHelper } = require('../pagination-helper');
const { GenericProvider } = require("./generic-provider");

const type = "streamup",
      baseURL = 'https://api.streamup.com/v1/';

const getUserFromJSON = (json, user = new User()) => {
    user.login = json.username;
    user.uname = json.name !== "" ? json.name : json.username;
    user.image = {
        64: json.avatar.small,
        200: json.avatar.medium,
        600: json.avatar.large
    };
    user.type = type;
    return user;
};

const getChannelFromJSON = (json) => {
    let chan = new Channel();
    chan = getUserFromJSON(json, chan);
    chan.url.push("https://streamup.com/"+json.slug);
    chan.archiveUrl = "https://streamup.com/profile/"+json.slug;
    chan.chatUrl = "https://streamup.com/"+json.slug+"/embeds/chat";
    return chan;
};

const Streamup = newClass({
    extends: GenericProvider,
    authURL: ["https://streamup.com"],
    _supportsFavorites: true,
    getUserFavorites: async(function*(username) {
        let [follows, userData] = yield all([
            promisedPaginationHelper({
                url: baseURL + "users/" + username + "/following?page=",
                initialPage: 1,
                request: (url) => this._qs.queueRequest(url),
                fetchNextPage: (data) => data.json && data.json.next_page !== null,
                getPageNumber: (page) => page+1,
                getItems: (data) => {
                    if(data.json && "users" in data.json && data.json.users.length)
                        return data.json.users;
                    else
                        return [];
                }
            }),
            this._qs.queueRequest(baseURL + "users/" + username)
        ]);

        if(userData.json && "user" in userData.json) {
            let channels = follows.map(getChannelFromJSON);
            let user = getUserFromJSON(userData.json.user);
            user.favorites = channels.map((chan) => chan.login);

            return [user, channels];
        }
        else {
            throw "Couldn't fetch favorites for user " + username + " for " + this._type;
        }
    }),
    getChannelDetails: function(channelname) {
        return this._qs.queueRequest(baseURL + "channels/" + channelname).then((data) => {
            if(data.json && "channel" in data.json) {
                let chan = getChannelFromJSON(data.json.channel.user);
                chan.thumbnail = data.json.channel.snapshot.medium;
                chan.live = data.json.channel.live;
                chan.viewers = data.json.channel.live_viewers_count;
                chan.title = data.json.channel.stream_title;

                return chan;
            }
            else {
                throw "Couldn't get channel details for " + channelname + " on " + this._type;
            }
        });
    },
    updateFavsRequest: function(users) {
        let urls = users.map((user) => baseURL + "users/" + user.login);
        this._qs.queueUpdateRequest(urls, this._qs.LOW_PRIORITY, (data) => {
            if(data.json && "user" in data.json) {
                let user = getUserFromJSON(data.json.user);

                let oldUser = users.find((usr) => usr.login = user.login);

                user.id = oldUser.id;

                new PaginationHelper({
                    url: baseURL + "users/" + user.login + "/following?page=",
                    initialPage: 1,
                    request: (url) => this._qs.queueRequest(url),
                    fetchNextPage: (data) => data.json && data.json.next_page !== null,
                    getPageNumber: (page) => page+1,
                    getItems: (data) => {
                        if(data.json && "users" in data.json && data.json.users.length)
                            return data.json.users;
                        else
                            return [];
                    },
                    onComplete: (follows) => {
                        user.favorites = follows.map((f) => f.username);
                        emit(this, "updateduser", user);

                        let channels = follows
                            .filter((f) => oldUser.favorites.every((fav) => fav !== f.username))
                            .map(getChannelFromJSON);
                        emit(this, "newchannels", channels);

                        oldUser.favorites = user.favorites;
                    }
                });
            }
        });
    },
    updateRequest: function(channels) {
        let urls = channels.map((chan) => baseURL + "channels/" + chan.login);
        this._qs.queueUpdateRequest(urls, this._qs.HIGH_PRIORITY, (data) => {
            if(data.json && "channel" in data.json) {
                let chan = getChannelFromJSON(data.json.channel.user);
                chan.thumbnail = data.json.channel.snapshot.medium;
                chan.live = data.json.channel.live;
                chan.viewers = data.json.channel.live_viewers_count;
                chan.title = data.json.channel.stream_title;

                emit(this, "updatedchannels", chan);
            }
        });
    }
});

module.exports = new Streamup(type);
