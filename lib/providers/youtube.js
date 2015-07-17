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

let { Task: { async } } = require("resource://gre/modules/Task.jsm");
const { all, reject } = require("sdk/core/promise");

var { Channel, User } = require('../channeluser'),
     { PaginationHelper } = require('../pagination-helper');

var type = "youtube",
    apiKey = prefs.youtube_apiKey,
    headers = {
        "Referer": "extension:jtvn.humanoids.be"
    },
    baseURL = "https://www.googleapis.com/youtube/v3/";

var qs = require("../queueservice").getServiceForProvider(type);

var getLocale = function() {
    return getPreferedLocales(true)[0].replace("-","_");
};

function requeue(data) {
    return data.status > 499;
}

const getChannelById = function(channelId) {
    return qs.queueRequest(baseURL+"channels?"+querystring.stringify(
        {
            "part": "snippet",
            "id": channelId,
            "fields": "items(snippet/title,snippet/thumbnails)",
            "key": apiKey
        }), headers, requeue).then(function(data) {
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
            return ch;
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
        return qs.queueRequest(baseURL+"channels?"+querystring.stringify(
            {
                "part": "id,snippet",
                "forUsername": username,
                "fields": "items(id,snippet/title,snippet/thumbnails)",
                "key": apiKey
            }), headers, requeue).then(function(data) {
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
                        qs.queueRequest(url, headers, requeue).then(callback);
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
    getChannelDetails: function(username) {
        return qs.queueRequest(baseURL+"channels?"+querystring.stringify(
            {
                "part": "id,snippet",
                "forUsername": username,
                "fields": "items(id,snippet/title,snippet/thumbnails)",
                "key": apiKey
            }), headers, requeue).then(function(data) {
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
                return ch;
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
                        qs.queueRequest(url, headers, requeue).then(callback);
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
                    "part": "id",
                    "channelId": channel.login,
                    "fields": "items(id/videoId)",
                    "maxResults": 1,
                    "eventType": "live",
                    "type": "video",
                    "key": apiKey
                }
            );
        });

        var getLiveStreams = function(ids) {
            return qs.queueRequest(baseURL+"videos?"+querystring.stringify(
                {
                    "part": "id, snippet, liveStreamingDetails",
                    "id": ids,
                    "fields": "items(id,snippet(channelId,title,thumbnails/medium/url,categoryId),liveStreamingDetails/concurrentViewers)",
                    "key": apiKey,
                    "hl": getLocale()
                }
            ), headers, requeue).then(function(videos) {
                if(videos.json && videos.json.items) {
                    return all(videos.json.items.map(function(video) {
                        var channel = channels.find((channel) => channel.login == video.snippet.channelId);
                        channel.live = true;
                        channel.url = ["http://youtube.com/watch?v="+video.id];
                        channel.title = video.snippet.title;
                        channel.thumbnail = video.snippet.thumbnails.medium.url;
                        channel.viewers = video.liveStreamingDetails.concurrentViewers;
                        return qs.queueRequest(baseURL + "videoCategories?" + querystring.stringify({
                            "part": "snippet",
                            "id": video.snippet.categoryId,
                            "hl": getLocale(),
                            "key": apiKey
                        }), headers, requeue).then(function(category) {
                            if(category.json && category.json.items)
                                channel.category = category.json.items[0].snippet.title;
                            return channel;
                        });
                    }));
                }
                else {
                    return reject();
                }
            });
        };

        //TODO there should be a way to do this with a generator.

        var ids = [], offlineCount = 0, done = function(id) {
            if(id) {
                ids.push(id);
            }
            else {
                offlineCount++;
            }
            if(ids.length + offlineCount == channels.length) {
                getLiveStreams(ids.join(",")).then(callback);
                ids.length = 0;
                offlineCount = 0;
            }
        };
        qs.queueUpdateRequest(urls, headers, qs.HIGH_PRIORITY, requeue, function(data, url) {
            var channelLogin = url.match(/channelId=([\w-]+)?&/)[1],
                channel = channels.find((channel) => { return channelLogin == channel.login; });
            if(data.json && data.json.items && data.json.items.length) {
                done(data.json.items[0].id.videoId);
            }
            else {
                channel.live = false;
                channel.url = [ "http://youtube.com/channel/"+channel.login ];
                callback(channel);
                done();
            }
        });
    },
    removeRequest: function() {
        qs.unqueueUpdateRequest(qs.HIGH_PRIORITY);
    },
    updateChannel: async(function*(channellogin) {
         let [ ch, response ] = yield all([
            getChannelById(channellogin),
            qs.queueRequest(baseURL+"search?"+querystring.stringify(
                {
                    "part": "id",
                    "channelId": channellogin,
                    "fields": "items(id/videoId)",
                    "maxResults": 1,
                    "eventType": "live",
                    "type": "video",
                    "key": apiKey
                }), headers, requeue)
        ]);

        if(response.json && response.json.items) {
            if(response.json.items.length) {
                let video = yield qs.queueRequest(baseURL+"videos?"+querystring.stringify(
                    {
                        "part": "snippet, liveStreamingDetails",
                        "id": response.json.items[0].id.videoId,
                        "fields": "items(snippet(categoryId,title,thumbnails/medium/url),liveStreamingDetails/concurrentViewers)",
                        "key": apiKey,
                        "hl": getLocale()
                    }
                ), headers, requeue);

                ch.live = true;
                ch.url.push("http://youtube.com/watch?v="+response.json.items[0].id.videoId);
                if(video.json && video.json.items) {
                    ch.title = video.json.items[0].snippet.title;
                    ch.thumbnail = video.json.items[0].snippet.thumbnails.medium.url;
                    ch.viewers = video.json.items[0].liveStreamingDetails.concurrentViewers;
                    let category = yield qs.queueRequest(baseURL + "videoCategories?" + querystring.stringify({
                        "part": "snippet",
                        "id": video.json.items[0].snippet.categoryId,
                        "hl": getLocale(),
                        "key": apiKey
                    }), headers, requeue);

                    if(category.json && category.json.items)
                        ch.category = category.json.items[0].snippet.title;
                }
            }
            else {
                ch.live = false;
                ch.url.push("http://youtube.com/channel/"+ch.login);
            }

            return ch;
        }
    }),
    updateChannels: async(function*(channels, callback) {
        let streamIds = yield all(channels.map((channel) => {
            return qs.queueRequest(baseURL+"search?"+querystring.stringify(
                {
                    "part": "id",
                    "channelId": channel.login,
                    "fields": "items(id/videoId)",
                    "maxResults": 1,
                    "eventType": "live",
                    "type": "video",
                    "key": apiKey
                }), headers, requeue).then(function(response) {
                if(response.json && response.json.items) {
                    if(response.json.items.length) {
                        return response.json.items[0].id.videoId;
                    }
                    else {
                        channel.live = false;
                        channel.url = [ "http://youtube.com/channel/"+channel.login ];
                        callback(channel);
                        return null;
                    }
                }
                // silently ignore errors
            });
        }));

        streamIds = streamIds.filter((id) => id !== null);

        let videos = yield qs.queueRequest(baseURL+"videos?"+querystring.stringify(
            {
                "part": "id, snippet, liveStreamingDetails",
                "id": streamIds.join(","),
                "fields": "items(id,snippet(channelId,title,thumbnails/medium/url,categoryId),liveStreamingDetails/concurrentViewers)",
                "key": apiKey,
                "hl": getLocale()
            }
        ), headers, requeue);

        if(videos.json && videos.json.items) {
            let chans = yield all(videos.json.items.map(function(video) {
                var channel = channels.find((channel) => channel.login == video.snippet.channelId);
                channel.live = true;
                channel.url = ["http://youtube.com/watch?v="+video.id];
                channel.title = video.snippet.title;
                channel.thumbnail = video.snippet.thumbnails.medium.url;
                channel.viewers = video.liveStreamingDetails.concurrentViewers;
                return qs.queueRequest(baseURL + "videoCategories?" + querystring.stringify({
                    "part": "snippet",
                    "id": video.snippet.categoryId,
                    "hl": getLocale(),
                    "key": apiKey
                }), headers, requeue).then(function(category) {
                    if(category.json && category.json.items)
                        channel.category = category.json.items[0].snippet.title;
                    return channel;
                });
            }));

            callback(chans);
            return channels;
        }
    })
};

module.exports = YouTube;

