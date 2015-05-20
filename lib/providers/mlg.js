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

var type    = "mlg",
    chatURL = "http://chat.majorleaguegaming.com/",
    baseURL = 'http://streamapi.majorleaguegaming.com/service/streams/',
    infoURL = 'http://www.majorleaguegaming.com/api/channels/all.js',
    gameURL = 'http://www.majorleaguegaming.com/api/games/all.js',
    headers = {};

var qs = require("../queueservice").getServiceForProvider(type);

function requeue(response) {
    return response.status > 499;
}

// Takes a game_id
function getGame(id, cbk) {
    qs.queueRequest(gameURL, headers, requeue, function(data) {
        if(data.json && data.json.data.items && data.json.data.items.length) {
            cbk(data.json.data.items.find((game) => game.id == id).name);
        }
    });
}

function getChannelFromJSON(jsonChannel) {
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
    ret.category   = jsonChannel.tag_names[0];
    ret.thumbnail  = jsonChannel.image_16_9_medium;
    return ret;
}

const MLG = {
    name: _("provider_"+type),
    toString: function() { return this.name; },
    authURL: ["http://mlg.tv"],
    supports: { favorites: false, credentials: false },
    getUserFavorites: function(username, userCallback, channelsCallback) {
        throw new Error("Ustream.getUserFavorites is not supported.");
    },
    getChannelDetails: function(channelname, callback) {
        qs.queueRequest(infoURL+"?fields=id,slug,name,stream_name,subtitle,image_1_1,image_16_9_medium,url,bracket_url,tag_names", headers, requeue, function(data) {
            if(data.status == 200 && data.json.status_code == 200) {
                var channel = getChannelFromJSON(data.json.data.items.find(function(ch) { return ch.slug.toLowerCase() == channelname.toLowerCase(); }));
                callback(channel);
            }
        });
    },
    updateFavsRequest: function(users, userCallback, channelCallback) {
        throw new Error("Ustream.updateFavsRequest is not supported.");
    },
    removeFavsRequest: function() {
        qs.unqueueUpdateRequest(qs.LOW_PRIORITY);
    },
    updateRequest: function(channels, callback) {
        qs.queueUpdateRequest([baseURL+"all"], headers, qs.HIGH_PRIORITY, requeue, function(data) {
            qs.queueRequest(infoURL+"?fields=id,slug,name,stream_name,subtitle,image_1_1,image_16_9_medium,url,bracket_url,tag_names", headers, requeue, function(info) {
                if(data.json && data.json.status_code == 200 && info.json && info.json.status_code == 200) {
                    var ret = [];
                    data.json.data.items.forEach(function(status) {
                        if(channels.some(function(channel) { return status.stream_name == channel.login; })) {
                            var channel = getChannelFromJSON(info.json.data.items.find(function(ch) { return ch.id == status.channel_id; }));
                            channel.live = status.status != -1; // -1 for offline, 1 for live, 2 for rebroadcast
                            ret.push(channel);
                        }
                    });
                    callback(ret);
                }
            });
        });
    },
    removeRequest: function() {
        qs.unqueueUpdateRequest(qs.HIGH_PRIORITY);
    },
    updateChannel: function(channelname, callback) {
        console.info("MLG.updateChannel");
        qs.queueRequest(baseURL+'status/'+channelname, headers, requeue, function(data) {
            qs.queueRequest(infoURL+"?fields=id,slug,name,stream_name,subtitle,image_1_1,image_16_9_medium,url,bracket_url,tag_names", headers, requeue, function(info) {
                console.info("MLG.updateChannel.requestCallback");
                if(data.json && data.json.status_code == 200 && info.json && info.json.status_code == 200) {
                    var channel = getChannelFromJSON(info.json.data.items.find((ch) => ch.id == data.json.data.channel_id));
                    channel.live = data.json.data.status != -1;
                    channel.viewers = data.json.data.viewers;
                    callback(channel);
                }
            });
        });
    },
    updateChannels: function(channels, callback) {
        console.info("MLG.updateChannels");
        qs.queueRequest(baseURL+"all", headers, requeue, function(data) {
            qs.queueRequest(infoURL+"?fields=id,slug,name,stream_name,subtitle,image_1_1,image_16_9_medium,url,bracket_url,tag_names", headers, requeue, function(info) {
                if(data.json && data.json.status_code == 200 && info.json && info.json.status_code == 200) {
                    var ret = [];
                    data.json.data.items.forEach(function(status) {
                        if(channels.some(function(channel) { return status.stream_name == channel.login; })) {
                            var channel = getChannelFromJSON(info.json.data.items.find(function(ch) { return ch.id == status.channel_id; }));
                            channel.live = status.status != -1; // -1 for offline, 1 for live, 2 for rebroadcast
                            ret.push(channel);
                        }
                    });
                    callback(ret);
                }
            });
        });
    }
};

module.exports = MLG;

