/*
 * Created by Martin Giger
 * Licensed under LGPLv3
 *
 * Hitbox provider
 */

//TODO it's not possible to get followers via hitbox API as of yet.
 
"use strict";
var _ = require("sdk/l10n").get;
const { prefs } = require("sdk/simple-prefs");
const querystring = require("sdk/querystring");
var { Channel, User } = require('../channeluser');

var type = "youtube",
    archiveURL = "",
    apiKey = prefs.youtube_apiKey,
    headers = {
        "Referer": "extension:jtvn.humanoids.be"
    },
    baseURL = "https://www.googleapis.com/youtube/v3/";

var qs = require("../queueservice").getServiceForProvider(type);

function requeue(data) {
    return data.status > 200 && data.status != 304;
}

function getChannelFromJson(json) {
    var cho = new Channel();
    cho.login = json.channel.user_name;
    cho.uname = json.media_display_name;
    cho.url.push(json.channel.channel_link);
    cho.archiveUrl = json.channel.channel_link + archiveURL;
    cho.chatUrl = chatURL + json.channel.user_name;
    cho.type = type;
    cho.image = { "200": cdnURL+json.channel.user_logo,
                  "50": cdnURL+json.channel.user_logo_small };
    cho.title = json.media_status;
    cho.category = json.category_name;
    cho.viewers = json.media_views;
    cho.thumbnail = cdnURL+json.media_thumbnail;
    cho.live = json.media_is_live != "0";
    return cho;
}

const YouTube = {
    name: _("provider_"+type),
    toString: function() { return this.name; },
    authURL: ["http://accounts.google.com"],
    supports:  { favorites: false, credentials: false },
    getUserFavorites: function(username, userCallback, channelsCallback) {
        //TODO: Needs oAuth and only works for own channel.
        qs.queueRequest(baseURL+"channels?"+querystring.stringify(
            {
                "part": "id,contentDetails",
                "forUsername": username,
                "fields": "items(id,contentDetails/googlePlusUserId)",
                "key": apiKey
            }), headers, requeue, function(data) {
            if(data.json && data.json.items && data.json.items.length) {
                var ch = new User(), subs = [], page = 0, subsOptions = {
                    "part": "contentDetails",
                    "channelId": ch.login,
                    "maxResults": 50,
                    "key": apiKey
                };
                ch.login = data.json.items[0].id;
                ch.type = type;
                qs.queueRequest(baseURL+"subscriptions?"+querystring.stringify(subsOptions), headers, requeue, functions favsCbk(subscriptions) {
                    if(subscriptions.json && subscriptions.json.items) {
                        subs = subs.concat(subscriptions.json.items);
                        if(subscriptions.json.pageInfo.totalResults > subscriptions.json.pageInfo.resultsPerPage*++page) {
                            subsOptions.pageToken = subscriptions.json.nextPageToken;
                            qs.queueRequest(baseURL+"subscriptions?"+querystring.stringify(subsOptions), headers, requeue, favsCbk);
                            return;
                        }
                        else {
                            ch.favorites = subs.map(
                            qs.queueRequest("https://www.googleapis.com/plus/v1/people/"+data.json.items[0].contentDetails.googlePlusUserId+"?"+querystring.stringify(
                                {
                                    "fields": "image(url),displayName",
                                    "key": apiKey
                                }), headers, requeue, function(response) {
                                if(response.json && response.json.displayName) {
                                    ch.image = { "50": response.json.image.url };
                                    ch.uname = response.json.displayName;
                                    userCallback(ch);
                                }
                            });
                        }
                });
            }
        });
    },
    getChannelDetails: function(username, callback) {
        qs.queueRequest(baseURL+"channels?"+querystring.stringify(
            {
                "part": "id,contentDetails",
                "forUsername": username,
                "fields": "items(id,contentDetails/googlePlusUserId)",
                "key": apiKey
            }), headers, requeue, function(data) {
            if(data.json && data.json.items && data.json.items.length) {
                var ch = new Channel();
                ch.login = data.json.items[0].id;
                ch.type = type;
                ch.url.push("http://youtube.com/channel/"+ch.login);
                ch.archiveUrl = "http://youtube.com/channel/"+ch.login+"/videos";
                ch.chatUrl = "http://youtube.com/channel/"+ch.login+"/discussion";
                qs.queueRequest("https://www.googleapis.com/plus/v1/people/"+data.json.items[0].contentDetails.googlePlusUserId+"?"+querystring.stringify(
                    {
                        "fields": "image(url),displayName",
                        "key": apiKey
                    }), headers, requeue, function(response) {
                    if(response.json && response.json.displayName) {
                        ch.image = { "50": response.json.image.url };
                        ch.uname = response.json.displayName;
                        callback(ch);
                    }
                });
            }
        });
    },
    updateFavsRequest: function(users, callback) {
        //TODO
        qs.queueUpdateRequest(channels, headers, qs.LOW_PRIORITY, requeue, function(data) {
            callback(data);
        });
    },
    removeFavsRequest: function() {
        qs.unqueueUpdateRequest(qs.LOW_PRIORITY);
    },
    updateRequest: function(channels, callback) {
        var urls = channels.map(function(channel) {
            return baseURL + "search?" + querystring.stringify(
                {
                    "part": "id,snippet",
                    "channelId": channel.login,
                    "fields": "items(id/videoId,snippet/title,snippet/thumbnails/medium/url)",
                    "maxResults": 1,
                    "eventType": "live",
                    "type": "video",
                    "key": apiKey
                }
            );
        });
        qs.queueUpdateRequest(urls, headers, qs.HIGH_PRIORITY, requeue, function(data, url) {
            var channel = channels.find((channel) => { return url.match(/channelId=([\w-]+)?&/)[1] == channel.login });
            if(data.json && data.json.items && data.json.items.length) {
                channel.live = true;
                channel.thumbnail = data.json.items[0].snippet.thumbnails.medium.url;
                channel.url = ["http://youtube.com/watch?v="+data.json.items[0].id.videoId];
                channel.title = data.json.items[0].snippet.title;
                callback([channel]);
            }
            else {
                channel.live = false;
                callback([channel]);
            }
        });
    },
    removeRequest: function() {
        qs.unqueueUpdateRequest(qs.HIGH_PRIORITY);
    },
    updateChannel: function(channellogin, callback) {
        qs.queueRequest(baseURL+"channels?"+querystring.stringify(
            {
                "part": "contentDetails",
                "id": channellogin,
                "fields": "items(contentDetails/googlePlusUserId)",
                "key": apiKey
            }), headers, requeue, function(data) {
            if(data.json && data.json.items && data.json.items.length) {
                var ch = new Channel();
                ch.login = channellogin;
                ch.type = type;
                ch.archiveUrl = "http://youtube.com/channel/"+ch.login+"/videos";
                ch.chatUrl = "http://youtube.com/channel/"+ch.login+"/discussion";
                qs.queueRequest("https://www.googleapis.com/plus/v1/people/"+data.json.items[0].contentDetails.googlePlusUserId+"?"+querystring.stringify(
                    {
                        "fields": "image(url),displayName",
                        "key": apiKey
                    }), headers, requeue, function(response) {
                    if(response.json && response.json.displayName) {
                        ch.image = { "50": response.json.image.url };
                        ch.uname = response.json.displayName;
                        qs.queueRequest(baseURL+"search?"+querystring.stringify(
                            {
                                "part": "id,snippet",
                                "channelId": channellogin,
                                "fields": "items(id/videoId,snippet/title,snippet/thumbnails/medium/url)",
                                "maxResults": 1,
                                "eventType": "live",
                                "type": "video",
                                "key": apiKey
                            }), headers, requeue, function(response) {
                            if(response.json && response.json.items) {
                                if(response.json.items.length) {
                                    /* For viewers and category:
                                        qs.queueRequest(baseURL+"videos?"+querystring.stringify(
                                            {
                                                "part": "snippet, liveStreamingDetails",
                                                "id": response.json.items[0].id.videoId,
                                                "fields": "items(snippet/categoryId,liveStreamingDetails/concurrentViewers)",
                                                "key": apiKey
                                            }
                                        ), headers, requeue, function(video) {*/
                                    ch.live = true;
                                    ch.url.push("http://youtube.com/watch?v="+response.json.items[0].id.videoId);
                                    ch.title = response.json.items[0].snippet.title;
                                    ch.thumbnail = response.json.items[0].snippet.thumbnails.medium.url;
                                    //ch.category = video.json.items[0].snippet.categoryId;
                                    //ch.viewers = video.json.items[0].liveStreamingDetails.concurrentViewers;
                                    callback(ch);
                                }
                                else {
                                    ch.live = false;
                                    ch.url.push("http://youtube.com/channel/"+ch.login);
                                    callback(ch);
                                }
                            }
                        });
                    }
                });
            }
        });
    },
    updateChannels: function(channels, callback) {
        var ret = [];
        channels.forEach(function(channel) {
            this.updateChannel(channel.login, function(data) {
                ret.push(data);
                if(ret.length == channels.length) {
                    callback(ret);
                }
            });
        }, this);
    }
};

module.exports = YouTube;

