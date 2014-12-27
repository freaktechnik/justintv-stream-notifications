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
    return data.status > 499;
}

const getChannelById = function(channelId, callback) {
    qs.queueRequest(baseURL+"channels?"+querystring.stringify(
        {
            "part": "snippet",
            "id": channelId,
            "fields": "items(snippet/title,snippet/thumbnails)",
            "key": apiKey
        }), headers, requeue, function(data) {
        if(data.json && data.json.items && data.json.items.length) {
            var ch = new Channel();
            ch.login = channelId;
            ch.type = type;
            ch.archiveUrl = "http://youtube.com/channel/"+ch.login+"/videos";
            ch.chatUrl = "http://youtube.com/channel/"+ch.login+"/discussion";
            ch.image = { "88": data.json.items[0].snippet.thumbnails.default.url,
                         "240": data.json.items[0].snippet.thumbnails.high.url
                       };
            ch.uname = data.json.items[0].snippet.title;
            callback(ch);
        }
        else console.log("Getting channel details failed: "+data.status);
    });
};

const YouTube = {
    name: _("provider_"+type),
    toString: function() { return this.name; },
    authURL: ["http://accounts.google.com"],
    supports:  { favorites: true, credentials: false },
    getUserFavorites: function(username, userCallback, channelsCallback) {
        qs.queueRequest(baseURL+"channels?"+querystring.stringify(
            {
                "part": "id,snippet",
                "forUsername": username,
                "fields": "items(id,snippet/title,snippet/thumbnails)",
                "key": apiKey
            }), headers, requeue, function(data) {
            if(data.json && data.json.items && data.json.items.length) {
                var ch = new User(), subs = [], page = 0, subsOptions = {
                    "part": "snippet",
                    "channelId": data.json.items[0].id,
                    "maxResults": 50,
                    "key": apiKey
                };
                ch.login = data.json.items[0].id;
                ch.type = type;
                ch.chatUrl = "http://youtube.com/channel/"+ch.login+"/discussion";
                ch.image = { "88": data.json.items[0].snippet.thumbnails.default.url,
                             "240": data.json.items[0].snippet.thumbnails.high.url
                           };
                ch.uname = data.json.items[0].snippet.title;
                qs.queueRequest(baseURL+"subscriptions?"+querystring.stringify(subsOptions), headers, requeue, function favsCbk(subscriptions) {
                    if(subscriptions.json && subscriptions.json.items) {
                        subs = subs.concat(subscriptions.json.items);
                        if(subscriptions.json.pageInfo.totalResults > subscriptions.json.pageInfo.resultsPerPage*++page) {
                            subsOptions.pageToken = subscriptions.json.nextPageToken;
                            qs.queueRequest(baseURL+"subscriptions?"+querystring.stringify(subsOptions), headers, requeue, favsCbk);
                            return;
                        }
                        else {
                            ch.favorites = subs.map((sub) => { return sub.snippet.resourceId.channelId; });
                            userCallback(ch);
                            channelsCallback(subs.map(function(sub) {
                                var ret = new Channel();
                                ret.login = sub.snippet.resourceId.channelId;
                                ret.type = type;
                                ret.archiveUrl = "http://youtube.com/channel/"+ch.login+"/videos";
                                ret.chatUrl = "http://youtube.com/channel/"+ch.login+"/discussion";
                                ret.image = { "88": sub.snippet.thumbnails.default.url,
                                             "240": sub.snippet.thumbnails.high.url };
                                ret.uname = sub.snippet.title;
                                return ret;  
                            }));
                        }
                    }
                    else {
                        //TODO: Sometimes needs oAuth for some reason, I guess privacy settings.
                        console.warn("Can't get favorites for youtube user "+username+" without oAuth as somebody with reading rights of this user's subs.");
                    }
                });
            }
        });
    },
    getChannelDetails: function(username, callback) {
        qs.queueRequest(baseURL+"channels?"+querystring.stringify(
            {
                "part": "id,snippet",
                "forUsername": username,
                "fields": "items(id,snippet/title,snippet/thumbnails)",
                "key": apiKey
            }), headers, requeue, function(data) {
            if(data.json && data.json.items && data.json.items.length) {
                var ch = new Channel();
                ch.login = data.json.items[0].id;
                ch.type = type;
                ch.url.push("http://youtube.com/channel/"+ch.login);
                ch.archiveUrl = "http://youtube.com/channel/"+ch.login+"/videos";
                ch.chatUrl = "http://youtube.com/channel/"+ch.login+"/discussion";
                ch.image = { "88": data.json.items[0].snippet.thumbnails.default.url,
                             "240": data.json.items[0].snippet.thumbnails.high.url
                           };
                ch.uname = data.json.items[0].snippet.title;
                callback(ch);
            }
        });
    },
    updateFavsRequest: function(users, userCallback, channelsCallback) {
        var urls = users.map(function(user) {
            return baseURL+"channels?"+querystring.stringify(
                {
                    "part": "id,snippet",
                    "id": user.login,
                    "fields": "items(id,snippet/title,snippet/thumbnails)",
                    "key": apiKey
                });
        });
        qs.queueUpdateRequest(urls, headers, qs.LOW_PRIORITY, requeue, function(data) {
            if(data.json && data.json.items && data.json.items.length) {
                var ch = new User(), subs = [], page = 0, subsOptions = {
                    "part": "snippet",
                    "channelId": data.json.items[0].id,
                    "maxResults": 50,
                    "key": apiKey
                };
                ch.login = data.json.items[0].id;
                ch.type = type;
                ch.image = { "88": data.json.items[0].snippet.thumbnails.default.url,
                             "240": data.json.items[0].snippet.thumbnails.high.url
                           };
                ch.uname = data.json.items[0].snippet.title;
                qs.queueRequest(baseURL+"subscriptions?"+querystring.stringify(subsOptions), headers, requeue, function favsCbk(subscriptions) {
                    if(subscriptions.json && subscriptions.json.items) {
                        subs = subs.concat(subscriptions.json.items);
                        if(subscriptions.json.pageInfo.totalResults > subscriptions.json.pageInfo.resultsPerPage*++page) {
                            subsOptions.pageToken = subscriptions.json.nextPageToken;
                            qs.queueRequest(baseURL+"subscriptions?"+querystring.stringify(subsOptions), headers, requeue, favsCbk);
                            return;
                        }
                        else {
                            ch.favorites = subs.map((sub) => { return sub.snippet.channelId; });
                            userCallback(ch);
                            channelsCallback(subs.map(function(sub) {
                                var ret = new Channel();
                                ret.login = sub.snippet.resourceId.channelId;
                                ret.type = type;
                                ret.archiveUrl = "http://youtube.com/channel/"+ch.login+"/videos";
                                ret.chatUrl = "http://youtube.com/channel/"+ch.login+"/discussion";
                                ret.image = { "88": sub.snippet.thumbnails.default.url,
                                             "240": sub.snippet.thumbnails.high.url };
                                ret.uname = sub.snippet.title; 
                                return ret; 
                            }));
                        }
                    }
                    else {
                        //TODO: Sometimes needs oAuth for some reason, I guess privacy settings.
                        console.warn("Can't get favorites for youtube user "+username+" without oAuth as somebody with reading rights of this user's subs.");
                    }
                });
            }
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
         getChannelById(channellogin, function(ch) {                        
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

