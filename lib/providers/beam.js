/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */

//TODO checkout socket based events

"use strict";
const { Class: newClass } = require("sdk/core/heritage");
const { emit } = require("sdk/event/core");
var { Channel, User }    = require('../channeluser');
let { all } = require("sdk/core/promise");
let { Task: { async } } = require("resource://gre/modules/Task.jsm");

var type          = "beam",
    chatURL       = "https://beam.pro/embed/chat/",
    baseURL       = 'https://beam.pro/api/v1/';

var { promisedPaginationHelper } = require('../pagination-helper');
const { GenericProvider } = require("./generic-provider");

function getChannelFromJSON(jsonChannel) {
    var ret        = new Channel();
    ret.uname      = jsonChannel.token;
    ret.login      = jsonChannel.token;
    ret.type       = type;
    ret.live       = jsonChannel.online;
    ret.title      = jsonChannel.name;
    ret.viewers    = jsonChannel.viewers_current;
    // this is the actual thumbnail and not just the default channel thumbnail thing.
    ret.thumbnail  = "https://thumbs.beam.pro/channel/" + jsonChannel.id + ".big.jpg";
    ret.url.push("https://beam.pro/"+jsonChannel.token);
    ret.archiveUrl = "https://beam.pro/"+jsonChannel.token;
    ret.chatUrl    = chatURL+jsonChannel.token;
    ret.category   = jsonChannel.type.name;
    return ret;
}

function getImageFromAvatars(avatars) {
    var image = {};
    avatars.forEach(function(avatar) {
        image[avatar.meta.size.split("x")[0]] = avatar.url;
    });
    return image;
}

const Beam = newClass({
    extends: GenericProvider,
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
            let pageSize = 50;
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

            ch.favoites = subscriptions.map(function(sub) {
                return sub.token;
            });

            let channels = yield all(subscriptions.map((sub) => this.getChannelDetails(sub.token)));

            return [ ch, channels ];
        }
    }),
    updateFavsRequest: function(users) {
        //TODO need to implement this and then enable supportsFavorites
    },
    getChannelDetails: async(function*(channelname) {
        let response = yield this._qs.queueRequest(baseURL+"channels/"+channelname);
        if(response.json) {
            var channel = getChannelFromJSON(response.json);
            let resp = yield this._qs.queueRequest(baseURL+"users/"+response.json.user.id);
            if(resp.json)
                channel.image = getImageFromAvatars(resp.json.avatars);
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
                    emit(this, "updatedchannels", channel);
                });
            }
        });
    }
});

module.exports = new Beam(type);
