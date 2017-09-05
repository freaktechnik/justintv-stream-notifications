/**
 * Beam provider.
 *
 * @author Martin Giger
 * @license MPL-2.0
 * @module providers/beam
 * @todo checkout socket based events
 */
import { emit } from "../../utils";
import { Channel, User } from '../channel/core';
import { memoize } from "underscore";
import { promisedPaginationHelper } from '../pagination-helper';
import GenericProvider from "./generic-provider";
import { not } from '../logic';
import LiveState from '../channel/live-state';

const type = "beam",
    chatURL = "https://mixer.com/embed/chat/",
    baseURL = 'https://mixer.com/api/v1/',
    pageSize = 50,
    SIZES = [ '50', '70', '150', '300' ],
    getImageFromUserID = (id) => {
        const image = {};
        SIZES.forEach((s) => {
            image[s] = `${baseURL}users/${id}/avatar?w=${s}&h=${s}`;
        });
        return image;
    };

function getChannelFromJSON(jsonChannel) {
    const ret = new Channel(jsonChannel.token, type);
    ret.live.setLive(jsonChannel.online);
    ret.title = jsonChannel.name;
    ret.viewers = jsonChannel.viewersCurrent;
    // this is the actual thumbnail and not just the default channel thumbnail thing.
    //ret.thumbnail = "https://thumbs.beam.pro/channel/" + jsonChannel.id + ".big.jpg";
    if(jsonChannel.thumbnail) {
        ret.thumbnail = jsonChannel.thumbnail.url;
    }
    else {
        ret.thumbnail = "https://thumbs.mixer.com/channel/" + jsonChannel.id + ".big.jpg";
    }
    ret.url.push("https://mixer.com/" + jsonChannel.token);
    ret.archiveUrl = "https://mixer.com/" + jsonChannel.token;
    ret.chatUrl = chatURL + jsonChannel.token;
    ret.mature = jsonChannel.audience === "18+";
    ret.image = getImageFromUserID(jsonChannel.user.id);
    if(jsonChannel.type !== null) {
        ret.category = jsonChannel.type.name;
    }
    return ret;
}

function getImageFromAvatars(avatars) {
    const image = {};
    if(Array.isArray(avatars) && avatars.length) {
        for(const avatar of avatars) {
            image[avatar.meta.size.split("x")[0]] = avatar.url;
        }
    }
    return image;
}

class Beam extends GenericProvider {
    authURL = [ "https://mixer.com", "https://beam.pro" ];
    _supportsFavorites = true;
    _supportsCredentials = true;
    _supportsFeatured = true;

    constructor(type) {
        super(type);
        this._getUserIdFromUsername = memoize((username) => {
            return this._qs.queueRequest(`${baseURL}users/search?where=username:eq:${username}`).then((response) => {
                if(response.ok && response.parsedJSON) {
                    return response.parsedJSON.find((val) => val.username == username).id;
                }
                throw new Error(`Could not find user for ${username}`);
            });
        });
    }

    async _getHostee(channelId) {
        return this._qs.queueRequest(`${baseURL}channels/${channelId}/hostee`).then((response) => {
            if(response.ok && response.status !== 404 && response.parsedJSON) {
                return getChannelFromJSON(response.parsedJSON);
            }
            else {
                return null;
            }
        });
    }

    async getUserFavorites(username) {
        const userid = await this._getUserIdFromUsername(username),
            user = await this._qs.queueRequest(baseURL + "users/" + userid);

        if(user.parsedJSON) {
            const ch = new User(user.parsedJSON.username, this._type);
            if("avatars" in user.parsedJSON) {
                ch.image = getImageFromAvatars(user.parsedJSON.avatars);
            }
            else {
                ch.image = getImageFromUserID(user.parsedJSON.id);
            }

            const subscriptions = await promisedPaginationHelper({
                url: baseURL + "users/" + userid + "/follows?limit=" + pageSize + "&page=",
                pageSize,
                initialPage: 0,
                request: (url) => this._qs.queueRequest(url),
                getPageNumber(page) {
                    return ++page;
                },
                fetchNextPage(data, pageSize) {
                    return data.parsedJSON && data.parsedJSON.length == pageSize;
                },
                getItems(data) {
                    return data.parsedJSON || [];
                }
            });

            ch.favorites = subscriptions.map((sub) => sub.token);

            const channels = await Promise.all(subscriptions.map((sub) => this.getChannelDetails(sub.token)));

            return [ ch, channels ];
        }
        else {
            throw new Error(`Could not get favorites for user ${username} on ${this.name}`);
        }
    }
    async updateFavsRequest() {
        const getURLs = async () => {
            const users = await this._list.getUsers();
            return Promise.all(users.map((user) => this._getUserIdFromUsername(user.login).then((id) => `${baseURL}users/${id}`)));
        };

        this._qs.queueUpdateRequest({
            getURLs,
            priority: this._qs.LOW_PRIORITY,
            onComplete: async (data, url) => {
                if(data.parsedJSON) {
                    const ch = new User(data.parsedJSON.username, this._type);
                    if("avatars" in data.parsedJSON) {
                        ch.image = getImageFromAvatars(data.parsedJSON.avatars);
                    }
                    else {
                        ch.image = getImageFromUserID(data.parsedJSON.id);
                    }

                    const oldUser = await this._list.getUserByName(ch.login);
                    ch.id = oldUser.id;

                    const follows = await promisedPaginationHelper({
                        url: `${url}/follows?limit=${pageSize}&page=`,
                        pageSize,
                        initialPage: 0,
                        request: (url) => this._qs.queueRequest(url),
                        getPageNumber: (page) => page + 1,
                        fetchNextPage(data, pageSize) {
                            return data.parsedJSON && data.parsedJSON.length == pageSize;
                        },
                        getItems: (data) => data.parsedJSON || []
                    });
                    ch.favorites = follows.map((sub) => sub.token);
                    emit(this, "updateduser", ch);

                    const channels = await Promise.all(follows.filter((sub) => {
                        return !oldUser.favorites.includes(sub.token);
                    }).map((sub) => this.getChannelDetails(sub.token)));
                    emit(this, "newchannels", channels);
                }
            }
        });
    }
    async getChannelDetails(channelname) {
        const response = await this._qs.queueRequest(baseURL + "channels/" + channelname);
        if(response.parsedJSON) {
            const channel = getChannelFromJSON(response.parsedJSON);
            if(channel.live.state === LiveState.OFFLINE) {
                const hostedChannel = await this._getHostee(response.parsedJSON.id);
                if(hostedChannel !== null) {
                    channel.live.redirectTo(hostedChannel);
                }
            }
            return channel;
        }
        throw new Error("Error getting the details for the beam channel " + channelname);
    }
    updateRequest() {
        const getURLs = async () => {
            const channels = await this._list.getChannels();
            return channels.map((channel) => `${baseURL}channels/${channel.login}`);
        };
        this._qs.queueUpdateRequest({
            getURLs,
            onComplete: (data) => {
                if(data.parsedJSON) {
                    const channel = getChannelFromJSON(data.parsedJSON);

                    if(channel.live.state === LiveState.OFFLINE) {
                        return this._getHostee(data.parsedJSON.id).then((hostedChannel) => {
                            if(hostedChannel !== null) {
                                channel.live.redirectTo(hostedChannel);
                            }
                            emit(this, "updatedchannels", channel);
                        });
                    }
                    emit(this, "updatedchannels", channel);
                }
            }
        });
    }
    async getFeaturedChannels() {
        const data = await this._qs.queueRequest(baseURL + "channels?limit=8&page=0&order=online%3Adesc%2CviewersCurrent%3Adesc%2CviewersTotal%3Adesc&where=suspended.eq.0%2Conline.eq.1");
        if(data.parsedJSON && data.parsedJSON.length) {
            let chans = data.parsedJSON;
            if(await not(this._mature())) {
                chans = chans.filter((ch) => ch.audience !== "18+");
            }

            return chans.map((chan) => getChannelFromJSON(chan));
        }
        else {
            throw new Error("Didn't find any featured channels for " + this.name);
        }
    }
    async search(query) {
        const data = await this._qs.queueRequest(baseURL + "channels?where=online.eq.1%2Ctoken.eq." + query);
        if(data.parsedJSON && data.parsedJSON.length) {
            let chans = data.parsedJSON;
            if(await not(this._mature())) {
                chans = chans.filter((ch) => ch.audience !== "18+");
            }

            return chans.map((chan) => getChannelFromJSON(chan));
        }
        else {
            throw new Error("No results for " + query + " on " + this.name);
        }
    }
}

export default Object.freeze(new Beam(type));
