/**
 * Streamup provider. API reverseengineering is in #114.
 * @author Martin Giger
 * @license MPL-2.0
 * @module providers/streamup
 */
import { emit } from "sdk/event/core";
import { Channel, User } from '../channel/core';
import { PaginationHelper, promisedPaginationHelper } from '../pagination-helper';
import GenericProvider from "./generic-provider";

const type = "streamup",
    baseURL = 'https://api.streamup.com/v1/',
    getUserFromJSON = (json, user = new User(json.username, type)) => {
        if(json.name !== "") {
            user.uname = json.name;
        }
        user.image = {
            64: json.avatar.small,
            200: json.avatar.medium,
            600: json.avatar.large
        };
        return user;
    },
    getChannelFromJSON = (json) => {
        let chan = new Channel(json.username, type);
        chan = getUserFromJSON(json, chan);
        chan.url.push("https://streamup.com/" + json.slug);
        chan.archiveUrl = "https://streamup.com/profile/" + json.slug;
        chan.chatUrl = "https://streamup.com/" + json.slug + "/embeds/chat";
        return chan;
    };

class Streamup extends GenericProvider {
    authURL = [ "https://streamup.com" ];
    _supportsFavorites = true;

    async getUserFavorites(username) {
        const [ follows, userData ] = await Promise.all([
            promisedPaginationHelper({
                url: baseURL + "users/" + username + "/following?page=",
                initialPage: 1,
                request: (url) => this._qs.queueRequest(url),
                fetchNextPage: (data) => data.json && data.json.next_page !== null,
                getPageNumber: (page) => page + 1,
                getItems: (data) => {
                    if(data.json && "users" in data.json && data.json.users.length) {
                        return data.json.users;
                    }
                    else {
                        return [];
                    }
                }
            }),
            this._qs.queueRequest(baseURL + "users/" + username)
        ]);

        if(userData.json && "user" in userData.json) {
            const channels = follows.map(getChannelFromJSON),
                user = getUserFromJSON(userData.json.user);
            user.favorites = channels.map((chan) => chan.login);

            return [ user, channels ];
        }
        else {
            throw "Couldn't fetch favorites for user " + username + " for " + this._type;
        }
    }
    getChannelDetails(channelname) {
        return this._qs.queueRequest(baseURL + "channels/" + channelname).then((data) => {
            if(data.json && "channel" in data.json) {
                const chan = getChannelFromJSON(data.json.channel.user);
                chan.thumbnail = data.json.channel.snapshot.medium;
                chan.live.setLive(data.json.channel.live);
                chan.viewers = data.json.channel.live_viewers_count;
                chan.title = data.json.channel.stream_title;

                return chan;
            }
            else {
                throw "Couldn't get channel details for " + channelname + " on " + this._type;
            }
        });
    }
    updateFavsRequest(users) {
        const urls = users.map((user) => baseURL + "users/" + user.login);
        this._qs.queueUpdateRequest(urls, this._qs.LOW_PRIORITY, (data) => {
            if(data.json && "user" in data.json) {
                const user = getUserFromJSON(data.json.user),
                    oldUser = users.find((usr) => usr.login == user.login);

                user.id = oldUser.id;

                new PaginationHelper({
                    url: baseURL + "users/" + user.login + "/following?page=",
                    initialPage: 1,
                    request: (url) => this._qs.queueRequest(url),
                    fetchNextPage: (data) => data.json && data.json.next_page !== null,
                    getPageNumber: (page) => page + 1,
                    getItems: (data) => {
                        if(data.json && "users" in data.json && data.json.users.length) {
                            return data.json.users;
                        }
                        else {
                            return [];
                        }
                    },
                    onComplete: (follows) => {
                        user.favorites = follows.map((f) => f.username);
                        emit(this, "updateduser", user);

                        const channels = follows
                            .filter((f) => oldUser.favorites.every((fav) => fav !== f.username))
                            .map(getChannelFromJSON);
                        emit(this, "newchannels", channels);

                        oldUser.favorites = user.favorites;
                    }
                });
            }
        });
    }
    updateRequest(channels) {
        const urls = channels.map((chan) => baseURL + "channels/" + chan.login);
        this._qs.queueUpdateRequest(urls, this._qs.HIGH_PRIORITY, (data) => {
            if(data.json && "channel" in data.json) {
                const chan = getChannelFromJSON(data.json.channel.user);
                chan.thumbnail = data.json.channel.snapshot.medium;
                chan.live.setLive(data.json.channel.live);
                chan.viewers = data.json.channel.live_viewers_count;
                chan.title = data.json.channel.stream_title;

                emit(this, "updatedchannels", chan);
            }
        });
    }
}

export default Object.freeze(new Streamup(type));
