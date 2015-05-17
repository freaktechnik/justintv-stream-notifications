/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 *
 * YouTube provider
 */

"use strict";
var _ = require("sdk/l10n").get;
const { prefs } = require("sdk/simple-prefs"),
      querystring = require("sdk/querystring"),
      { getPreferedLocales } = require("sdk/l10n/locale");
var { Channel, User } = require('../channeluser'),
     { PaginationHelper } = require('../pagination-helper');

var type = "youtube",
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
    authURL: ["https://accounts.google.com"],
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
                var ch = new User(), page = 0, subsOptions = {
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
                new PaginationHelper({
                    url: baseURL+"subscriptions?"+querystring.stringify(subsOptions),
                    pageSize: 50,
                    initialPage: "",
                    request: function(url, callback) {
                        qs.queueRequest(url, headers, requeue, callback);
                    },
                    getPageNumber: function(page, pageSize, data) {
                        return data.json.nextPageToken;
                    },
                    fetchNextPage: function(data) {
                        return data.json && data.json.items && data.json.pageInfo.totalResults > data.json.pageInfo.resultsPerPage*++page;
                    },
                    getItems: function(data) {
                        if(data.json && data.json.items)
                            return data.json.items;
                        else
                            return [];
                    },
                    onComplete: function(subscriptions) {
                        if(subscriptions.length) {
                            ch.favorites = subscriptions.map((sub) => { return sub.snippet.resourceId.channelId; });
                            userCallback(ch);
                            channelsCallback(subscriptions.map(function(sub) {
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
                        else {
                            //TODO: Sometimes needs oAuth for some reason, I guess privacy settings.
                            console.warn("Can't get favorites for youtube user "+username+" without oAuth as somebody with reading rights of this user's subs.");
                        }
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
                var ch = new User(), page = 0, subsOptions = {
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
                new PaginationHelper({
                    url: baseURL+"subscriptions?"+querystring.stringify(subsOptions),
                    pageSize: 50,
                    initialPage: "",
                    request: function(url, callback) {
                        qs.queueRequest(url, headers, requeue, function(data) {
                            callback(data);
                        });
                    },
                    getPageNumber: function(page, pageSize, data) {
                        return data.json.nextPageToken;
                    },
                    fetchNextPage: function(data) {
                        return data.json && data.json.items && data.json.pageInfo.totalResults > data.json.pageInfo.resultsPerPage*++page;
                    },
                    getItems: function(data) {
                        if(data.json && data.json.items)
                            return data.json.items;
                        else
                            return [];
                    },
                    onComplete: function(subscriptions) {
                        if(subscriptions.length) {
                            ch.favorites = subscriptions.map((sub) => { return sub.snippet.resourceId.channelId; });
                            userCallback(ch);
                            var oldUser = users.find((usr) => usr.login === ch.login);
                            channelsCallback(subscriptions.filter(function(follow) {
                                return !oldUser.favorites.some((fav) => fav === follow.snippet.resourceId.channelId);
                            }).map(function(sub) {
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
                        else {
                            //TODO: Sometimes needs oAuth for some reason, I guess privacy settings.
                            console.warn("Can't get favorites for youtube user "+ch.uname+" without oAuth as somebody with reading rights of this user's subs.");
                        }
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
            var channelLogin = url.match(/channelId=([\w-]+)?&/)[1],
                channel = channels.find((channel) => { return channelLogin == channel.login; });
            if(data.json && data.json.items && data.json.items.length) {
                qs.queueRequest(baseURL+"videos?"+querystring.stringify(
                            {
                                "part": "snippet, liveStreamingDetails",
                                "id": data.json.items[0].id.videoId,
                                "fields": "items(snippet/categoryId,liveStreamingDetails/concurrentViewers)",
                                "key": apiKey
                            }
                        ), headers, requeue, function(video) {
                            channel.live = true;
                            channel.url = ["http://youtube.com/watch?v="+data.json.items[0].id.videoId];
                            channel.title = data.json.items[0].snippet.title;
                            channel.thumbnail = data.json.items[0].snippet.thumbnails.medium.url;
                            if(video.json && video.json.items) {
                                channel.viewers = video.json.items[0].liveStreamingDetails.concurrentViewers;
                                qs.queueRequest(baseURL + "videoCategories?" + querystring.stringify({
                                    "part": "snippet",
                                    "id": video.json.items[0].snippet.categoryId,
                                    "hl": getPreferedLocales(true)[0].replace("-","_"),
                                    "key": apiKey
                                }), headers, requeue, function(category) {
                                    if(category.json && category.json.items)
                                        channel.category = category.json.items[0].snippet.title;
                                    callback(channel);
                                });
                            }
                            else {
                                callback(channel);
                            }
                        });
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
                        qs.queueRequest(baseURL+"videos?"+querystring.stringify(
                            {
                                "part": "snippet, liveStreamingDetails",
                                "id": response.json.items[0].id.videoId,
                                "fields": "items(snippet/categoryId,liveStreamingDetails/concurrentViewers)",
                                "key": apiKey
                            }
                        ), headers, requeue, function(video) {
                            ch.live = true;
                            ch.url.push("http://youtube.com/watch?v="+response.json.items[0].id.videoId);
                            ch.title = response.json.items[0].snippet.title;
                            ch.thumbnail = response.json.items[0].snippet.thumbnails.medium.url;
                            if(video.json && video.json.items) {
                                ch.viewers = video.json.items[0].liveStreamingDetails.concurrentViewers;
                                qs.queueRequest(baseURL + "videoCategories?" + querystring.stringify({
                                    "part": "snippet",
                                    "id": video.json.items[0].snippet.categoryId,
                                    "hl": getPreferedLocales(true)[0].replace("-","_"),
                                    "key": apiKey
                                }), headers, requeue, function(category) {
                                    if(category.json && category.json.items)
                                        ch.category = category.json.items[0].snippet.title;
                                    callback(ch);
                                });
                            }
                            else {
                                callback(ch);
                            }
                        });
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

