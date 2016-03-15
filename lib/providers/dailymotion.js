/**
 * Dailymotion provider.
 * @author Martin Giger
 * @license MPL-2.0
 * @module providers/dailymotion
 */
"use strict";

const { Class: newClass } = require("sdk/core/heritage");
const { emit } = require("sdk/event/core");
const { GenericProvider } = require("./generic-provider");
const { Channel } = require("../channel/core");
const { promisedPaginationHelper, PaginationHelper } = require("../pagination-helper");
const qs = require("sdk/querystring");
const { Task: { async } } = require("resource://gre/modules/Task.jsm");

const type = "dailymotion";
const baseUrl = "https://api.dailymotion.com/";
const AVATAR_SIZES = [25,60,80,120,190,240,360,480,720];
const USER_FIELDS = "screenname,url,id,"+AVATAR_SIZES.map((s) => "avatar_"+s+"_url").join(",");

const getChannelFromJSON = (json) => {
    const ch = new Channel(json.id, type);
    ch.uname = json.screenname;
    ch.image =
    ch.url.push(json.url);
    ch.archiveUrl = json.url;
    ch.image = AVATAR_SIZES.reduce((p, c) => {
        p[c] = json['avatar_'+c+'_url'];
        return p;
    }, {});

    return ch;
};

const Dailymotion = newClass({
    extends: GenericProvider,
    _getChannelByID(id) {
        return this._qs.queueRequest(baseUrl + "user/" + id + "?" + qs.stringify({
            fields: USER_FIELDS
        })).then((result) => {
            if(result.status == 200 && result.json && result.json.list && result.json.list.length)
                return getChannelFromJSON(result.json.list[0]);
            else
                throw "Could not get details for " + id + " on " + this._type;
        });
    },
    _getStreamDetailsForChannel(channel) {
        return this._qs.queueRequest(baseUrl + "user/" + channel.login + "/videos?" + qs.stringify({
            id: channel.login,
            fields: "chat_embed_url,title,url,channel.name,onair,thumbnail_240_url",
            sort: "live-audience",
            limit: 1
        })).then((response) => {
            if(response.status == 200 && response.json) {
                if(response.json.list.length) {
                    const item = response.json.list[0];
                    channel.chatUrl = item.chat_embed_url;
                    channel.thumbnail = item.thumbnail_url;
                    channel.url.push(item.url);
                    channel.category = item['channel.name'];
                    channel.live = item.onair;
                    channel.title = item.title;
                }
                else {
                    channel.live = false;
                }
                return channel;
            }
            else
                throw "Could not update " + channel.login + " on " + this._type;
         });
    },
    getChannelDetails(username) {
        return this._qs.queueRequest(baseUrl + "users?" + qs.stringify({
            usernames: username,
            fields: USER_FIELDS
        })).then((result) => {
            if(result.status == 200 && result.json && result.json.list && result.json.list.length) {
                return getChannelFromJSON(result.json.list[0]);
            }
            else {
                return this._getChannelByID(username);
            }
        });
    },
    updateRequest(channels) {
        new PaginationHelper({
            url: baseUrl + "users?" + qs.stringify({
                ids: channels.map((ch) => ch.login).join(","),
                fields: USER_FIELDS,
                limit: 100
            }) + "&page=",
            initialPage: 1,
            pageSize: 100,
            request: (url, callback, initial) => {
                if(initial)
                    this._qs.queueUpdateRequest([url], this._qs.HIGH_PRIORITY, callback);
                else
                    return this._qs.queueRequest(url);
            },
            getPageNumber(page) {
                return page + 1;
            },
            fetchNextPage(data) {
                return data.json && data.json.has_more;
            },
            getItems(data) {
                if(data.status == 200 && data.json && data.json.list)
                    return data.json.list;
                else
                    return [];
            },
            onComplete: (data) => {
                data = data.map(getChannelFromJSON);

                Promise.all(data.map((ch) => this._getStreamDetailsForChannel(ch)))
                    .then((channels) => emit(this, "updatedchannels", channels));
            }
        });
    },
    updateChannel(username) {
        return this.getChannelDetails(username).then((channel) => {
            return this._getStreamDetailsForChannel(channel);
        });
    },
    updateChannels: async(function*(channels) {
        let response = yield promisedPaginationHelper({
            url: baseUrl + "users?" + qs.stringify({
                ids: channels.map((ch) => ch.login).join(","),
                fields: USER_FIELDS,
                limit: 100
            })+"&page=",
            pageSize: 100,
            initialPage: 1,
            request: (url) => this._qs.queueRequest(url),
            getPageNumber(page) {
                return page + 1;
            },
            fetchNextPage(data) {
                return data.json && data.json.has_more;
            },
            getItems(data) {
                if(data.json && data.json.list)
                    return data.json.list;
                else
                    return [];
            }
        });

        return Promise.all(response.map((ch) => this._getStreamDetailsForChannel(getChannelFromJSON(ch))));
    })
});

module.exports = new Dailymotion(type);
