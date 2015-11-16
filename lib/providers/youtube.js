/**
 * YouTube provider
 * @author Martin Giger
 * @license MPL-2.0
 * @module providers/youtube
 */

"use strict";
const { Class: newClass } = require("sdk/core/heritage");
const { emit } = require("sdk/event/core");
const { prefs } = require("sdk/simple-prefs"),
      querystring = require("sdk/querystring"),
      { getPreferedLocales } = require("sdk/l10n/locale");
const { memoize } = require("sdk/lang/functional");

let { Task: { async } } = require("resource://gre/modules/Task.jsm");
const { all, reject } = require("sdk/core/promise");

var { Channel, User } = require('../channel/core'),
     { PaginationHelper, promisedPaginationHelper } = require('../pagination-helper');
 const { GenericProvider } = require("./generic-provider");

var type = "youtube",
    apiKey = prefs.youtube_apiKey,
    headers = {
        "Referer": "extension:jtvn.humanoids.be"
    },
    baseURL = "https://www.googleapis.com/youtube/v3/";

var getLocale = function() {
    return getPreferedLocales(true)[0].replace("-","_");
};

const YouTube = newClass(
/** @lends YouTube.prototye */
{
    extends: GenericProvider,
    _getChannelById: async(function*(channelId) {
        let data = yield this._qs.queueRequest(baseURL+"channels?"+querystring.stringify(
            {
                "part": "snippet",
                "id": channelId,
                "fields": "items(snippet/title,snippet/thumbnails)",
                "key": apiKey
            }), headers);
        if(data.json && data.json.items && data.json.items.length) {
            var ch = new Channel(channelId, this._type);
            ch.url.push("https://youtube.com/channel/"+ch.login+"/live");
            ch.url.push("https://gaming.youtube.com/channel/"+ch.login+"/live");
            ch.archiveUrl = "https://youtube.com/channel/"+ch.login+"/videos";
            ch.chatUrl = "https://youtube.com/channel/"+ch.login+"/discussion";
            ch.image = { "88": data.json.items[0].snippet.thumbnails.default.url,
                         "240": data.json.items[0].snippet.thumbnails.high.url
                       };
            ch.uname = data.json.items[0].snippet.title;
            return ch;
        }
        else {
            throw "Getting channel details failed: "+data.status;
        }
    }),
    /**
     * Get the name for a category. Does caching.
     * @argument {string} categoryId
     * @return {Promise.<string>}
     * @todo Handle locale changes -> use memoize and make lang an argument?
     * @method
     */
    _getCategory: memoize(async(function*(categoryId) {
        console.info(this.name+"._getCategory(", categoryId, ")");
        let data = yield this._qs.queueRequest(baseURL + "videoCategories?" + querystring.stringify({
            "part": "snippet",
            "id": categoryId,
            "hl": getLocale(),
            "key": apiKey
        }), headers);

        if(data.json && "items" in data.json && data.json.items.length) {
            return data.json.items[0].snippet.title;
        }
        else {
            return '';
        }
    }), (id) => id+"|"+getLocale()),
    authURL: ["https://accounts.google.com"],
    _supportsFavorites: true,
    _supportsFeatured: true,
    getUserFavorites: async(function*(username) {
        let data = yield this._qs.queueRequest(baseURL+"channels?"+querystring.stringify(
            {
                "part": "id,snippet",
                "forUsername": username,
                "fields": "items(id,snippet/title,snippet/thumbnails)",
                "key": apiKey
            }), headers);

        if(data.json && data.json.items && data.json.items.length) {
            var ch = new User(data.json.items[0].id, this._type), page = 0,
            subsOptions = {
                "part": "snippet",
                "channelId": data.json.items[0].id,
                "maxResults": 50,
                "key": apiKey
            };
            ch.image = { "88": data.json.items[0].snippet.thumbnails.default.url,
                         "240": data.json.items[0].snippet.thumbnails.high.url
                       };
            ch.uname = data.json.items[0].snippet.title;

            let subscriptions = yield promisedPaginationHelper({
                url: baseURL+"subscriptions?"+querystring.stringify(subsOptions),
                pageSize: subsOptions.maxResults,
                initialPage: "",
                request: (url) => {
                    return this._qs.queueRequest(url, headers);
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
                }
            });

            if(subscriptions.length) {
                ch.favorites = subscriptions.map((sub) => sub.snippet.resourceId.channelId);

                let channels = subscriptions.map((sub) => {
                    var ret = new Channel(sub.snippet.resourceId.channelId, this._type);
                    ret.archiveUrl = "https://youtube.com/channel/"+ch.login+"/videos";
                    ret.chatUrl = "https://youtube.com/channel/"+ch.login+"/discussion";
                    ret.image = { "88": sub.snippet.thumbnails.default.url,
                                 "240": sub.snippet.thumbnails.high.url };
                    ret.uname = sub.snippet.title;
                    return ret;
                });

                return [ ch, channels ];
            }
            else {
                /** @todo Sometimes needs oAuth for some reason, I guess privacy settings. */
                throw "Can't get favorites for youtube user "+username+" without oAuth as somebody with reading rights of this user's subs.";
            }
        }
        else {
            throw "Error getting details for youtube user "+username;
        }
    }),
    getChannelDetails: function(username) {
        return this._qs.queueRequest(baseURL+"channels?"+querystring.stringify(
            {
                "part": "id,snippet",
                "forUsername": username,
                "fields": "items(id,snippet/title,snippet/thumbnails)",
                "key": apiKey
            }), headers).then((data) => {
            if(data.json && data.json.items && data.json.items.length) {
                var ch = new Channel(data.json.items[0].id, this._type);
                ch.url.push("https://youtube.com/channel/"+ch.login);
                ch.archiveUrl = "https://youtube.com/channel/"+ch.login+"/videos";
                ch.chatUrl = "https://youtube.com/channel/"+ch.login+"/discussion";
                ch.image = { "88": data.json.items[0].snippet.thumbnails.default.url,
                             "240": data.json.items[0].snippet.thumbnails.high.url
                           };
                ch.uname = data.json.items[0].snippet.title;
                return ch;
            }
            else {
                throw "Could not get details for channel " + username + " on " + this.name;
            }
        });
    },
    updateFavsRequest: function(users) {
        var urls = users.map(function(user) {
            return baseURL+"channels?"+querystring.stringify(
                {
                    "part": "id,snippet",
                    "id": user.login,
                    "fields": "items(id,snippet/title,snippet/thumbnails)",
                    "key": apiKey
                });
        });
        this._qs.queueUpdateRequest(urls, this._qs.LOW_PRIORITY, (data) => {
            if(data.json && data.json.items && data.json.items.length) {
                var ch = new User(data.json.items[0].id, this._type), page = 0,
                subsOptions = {
                    "part": "snippet",
                    "channelId": data.json.items[0].id,
                    "maxResults": 50,
                    "key": apiKey
                };
                ch.image = { "88": data.json.items[0].snippet.thumbnails.default.url,
                             "240": data.json.items[0].snippet.thumbnails.high.url
                           };
                ch.uname = data.json.items[0].snippet.title;
                new PaginationHelper({
                    url: baseURL+"subscriptions?"+querystring.stringify(subsOptions),
                    pageSize: subsOptions.maxResults,
                    initialPage: "",
                    request: (url) => {
                        return this._qs.queueRequest(url, headers);
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
                    onComplete: (subscriptions) => {
                        if(subscriptions.length) {
                            var oldUser = users.find((usr) => usr.login === ch.login);
                            ch.id = oldUser.id;
                            ch.favorites = subscriptions.map((sub) => sub.snippet.resourceId.channelId);
                            emit(this, "updateduser", ch);
                            emit(this, "newchannels", subscriptions.filter(function(follow) {
                                return !oldUser.favorites.some((fav) => fav === follow.snippet.resourceId.channelId);
                            }).map((sub) => {
                                var ret = new Channel(sub.snippet.resourceId.channelId, this._type);
                                ret.archiveUrl = "https://youtube.com/channel/"+ch.login+"/videos";
                                ret.chatUrl = "https://youtube.com/channel/"+ch.login+"/discussion";
                                ret.image = { "88": sub.snippet.thumbnails.default.url,
                                             "240": sub.snippet.thumbnails.high.url };
                                ret.uname = sub.snippet.title;
                                return ret;
                            }));

                            oldUser.favorites = ch.favorites;
                        }
                        else {
                            /** @todo Sometimes needs oAuth for some reason, I guess privacy settings. */
                            console.warn("Can't get favorites for youtube user "+ch.uname+" without oAuth as somebody with reading rights of this user's subs.");
                        }
                    }
                });
            }
        }, headers);
    },
    updateRequest: function(channels) {
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

        var getLiveStreams = (ids) => {
            return this._qs.queueRequest(baseURL+"videos?"+querystring.stringify(
                {
                    "part": "id, snippet, liveStreamingDetails",
                    "id": ids,
                    "fields": "items(id,snippet(channelId,title,thumbnails/medium/url,categoryId),liveStreamingDetails/concurrentViewers)",
                    "key": apiKey,
                    "hl": getLocale()
                }
            ), headers).then((videos) => {
                if(videos.json && videos.json.items) {
                    return all(videos.json.items.map((video) => {
                        return this._getCategory(video.snippet.categoryId).then(function(category) {
                            var channel = channels.find((channel) => channel.login == video.snippet.channelId);
                            channel.live = true;
                            channel.url = [
                                "https://youtube.com/watch?v="+video.id,
                                "https://gaming.youtube.com/watch?v="+video.id,
                                "https://youtube.com/channel/"+channel.login+"/live",
                                "https://gaming.youtube.com/channel/"+channel.login+"/live"
                            ];
                            channel.title = video.snippet.title;
                            channel.thumbnail = video.snippet.thumbnails.medium.url;
                            channel.viewers = video.liveStreamingDetails.concurrentViewers;
                            channel.category = category;
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

        var ids = [], offlineCount = 0, done = (id) => {
            if(id) {
                ids.push(id);
            }
            else {
                offlineCount++;
            }
            if(ids.length + offlineCount == channels.length) {
                getLiveStreams(ids.join(",")).then((chans) => {
                    emit(this, "updatedchannels", chans);
                });
                ids.length = 0;
                offlineCount = 0;
            }
        };
        this._qs.queueUpdateRequest(urls, this._qs.HIGH_PRIORITY, (data, url) => {
            var channelLogin = url.match(/channelId=([\w-]+)?&/)[1],
                channel = channels.find((channel) => { return channelLogin == channel.login; });
            if(data.json && data.json.items && data.json.items.length) {
                done(data.json.items[0].id.videoId);
            }
            else {
                channel.live = false;
                channel.url = [ "https://youtube.com/channel/"+channel.login ];
                emit(this, "updatedchannels", channel);
                done();
            }
        }, headers);
    },
    updateChannel: async(function*(channellogin) {
         let [ ch, response ] = yield all([
            this._getChannelById(channellogin),
            this._qs.queueRequest(baseURL+"search?"+querystring.stringify(
                {
                    "part": "id",
                    "channelId": channellogin,
                    "fields": "items(id/videoId)",
                    "maxResults": 1,
                    "eventType": "live",
                    "type": "video",
                    "key": apiKey
                }), headers)
        ]);

        if(response.json && response.json.items) {
            if(response.json.items.length) {
                ch.live = true;
                ch.url.push("https://youtube.com/watch?v="+response.json.items[0].id.videoId);
                ch.url.push("https://gaming.youtube.com/watch?v="+response.json.items[0].id.videoId);

                let video = yield this._qs.queueRequest(baseURL+"videos?"+querystring.stringify(
                    {
                        "part": "snippet, liveStreamingDetails",
                        "id": response.json.items[0].id.videoId,
                        "fields": "items(snippet(categoryId,title,thumbnails/medium/url),liveStreamingDetails/concurrentViewers)",
                        "key": apiKey,
                        "hl": getLocale()
                    }
                ), headers);
                if(video.json && video.json.items) {
                    ch.title = video.json.items[0].snippet.title;
                    ch.thumbnail = video.json.items[0].snippet.thumbnails.medium.url;
                    ch.viewers = video.json.items[0].liveStreamingDetails.concurrentViewers;
                    ch.category = yield this._getCategory(video.json.items[0].snippet.categoryId);
                }
            }
            else {
                ch.live = false;
                ch.url.push("https://youtube.com/channel/"+ch.login);
            }

            return ch;
        }
    }),
    updateChannels: async(function*(channels) {
        let streamIds = yield all(channels.map((channel) => {
            return this._qs.queueRequest(baseURL+"search?"+querystring.stringify(
                {
                    "part": "id",
                    "channelId": channel.login,
                    "fields": "items(id/videoId)",
                    "maxResults": 1,
                    "eventType": "live",
                    "type": "video",
                    "key": apiKey
                }), headers).then(function(response) {
                if(response.json && response.json.items) {
                    if(response.json.items.length) {
                        return response.json.items[0].id.videoId;
                    }
                    else {
                        channel.live = false;
                        channel.url = [ "https://youtube.com/channel/"+channel.login ];
                        return null;
                    }
                }
                // silently ignore errors
            });
        }));

        streamIds = streamIds.filter((id) => id !== null);

        let videos = yield this._qs.queueRequest(baseURL+"videos?"+querystring.stringify(
            {
                "part": "id, snippet, liveStreamingDetails",
                "id": streamIds.join(","),
                "fields": "items(id,snippet(channelId,title,thumbnails/medium/url,categoryId),liveStreamingDetails/concurrentViewers)",
                "key": apiKey,
                "hl": getLocale()
            }
        ), headers);

        if(videos.json && videos.json.items) {
            yield all(videos.json.items.map((video) => {
                return this._getCategory(video.snippet.categoryId).then(function(category) {
                    var channel = channels.find((channel) => channel.login == video.snippet.channelId);
                    channel.live = true;
                    channel.url = [
                        "https://youtube.com/watch?v="+video.id,
                        "https://gaming.youtube.com/watch?v="+video.id,
                        "https://youtube.com/channel/"+channel.login+"/live",
                        "https://gaming.youtube.com/channel/"+channel.login+"/live"
                    ];
                    channel.title = video.snippet.title;
                    channel.thumbnail = video.snippet.thumbnails.medium.url;
                    channel.viewers = video.liveStreamingDetails.concurrentViewers;
                    channel.category = category;
                    return channel;
                });
            }));
        }

        return channels;
    }),
    getFeaturedChannels: function() {
        return this.search("");
    },
    search: async(function*(query) {
         let response = yield this._qs.queueRequest(baseURL+"search?"+querystring.stringify(
             {
                 "part": "id",
                 "fields": "items(id/videoId)",
                 "eventType": "live",
                 "type": "video",
                 "order": "relevance",
                 "relevanceLanguage": getPreferedLocales(true)[0].substr(0,2),
                 "safeSearch": this._mature ? "moderate" : "strict",
                 "q": query,
                 "key": apiKey
             }
         ), headers);

         let streamIds = [];
         if(response.json && response.json.items && response.json.items.length)
              streamIds = response.json.items.map((entry) => entry.id.videoId);
         else
            throw "No search results found for " + this.name + " with " + query;

         let videos = yield this._qs.queueRequest(baseURL+"videos?"+querystring.stringify(
             {
                 "part": "id, snippet, liveStreamingDetails",
                 "id": streamIds.join(","),
                 "fields": "items(id,snippet(channelId,title,thumbnails/medium/url,categoryId),liveStreamingDetails/concurrentViewers)",
                 "key": apiKey,
                 "hl": getLocale()
             }
         ), headers);

         if(videos.json && videos.json.items) {
             return yield all(videos.json.items.map(async(function*(video) {
                 var channel = yield this._getChannelById(video.snippet.channelId);
                 channel.live = true;
                 channel.url = [
                     "https://youtube.com/watch?v="+video.id,
                     "https://gaming.youtube.com/watch?v="+video.id
                 ];
                 channel.title = video.snippet.title;
                 channel.thumbnail = video.snippet.thumbnails.medium.url;
                 if("liveStreamingDetails" in video)
                    channel.viewers = video.liveStreamingDetails.concurrentViewers;
                 channel.category = yield this._getCategory(video.snippet.categoryId);

                 return channel;
             }).bind(this)));
         }

         throw "None of the searchresults exist for " + this.name;
     })
});

module.exports = new YouTube(type);

