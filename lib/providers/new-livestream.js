/**
 * New livestream provider. For API reverseenigneering see Issue #99
 * @author Martin Giger
 * @license MPL-2.0
 * @module providers/new-livestream
 */

"use strict";

const { Class: newClass } = require("sdk/core/heritage");
const { emit } = require("sdk/event/core");
const { Channel, User } = require("../channeluser");
const { GenericProvider } = require("./generic-provider");
const { promisedPaginationHelper } = require("../pagination-helper");
let { Task: { async } } = require("resource://gre/modules/Task.jsm");

const type = "newlivestream",
      baseURL = "http://livestream.com/api/accounts/";

const getChannelFromJSON = (json) => {
    let chan = new Channel();
    chan.login = json.short_name || json.id;
    chan.uname = json.full_name;
    chan.image = {
        [json.picture.width]: json.picture.url,
        "170": json.picture.small_url,
        "50": json.picture.thumb_url
    };
    chan.category = json.category_name;
    chan.archiveUrl = "http://livestream.com/"+chan.login;
    chan.chatUrl = "http://livestream.com/"+chan.login;
    chan.type = type;
    return chan;
};

const NewLivestream = newClass({
    extends: GenericProvider,
    authURL: ["http://livestream.com"],
    _supportsFavorites: true,
    _getChannelStatus: async(function*(json, channel) {
       // Checks if there are any upcoming or past events and if yes, if one is currently being broadcast.
        let event = (data.json.upcoming_events && data.json.upcoming_events.data.find((event) => event.broadcast_id != -1)) ||
            (data.json.past_events && data.json.past_events.data.find((event) => event.broadcast_id != -1));

        if(event) {
            channel.title = event.full_name;
            channel.viewers = event.viewer_count;
            channel.url.push("http://livestream.com/"+channel.login+"/events/"+event.id);
            let info = yield this._qs.queueRequest(baseURL+data.json.id+"/events/"+event.id+"/stream_info");

            if(info.json && !("message" in info.json)) {
                channel.live = info.json.is_live;
                channel.thumbnail = info.json.thumbnail_url;
            }
        }
        return channel;
    }),
    getUserFavorites: async(function*(username) {
        let user = yield this._qs.queueRequest(baseURL+username);
        let usr = new User();
        usr.type = this._type;
        if(user.json && user.json.id) {
            usr.login = user.json.short_name || user.json.id;
            usr.uname = user.json.full_name;
            usr.image = {
                [user.json.picture.width]: user.json.picture.url,
                "170": user.json.picture.small_url,
                "50": user.json.picture.thumb_url
            };
            let follows = yield promisedPaginationHelper({
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

            let channels = follows.map((follow) => getChannelFromJSON(follow));

            usr.favorites = channels.map((channel) => channel.login);
            return [ usr, channels ];
        }
    }),
    getChannelDetails: function(channelname) {
        return this._qs.queueRequest(baseURL+channelname).then((data) => {
            if(data.json && data.json.id) {
                return getChannelFromJSON(data.json);
            }
            else {
                throw "Couldn't get details for the new livestream channel "+channelname;
            }
        });
    },
    updateFavsRequest: function(users) {
        let urls = users.map((user) => baseURL+user.login);
        this._qs.queueUpdateRequest(urls, this._qs.LOW_PRIORITY, (user) => {
            if(user.json && user.json.id) {
                let usr = users.find((u) => u.login == user.json.id || user.json.short_name);
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
    },
    updateRequest: function(channels) {
        let urls = channels.map((channel) => baseURL+channel.login);
        this._qs.queueUpdateRequest(urls, this._qs.HIGH_PRIORITY, (data) => {
            if(data.json && data.json.id) {
                let channel = getChannelFromJSON(data.json);

                this._getChannelStatus(data.json, channel).then((channel) =>{
                    emit(this, "updatedchannels", channel);
                });
            }
        });
    },
    updateChannel: async(function*(channelname) {
        let data = yield this._qs.queueRequest(baseURL+channelname);

        if(data.json && "id" in data.json) {
            let channel = getChannelFromJSON(data.json);

            channel = yield this._getChannelStatus(data.json, channel);
            return channel;
        }
        else {
            throw "Couldn't get details for the new livestream channel "+channelname;
        }
    })
});

module.exports = new NewLivestream(type);
