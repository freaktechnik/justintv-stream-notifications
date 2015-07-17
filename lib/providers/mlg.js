/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */
/*
Inofficial MLG.tv (major league gaming streams) API doc:

Username: cleartext username used in the channel URL
stream_name: mlg[0-9]+, which seems to be the stream ID
channel_id: [0-9]+, which seems to be the ID for the channel (used in image URLs and chat)


http://tv.majorleaguegaming.com/channel/{username}
http://chat.majorleaguegaming.com/{channel_id}


all of these seem to also support JSONP with the callback= parameter.
http://www.majorleaguegaming.com/player/config.json?id={username} username -> media[0].channel
http://streamapi.majorleaguegaming.com/service/streams/all status of all streams with stream_name and channel_id
http://streamapi.majorleaguegaming.com/service/streams/status/{stream_name} status and viewer count of just the specified stream
    status: -1 for offline, 1 for live, 2 for rebroadcast
http://www.majorleaguegaming.com/api/channels/all.js All the info about all the channels
    field parameter can limit the fields. You'll find the available fields if you don't specify any
http://www.majorleaguegaming.com/api/games/all.js All names and images for all game_id values
http://streamapi.majorleaguegaming.com/service/streams/playback/{stream name}?format=all playback URL + name & id

https://accounts.majorleaguegaming.com/follows/retrieve returns all the channel ids the currently logged in user (cookie mlg_login for username, mlg_id for the id) follows
There are also the actions to follow and unfollow a channel, but I am not sure how they work, as I don't care.

*/
"use strict";
var _     = require("sdk/l10n").get;
var { Channel, User }    = require('../channeluser');
var { all, defer, resolve } = require("sdk/core/promise");
let { Task: { async } } = require("resource://gre/modules/Task.jsm");

var type    = "mlg",
    chatURL = "http://chat.majorleaguegaming.com/",
    baseURL = 'http://streamapi.majorleaguegaming.com/service/streams/',
    infoURL = 'http://www.majorleaguegaming.com/api/channels/all.js',
    gameURL = 'http://www.majorleaguegaming.com/api/games/all.js',
    infoArgs = "?fields=id,slug,name,stream_name,subtitle,image_1_1,image_16_9_medium,url,bracket_url,game_id",
    headers = {};

var qs = require("../queueservice").getServiceForProvider(type);

function requeue(response) {
    return response.status > 499;
}

// Takes a game_id
var games = [];
function getGame(id) {
    var game = games.find((g) => g.id == id);
    if(!game) {
        return qs.queueRequest(gameURL, headers, requeue).then(function(data) {
            if(data.json && data.json.data.items && data.json.data.items.length) {
                games = data.json.data.items;
                return data.json.data.items.find((g) => g.id == id).name;
            }
            else {
                throw data.json.errors;
            }
        });
    }
    else {
        return resolve(game.name);
    }
}

function getChannelFromJSON(jsonChannel) {
    var p = defer();
    console.info("MLG:getChannelFromJSON");
    var ret        = new Channel();
    ret.login      = jsonChannel.stream_name;
    ret.uname      = jsonChannel.name;
    ret.url.push(jsonChannel.url);
    ret.archiveUrl = jsonChannel.bracket_url ? jsonChannel.bracket_url : jsonChannel.url;
    ret.chatUrl    = chatURL + jsonChannel.id;
    ret.image      = { "200": jsonChannel.image_1_1 };
    ret.type       = type;
    ret.title      = jsonChannel.subtitle;
    ret.thumbnail  = jsonChannel.image_16_9_medium;
    getGame(jsonChannel.game_id).then((game) => {
        ret.category = game;
        p.resolve(ret);
    }, () => { p.resolve(ret); });
    return p.promise;
}

const MLG = {
    name: _("provider_"+type),
    toString: function() { return this.name; },
    authURL: ["http://mlg.tv"],
    supports: { favorites: false, credentials: false },
    getUserFavorites: function(username, userCallback, channelsCallback) {
        throw new Error("MLG.getUserFavorites is not supported.");
    },
    getChannelDetails: function(channelname) {
        return qs.queueRequest(infoURL+infoArgs, headers, requeue).then(function(data) {
            if(data.status == 200 && data.json.status_code == 200) {
                let cho = data.json.data.items.find(function(ch) { return ch.slug.toLowerCase() == channelname.toLowerCase(); });
                return getChannelFromJSON(cho);
            }
        });
    },
    updateFavsRequest: function(users, userCallback, channelCallback) {
        throw new Error("MLG.updateFavsRequest is not supported.");
    },
    removeFavsRequest: function() {
        qs.unqueueUpdateRequest(qs.LOW_PRIORITY);
    },
    updateRequest: function(channels, callback) {
        qs.queueUpdateRequest([baseURL+"all"], headers, qs.HIGH_PRIORITY, requeue, function(data) {
            qs.queueRequest(infoURL+infoArgs, headers, requeue).then(function(info) {
                if(data.json && data.json.status_code == 200 && info.json && info.json.status_code == 200) {
                    var ret = [];
                    all(data.json.data.items.filter((status) => {
                        return channels.some((channel) => status.stream_name == channel.login);
                    }).map(function(status) {
                        return getChannelFromJSON(info.json.data.items.find(function(ch) { return ch.id == status.channel_id; }))
                        .then((channel) => {
                            channel.live = status.status != -1; // -1 for offline, 1 for live, 2 for rebroadcast
                            return channel;
                        });
                    })).then(callback);
                }
            });
        });
    },
    removeRequest: function() {
        qs.unqueueUpdateRequest(qs.HIGH_PRIORITY);
    },
    updateChannel: async(function*(channelname) {
        console.info("MLG.updateChannel");
        let [data, info] = yield all([
            qs.queueRequest(baseURL+'status/'+channelname, headers, requeue),
            qs.queueRequest(infoURL+infoArgs, headers, requeue)
        ]);
        console.info("MLG.updateChannel.requestCallback");
        if(data.json && data.json.status_code == 200 && info.json && info.json.status_code == 200) {
            let channel = yield getChannelFromJSON(info.json.data.items.find((ch) => ch.id == data.json.data.channel_id));
            channel.live = data.json.data.status != -1;
            channel.viewers = data.json.data.viewers;

            return channel;
        }
        else {
            throw "Something went wrong when updating "+channelname;
        }
    }),
    updateChannels: async(function*(channels) {
        console.info("MLG.updateChannels");
        let [data, info] = yield all([
            qs.queueRequest(baseURL+"all", headers, requeue),
            qs.queueRequest(infoURL+infoArgs, headers, requeue)
        ]);

        if(data.json && data.json.status_code == 200 && info.json && info.json.status_code == 200) {
            let followedChannels = data.json.data.items.filter((status) => {
                return channels.some((channel) => status.stream_name == channel.login);
            });
            return all(followedChannels.map(function(status) {
                return getChannelFromJSON(info.json.data.items.find(function(ch) { return ch.id == status.channel_id; }))
                .then((channel) => {
                    channel.live = status.status != -1; // -1 for offline, 1 for live, 2 for rebroadcast
                    return channel;
                });
            }));
        }
    })
};

module.exports = MLG;

