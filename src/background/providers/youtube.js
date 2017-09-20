/**
 * YouTube provider
 * @author Martin Giger
 * @license MPL-2.0
 * @module providers/youtube
 */
import prefs from "../../preferences";
import querystring from "../querystring";
import { memoize } from "lodash";
import { Channel, User } from '../channel/core';
import { promisedPaginationHelper } from '../pagination-helper';
import GenericProvider from "./generic-provider";
import { filterExistingFavs } from '../channel/utils';

const type = "youtube",
    apiKey = prefs.get('youtube_apiKey'),
    baseURL = "https://www.googleapis.com/youtube/v3/",
    getLocale = () => {
        return browser.i18n.getUILanguage().replace("-", "_");
    };

class YouTube extends GenericProvider {
    constructor(type) {
        super(type);
        /**
         * Get the name for a category. Does caching.
         *
         * @argument {string} categoryId
         * @return {string}
         * @async
         * @method
         */
        this._getCategory = memoize(async (categoryId) => {
            const data = await this._qs.queueRequest(baseURL + "videoCategories?" + querystring.stringify({
                "part": "snippet",
                "id": categoryId,
                "hl": getLocale(),
                "key": await apiKey
            }));

            if(data.parsedJSON && "items" in data.parsedJSON && data.parsedJSON.items.length) {
                return data.parsedJSON.items[0].snippet.title;
            }
            else {
                return '';
            }
        }, (id) => id + "|" + getLocale());

        this.authURL = [ "https://accounts.google.com" ];
        this._supportsFavorites = true;
        this._supportsFeatured = true;

        this.initialize();
    }

    async _getChannelById(channelId) {
        const data = await this._qs.queueRequest(baseURL + "channels?" + querystring.stringify(
            {
                part: "snippet",
                id: channelId,
                fields: "items(snippet/title,snippet/thumbnails)",
                key: await apiKey
            }));
        if(data.parsedJSON && data.parsedJSON.items && data.parsedJSON.items.length) {
            const ch = new Channel(channelId, this._type);
            ch.url.push("https://youtube.com/channel/" + ch.login + "/live");
            ch.url.push("https://gaming.youtube.com/channel/" + ch.login + "/live");
            ch.archiveUrl = "https://youtube.com/channel/" + ch.login + "/videos";
            ch.chatUrl = "https://youtube.com/channel/" + ch.login + "/discussion";
            ch.image = {
                "88": data.parsedJSON.items[0].snippet.thumbnails.default.url,
                "240": data.parsedJSON.items[0].snippet.thumbnails.high.url
            };
            ch.uname = data.parsedJSON.items[0].snippet.title;
            return ch;
        }
        else {
            throw new Error("Getting channel details failed: " + data.status);
        }
    }

    async getUserFavorites(username) {
        const data = await this._qs.queueRequest(baseURL + "channels?" + querystring.stringify(
            {
                part: "id,snippet",
                forUsername: username,
                fields: "items(id,snippet/title,snippet/thumbnails)",
                key: await apiKey
            }));

        if(data.parsedJSON && data.parsedJSON.items && data.parsedJSON.items.length) {
            const ch = new User(data.parsedJSON.items[0].id, this._type),
                subsOptions = {
                    part: "snippet",
                    channelId: data.parsedJSON.items[0].id,
                    maxResults: 50,
                    key: await apiKey
                },
                subscriptions = await promisedPaginationHelper({
                    url: baseURL + "subscriptions?" + querystring.stringify(subsOptions),
                    pageSize: subsOptions.maxResults,
                    initialPage: "",
                    request: (url) => {
                        return this._qs.queueRequest(url);
                    },
                    getPageNumber(page, pageSize, data) {
                        return '&pageToken=' + data.parsedJSON.nextPageToken;
                    },
                    fetchNextPage(data) {
                        return data.parsedJSON && data.parsedJSON.items && "nextPageToken" in data.parsedJSON;
                    },
                    getItems(data) {
                        if(data.parsedJSON && data.parsedJSON.items) {
                            return data.parsedJSON.items;
                        }
                        else {
                            return [];
                        }
                    }
                });
            if(subscriptions.length) {
                ch.image = {
                    "88": data.parsedJSON.items[0].snippet.thumbnails.default.url,
                    "240": data.parsedJSON.items[0].snippet.thumbnails.high.url
                };
                ch.uname = data.parsedJSON.items[0].snippet.title;
                ch.favorites = subscriptions.map((sub) => sub.snippet.resourceId.channelId);

                const channels = subscriptions.map((sub) => {
                    const ret = new Channel(sub.snippet.resourceId.channelId, this._type);
                    ret.archiveUrl = "https://youtube.com/channel/" + ret.login + "/videos";
                    ret.chatUrl = "https://youtube.com/channel/" + ret.login + "/discussion";
                    ret.image = {
                        "88": sub.snippet.thumbnails.default.url,
                        "240": sub.snippet.thumbnails.high.url
                    };
                    ret.uname = sub.snippet.title;
                    return ret;
                });

                return [ ch, channels ];
            }
            else {
                /** @todo Sometimes needs oAuth for some reason, I guess privacy
                  * settings. This also triggers when the user follows noone. */
                throw new Error("Can't get favorites for youtube user " + username + " without oAuth as somebody with reading rights of this user's subs.");
            }
        }
        else {
            throw new Error("Error getting details for youtube user " + username);
        }
    }
    async getChannelDetails(username) {
        const data = await this._qs.queueRequest(baseURL + "channels?" + querystring.stringify(
            {
                part: "id,snippet",
                forUsername: username,
                fields: "items(id,snippet/title,snippet/thumbnails)",
                key: await apiKey
            }));
        if(data.parsedJSON && data.parsedJSON.items && data.parsedJSON.items.length) {
            const ch = new Channel(data.parsedJSON.items[0].id, this._type);
            ch.url.push("https://youtube.com/channel/" + ch.login);
            ch.archiveUrl = "https://youtube.com/channel/" + ch.login + "/videos";
            ch.chatUrl = "https://youtube.com/channel/" + ch.login + "/discussion";
            ch.image = {
                "88": data.parsedJSON.items[0].snippet.thumbnails.default.url,
                "240": data.parsedJSON.items[0].snippet.thumbnails.high.url
            };
            ch.uname = data.parsedJSON.items[0].snippet.title;
            return ch;
        }
        else {
        // Try to get the channel by ID if we can't get it by username.
            return this._getChannelById(username);
        }
    }
    updateFavsRequest() {
        const getURLs = async () => {
            const users = await this._list.getUsers(),
                key = await apiKey;
            return users.map((user) => {
                return baseURL + "channels?" + querystring.stringify({
                    part: "id,snippet",
                    id: user.login,
                    fields: "items(id,snippet/title,snippet/thumbnails)",
                    key
                });
            });
        };
        return {
            getURLs,
            onComplete: async (data) => {
                if(data.parsedJSON && data.parsedJSON.items && data.parsedJSON.items.length) {
                    let page = 0;
                    const ch = new User(data.parsedJSON.items[0].id, this._type),
                        subsOptions = {
                            part: "snippet",
                            channelId: data.parsedJSON.items[0].id,
                            maxResults: 50,
                            key: await apiKey
                        },
                        subscriptions = await promisedPaginationHelper({
                            url: baseURL + "subscriptions?" + querystring.stringify(subsOptions),
                            pageSize: subsOptions.maxResults,
                            initialPage: "",
                            request: (url) => {
                                return this._qs.queueRequest(url);
                            },
                            getPageNumber(page, pageSize, data) {
                                return "&pageToken=" + data.parsedJSON.nextPageToken;
                            },
                            fetchNextPage(data) {
                                return data.parsedJSON && data.parsedJSON.items && data.parsedJSON.pageInfo.totalResults > data.parsedJSON.pageInfo.resultsPerPage * ++page;
                            },
                            getItems(data) {
                                if(data.parsedJSON && data.parsedJSON.items) {
                                    return data.parsedJSON.items;
                                }
                                else {
                                    return [];
                                }
                            }
                        });
                    if(subscriptions.length) {
                        const oldUser = await this._list.getUserByName(ch.login),
                            newChannels = filterExistingFavs(oldUser, subscriptions.map((sub) => {
                                const ret = new Channel(sub.snippet.resourceId.channelId, this._type);
                                ret.archiveUrl = "https://youtube.com/channel/" + ch.login + "/videos";
                                ret.chatUrl = "https://youtube.com/channel/" + ch.login + "/discussion";
                                ret.image = {
                                    "88": sub.snippet.thumbnails.default.url,
                                    "240": sub.snippet.thumbnails.high.url
                                };
                                ret.uname = sub.snippet.title;
                                return ret;
                            }));
                        ch.image = {
                            "88": data.parsedJSON.items[0].snippet.thumbnails.default.url,
                            "240": data.parsedJSON.items[0].snippet.thumbnails.high.url
                        };
                        ch.uname = data.parsedJSON.items[0].snippet.title;
                        ch.id = oldUser.id;
                        ch.favorites = subscriptions.map((sub) => sub.snippet.resourceId.channelId);

                        return [ ch, newChannels ];
                    }
                    else {
                        /** @todo Sometimes needs oAuth for some reason, I guess privacy settings. */
                        console.warn("Can't get favorites for youtube user " + ch.uname + " without oAuth as somebody with reading rights of this user's subs.");
                    }
                }
                return [];
            }
        };
    }
    updateRequest() {
        const getURLs = async () => {
            const channels = await this._list.getChannels(),
                key = await apiKey;
            return channels.map((channel) => {
                return baseURL + "search?" + querystring.stringify({
                    part: "id",
                    channelId: channel.login,
                    fields: "items(id/videoId)",
                    maxResults: 1,
                    eventType: "live",
                    type: "video",
                    key
                });
            });
        };
        return {
            getURLs,
            onComplete: async (data, url) => {
                if(data.parsedJSON && data.parsedJSON.items && data.parsedJSON.items.length) {
                    //TODO could reduce requests by batching them with mutliple IDs. Debounce?
                    const videos = await this._qs.queueRequest(baseURL + "videos?" + querystring.stringify({
                        part: "id, snippet, liveStreamingDetails",
                        id: data.parsedJSON.items[0].id.videoId,
                        fields: "items(id,snippet(channelId,title,thumbnails/medium/url,categoryId),liveStreamingDetails/concurrentViewers)",
                        key: await apiKey,
                        hl: getLocale()
                    }));
                    if(videos.parsedJSON && videos.parsedJSON.items) {
                        const channels = await Promise.all(videos.parsedJSON.items.map(async (video) => {
                            const category = await this._getCategory(video.snippet.categoryId),
                                channel = await this._list.getChannelByName(video.snippet.channelId);
                            channel.live.setLive(true);
                            channel.url = [
                                "https://youtube.com/watch?v=" + video.id,
                                "https://gaming.youtube.com/watch?v=" + video.id,
                                "https://youtube.com/channel/" + channel.login + "/live",
                                "https://gaming.youtube.com/channel/" + channel.login + "/live"
                            ];
                            channel.title = video.snippet.title;
                            channel.thumbnail = video.snippet.thumbnails.medium.url;
                            channel.viewers = video.liveStreamingDetails.concurrentViewers;
                            channel.category = category;
                            return channel;
                        }));
                        return channels;
                    }
                    else {
                        throw new Error("Could not find the given stream");
                    }
                }
                else {
                    const channelLogin = url.match(/channelId=([\w-]+)?&/)[1],
                        channel = await this._list.getChannelByName(channelLogin);
                    channel.live.setLive(false);
                    channel.url = [ "https://youtube.com/channel/" + channel.login ];
                    return channel;
                }
            }
        };
    }
    async updateChannel(channellogin) {
        const [ ch, response ] = await Promise.all([
            this._getChannelById(channellogin),
            apiKey.then((key) => this._qs.queueRequest(baseURL + "search?" + querystring.stringify({
                part: "id",
                channelId: channellogin,
                fields: "items(id/videoId)",
                maxResults: 1,
                eventType: "live",
                type: "video",
                key
            })))
        ]);

        if(response.parsedJSON && response.parsedJSON.items) {
            if(response.parsedJSON.items.length) {
                ch.live.setLive(true);
                ch.url.push("https://youtube.com/watch?v=" + response.parsedJSON.items[0].id.videoId);
                ch.url.push("https://gaming.youtube.com/watch?v=" + response.parsedJSON.items[0].id.videoId);

                const video = await this._qs.queueRequest(baseURL + "videos?" + querystring.stringify({
                    part: "snippet, liveStreamingDetails",
                    id: response.parsedJSON.items[0].id.videoId,
                    fields: "items(snippet(categoryId,title,thumbnails/medium/url),liveStreamingDetails/concurrentViewers)",
                    key: await apiKey,
                    hl: getLocale()
                }));
                if(video.parsedJSON && video.parsedJSON.items) {
                    ch.title = video.parsedJSON.items[0].snippet.title;
                    ch.thumbnail = video.parsedJSON.items[0].snippet.thumbnails.medium.url;
                    ch.viewers = video.parsedJSON.items[0].liveStreamingDetails.concurrentViewers;
                    ch.category = await this._getCategory(video.parsedJSON.items[0].snippet.categoryId);
                }
            }
            else {
                ch.live.setLive(false);
                ch.url.push("https://youtube.com/channel/" + ch.login);
            }

            return ch;
        }
    }
    async updateChannels(channels) {
        let streamIds = await Promise.all(channels.map(async (channel) => {
            const response = await this._qs.queueRequest(baseURL + "search?" + querystring.stringify({
                part: "id",
                channelId: channel.login,
                fields: "items(id/videoId)",
                maxResults: 1,
                eventType: "live",
                type: "video",
                key: await apiKey
            }));
            if(!response.parsedJSON || !response.parsedJSON.items || !response.parsedJSON.items.length) {
                channel.live.setLive(false);
                channel.url = [ "https://youtube.com/channel/" + channel.login ];
                return null;
            }
            return response.parsedJSON.items[0].id.videoId;
        }));

        streamIds = streamIds.filter((id) => id !== null);

        const videos = await this._qs.queueRequest(baseURL + "videos?" + querystring.stringify({
            part: "id, snippet, liveStreamingDetails",
            id: streamIds.join(","),
            fields: "items(id,snippet(channelId,title,thumbnails/medium/url,categoryId),liveStreamingDetails/concurrentViewers)",
            key: await apiKey,
            hl: getLocale()
        }));

        if(videos.parsedJSON && videos.parsedJSON.items) {
            await Promise.all(videos.parsedJSON.items.map((video) => {
                return this._getCategory(video.snippet.categoryId).then((category) => {
                    const channel = channels.find((channel) => channel.login == video.snippet.channelId);
                    channel.live.setLive(true);
                    channel.url = [
                        "https://youtube.com/watch?v=" + video.id,
                        "https://gaming.youtube.com/watch?v=" + video.id,
                        "https://youtube.com/channel/" + channel.login + "/live",
                        "https://gaming.youtube.com/channel/" + channel.login + "/live"
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
    }
    async search(query) {
        const response = await this._qs.queueRequest(baseURL + "search?" + querystring.stringify({
            part: "id",
            fields: "items(id/videoId)",
            eventType: "live",
            type: "video",
            order: "relevance",
            relevanceLanguage: browser.i18n.getUILanguage().substr(0, 2),
            safeSearch: (await this._mature()) ? "moderate" : "strict",
            q: query,
            key: await apiKey
        }));

        let streamIds;
        if(response.parsedJSON && response.parsedJSON.items && response.parsedJSON.items.length) {
            streamIds = response.parsedJSON.items.map((entry) => entry.id.videoId);
        }
        else {
            throw new Error(`No search results found for ${this.name} with ${query}`);
        }

        const videos = await this._qs.queueRequest(baseURL + "videos?" + querystring.stringify(
            {
                part: "id,snippet,liveStreamingDetails",
                id: streamIds.join(","),
                fields: "items(id,snippet(channelId,title,thumbnails/medium/url,categoryId),liveStreamingDetails/concurrentViewers)",
                key: (await apiKey),
                hl: getLocale()
            }
        ));

        if(videos.parsedJSON && videos.parsedJSON.items) {
            return Promise.all(videos.parsedJSON.items.map(async (video) => {
                const channel = await this._getChannelById(video.snippet.channelId);
                channel.live.setLive(true);
                channel.url = [
                    "https://youtube.com/watch?v=" + video.id,
                    "https://gaming.youtube.com/watch?v=" + video.id
                ];
                channel.title = video.snippet.title;
                channel.thumbnail = video.snippet.thumbnails.medium.url;
                if("liveStreamingDetails" in video) {
                    channel.viewers = video.liveStreamingDetails.concurrentViewers;
                }
                channel.category = await this._getCategory(video.snippet.categoryId);

                return channel;
            }));
        }

        throw new Error("None of the searchresults exist for " + this.name);
    }
}

export default Object.freeze(new YouTube(type));
