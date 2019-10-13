/**
 * YouTube provider.
 *
 * @author Martin Giger
 * @license MPL-2.0
 * @module providers/youtube
 */
import prefs from "../../preferences.js";
import querystring from "../querystring.js";
import { memoize } from "lodash";
import {
    Channel, User
} from '../channel/core.js';
import { promisedPaginationHelper } from '../pagination-helper.js';
import GenericProvider from "./generic-provider.js";
import { filterExistingFavs } from '../channel/utils.js';

const type = "youtube",
    apiKey = prefs.get('youtube_apiKey'),
    baseURL = "https://www.googleapis.com/youtube/v3/",
    getLocale = () => browser.i18n.getUILanguage().replace("-", "_"),
    FIRST_MATCH = 1,
    LANG_START = 0,
    FIRST_ITEM = 0,
    LANG_END = 2;

class YouTube extends GenericProvider {
    constructor(type) {
        super(type);
        /**
         * Get the name for a category. Does caching.
         *
         * @param {string} categoryId
         * @returns {string}
         * @async
         * @function
         */
        this._getCategory = memoize(async (categoryId) => {
            const data = await this._qs.queueRequest(`${baseURL}videoCategories?${querystring.stringify({
                "part": "snippet",
                "id": categoryId,
                "hl": getLocale(),
                "key": await apiKey
            })}`);

            if(data.parsedJSON && "items" in data.parsedJSON && data.parsedJSON.items.length) {
                const [ item ] = data.parsedJSON.items;
                return item.snippet.title;
            }

            return '';
        }, (id) => `${id}|${getLocale()}`);

        this.authURL = [ "https://accounts.google.com" ];
        this._supportsFavorites = true;
        this._supportsFeatured = true;

        this.initialize();
    }

    async getUserFavorites(username) {
        let data = await this._qs.queueRequest(`${baseURL}channels?${querystring.stringify(
            {
                part: "id,snippet",
                forUsername: username,
                fields: "items(id,snippet/title,snippet/thumbnails,snippet/defaultLanguage)",
                key: await apiKey
            })}`);
        if(!data.parsedJSON || !data.parsedJSON.items || !data.parsedJSON.items.length) {
            data = await this._qs.queueRequest(`${baseURL}channels?${querystring.stringify(
                {
                    part: "id,snippet",
                    id: username,
                    fields: "items(snippet/title,snippet/thumbnails,snippet/defaultLanguage)",
                    key: await apiKey
                })}`);
            if(data.parsedJSON && data.parsedJSON.items && data.parsedJSON.items.length) {
                data.parsedJSON.items[FIRST_ITEM].id = username;
            }
        }

        if(data.parsedJSON && data.parsedJSON.items && data.parsedJSON.items.length) {
            const [ item ] = data.parsedJSON.items,
                ch = new User(item.id, this._type),
                subsOptions = {
                    part: "snippet",
                    channelId: item.id,
                    maxResults: 50,
                    key: await apiKey
                },
                subscriptions = await promisedPaginationHelper({
                    url: `${baseURL}subscriptions?${querystring.stringify(subsOptions)}`,
                    pageSize: subsOptions.maxResults,
                    initialPage: "",
                    request: (url) => this._qs.queueRequest(url),
                    getPageNumber(page, pageSize, d) {
                        return `&pageToken=${d.parsedJSON.nextPageToken}`;
                    },
                    fetchNextPage(d) {
                        return d.parsedJSON && d.parsedJSON.items && "nextPageToken" in d.parsedJSON;
                    },
                    getItems(d) {
                        if(d.parsedJSON && d.parsedJSON.items) {
                            return d.parsedJSON.items;
                        }

                        return [];
                    }
                });
            if(subscriptions.length) {
                ch.image = {
                    "88": item.snippet.thumbnails.default.url,
                    "240": item.snippet.thumbnails.high.url
                };
                ch.uname = item.snippet.title;
                ch.favorites = subscriptions.map((sub) => sub.snippet.resourceId.channelId);

                const channels = subscriptions.map((sub) => {
                    const ret = new Channel(sub.snippet.resourceId.channelId, this._type);
                    ret.archiveUrl = `https://youtube.com/channel/${ret.login}/videos`;
                    ret.chatUrl = `https://youtube.com/channel/${ret.login}/discussion`;
                    ret.image = {
                        "88": sub.snippet.thumbnails.default.url,
                        "240": sub.snippet.thumbnails.high.url
                    };
                    ret.uname = sub.snippet.title;
                    ret.language = sub.snippet.defaultLanguage;
                    return ret;
                });

                return [
                    ch,
                    channels
                ];
            }

            /** @todo Sometimes needs oAuth for some reason, I guess privacy
             *        settings. This also triggers when the user follows noone. */
            throw new Error(`Can't get favorites for youtube user ${username} without oAuth as somebody with reading rights of this user's subs.`);
        }
        else {
            throw new Error(`Error getting details for youtube user ${username}`);
        }
    }
    async getChannelDetails(username) {
        const data = await this._qs.queueRequest(`${baseURL}channels?${querystring.stringify(
            {
                part: "id,snippet",
                forUsername: username,
                fields: "items(id,snippet/title,snippet/thumbnails,snippet/defaultLanguage)",
                key: await apiKey
            })}`);
        if(data.parsedJSON && data.parsedJSON.items && data.parsedJSON.items.length) {
            const [ item ] = data.parsedJSON.items,
                ch = new Channel(item.id, this._type);
            ch.url.push(`https://youtube.com/channel/${ch.login}`);
            ch.archiveUrl = `https://youtube.com/channel/${ch.login}/videos`;
            ch.chatUrl = `https://youtube.com/channel/${ch.login}/discussion`;
            ch.image = {
                "88": item.snippet.thumbnails.default.url,
                "240": item.snippet.thumbnails.high.url
            };
            ch.uname = item.snippet.title;
            ch.language = item.snippet.defaultLanguage;
            return ch;
        }

        // Try to get the channel by ID if we can't get it by username.
        return this._getChannelById(username);
    }
    updateFavsRequest() {
        const getURLs = async () => {
            const users = await this._list.getUsers(),
                key = await apiKey;
            return users.map((user) => `${baseURL}channels?${querystring.stringify({
                part: "id,snippet",
                id: user.login,
                fields: "items(id,snippet/title,snippet/thumbnails,snippet/defaultLanguage)",
                key
            })}`);
        };
        return {
            getURLs,
            onComplete: async (data) => {
                if(data.parsedJSON && data.parsedJSON.items && data.parsedJSON.items.length) {
                    let page = 0;
                    const [ item ] = data.parsedJSON.items,
                        ch = new User(item.id, this._type),
                        subsOptions = {
                            part: "snippet",
                            channelId: item.id,
                            maxResults: 50,
                            key: await apiKey
                        },
                        subscriptions = await promisedPaginationHelper({
                            url: `${baseURL}subscriptions?${querystring.stringify(subsOptions)}`,
                            pageSize: subsOptions.maxResults,
                            initialPage: "",
                            request: (url) => this._qs.queueRequest(url),
                            getPageNumber(p, pageSize, d) {
                                return `&pageToken=${d.parsedJSON.nextPageToken}`;
                            },
                            fetchNextPage(d) {
                                return d.parsedJSON && d.parsedJSON.items && d.parsedJSON.pageInfo.totalResults > d.parsedJSON.pageInfo.resultsPerPage * ++page;
                            },
                            getItems(d) {
                                if(d.parsedJSON && d.parsedJSON.items) {
                                    return d.parsedJSON.items;
                                }

                                return [];
                            }
                        });
                    if(subscriptions.length) {
                        const oldUser = await this._list.getUserByName(ch.login),
                            newChannels = filterExistingFavs(oldUser, subscriptions.map((sub) => {
                                const ret = new Channel(sub.snippet.resourceId.channelId, this._type);
                                ret.archiveUrl = `https://youtube.com/channel/${ch.login}/videos`;
                                ret.chatUrl = `https://youtube.com/channel/${ch.login}/discussion`;
                                ret.image = {
                                    "88": sub.snippet.thumbnails.default.url,
                                    "240": sub.snippet.thumbnails.high.url
                                };
                                ret.uname = sub.snippet.title;
                                ret.language = sub.snippet.defaultLanguage;
                                return ret;
                            }));
                        /* eslint-disable require-atomic-updates */
                        ch.image = {
                            "88": item.snippet.thumbnails.default.url,
                            "240": item.snippet.thumbnails.high.url
                        };
                        ch.uname = item.snippet.title;
                        ch.id = oldUser.id;
                        ch.favorites = subscriptions.map((sub) => sub.snippet.resourceId.channelId);
                        /* eslint-enable require-atomic-updates */

                        return [
                            ch,
                            newChannels
                        ];
                    }

                    /** @todo Sometimes needs oAuth for some reason, I guess privacy settings. */
                    console.warn(`Can't get favorites for youtube user ${ch.uname} without oAuth as somebody with reading rights of this user's subs.`);
                }
                return [];
            }
        };
    }
    updateRequest() {
        const getURLs = async () => {
            const channels = await this._list.getChannels(),
                key = await apiKey;
            return channels.map((channel) => `${baseURL}search?${querystring.stringify({
                part: "id",
                channelId: channel.login,
                fields: "items(id/videoId)",
                maxResults: 1,
                eventType: "live",
                type: "video",
                key
            })}`);
        };
        return {
            getURLs,
            onComplete: async (data, url) => {
                if(data.parsedJSON && data.parsedJSON.items && data.parsedJSON.items.length) {
                    //TODO could reduce requests by batching them with mutliple IDs. Debounce?
                    const [ item ] = data.parsedJSON.items,
                        videos = await this._qs.queueRequest(`${baseURL}videos?${querystring.stringify({
                            part: "id, snippet, liveStreamingDetails",
                            id: item.id.videoId,
                            fields: "items(id,snippet(channelId,title,thumbnails/medium/url,categoryId,defaultLanguage),liveStreamingDetails(concurrentViewers,actualStartTime))",
                            key: await apiKey,
                            hl: getLocale()
                        })}`);
                    if(videos.parsedJSON && videos.parsedJSON.items) {
                        const channels = await Promise.all(videos.parsedJSON.items.map(async (video) => {
                            const category = await this._getCategory(video.snippet.categoryId),
                                channel = await this._list.getChannelByName(video.snippet.channelId);
                            channel.live.setLive(true);
                            channel.live.created = Date.parse(video.liveStreamingDetails.actualStartTime);
                            channel.url = [
                                `https://youtube.com/watch?v=${video.id}`,
                                `https://gaming.youtube.com/watch?v=${video.id}`,
                                `https://youtube.com/channel/${channel.login}/live`,
                                `https://gaming.youtube.com/channel/${channel.login}/live`
                            ];
                            channel.title = video.snippet.title;
                            channel.thumbnail = video.snippet.thumbnails.medium.url;
                            channel.viewers = video.liveStreamingDetails.concurrentViewers;
                            channel.category = category;
                            channel.language = video.snippet.defaultLanguage;
                            return channel;
                        }));
                        return channels;
                    }

                    throw new Error("Could not find the given stream");
                }
                else {
                    const channelLogin = url.match(/channelId=([\w-]+)?&/)[FIRST_MATCH],
                        channel = await this._list.getChannelByName(channelLogin);
                    channel.live.setLive(false);
                    channel.url = [ `https://youtube.com/channel/${channel.login}` ];
                    return channel;
                }
            }
        };
    }
    async updateChannel(channellogin) {
        const [
            ch,
            response
        ] = await Promise.all([
            this._getChannelById(channellogin),
            apiKey.then((key) => this._qs.queueRequest(`${baseURL}search?${querystring.stringify({
                part: "id",
                channelId: channellogin,
                fields: "items(id/videoId)",
                maxResults: 1,
                eventType: "live",
                type: "video",
                key
            })}`))
        ]);

        if(response.parsedJSON && response.parsedJSON.items) {
            if(response.parsedJSON.items.length) {
                ch.live.setLive(true);
                const [ item ] = response.parsedJSON.items,
                    video = await this._qs.queueRequest(`${baseURL}videos?${querystring.stringify({
                        part: "snippet, liveStreamingDetails",
                        id: item.id.videoId,
                        fields: "items(snippet(categoryId,title,thumbnails/medium/url,defaultLanguage),liveStreamingDetails(concurrentViewers,actualStartTime))",
                        key: await apiKey,
                        hl: getLocale()
                    })}`);

                ch.url.push(`https://youtube.com/watch?v=${item.id.videoId}`);
                ch.url.push(`https://gaming.youtube.com/watch?v=${item.id.videoId}`);
                if(video.parsedJSON && video.parsedJSON.items) {
                    const [ videoItem ] = video.parsedJSON.items;
                    ch.live.created = Date.parse(videoItem.liveStreamingDetails.actualStartTime);
                    ch.title = videoItem.snippet.title;
                    ch.thumbnail = videoItem.snippet.thumbnails.medium.url;
                    ch.viewers = videoItem.liveStreamingDetails.concurrentViewers;
                    ch.category = await this._getCategory(videoItem.snippet.categoryId);
                    ch.language = videoItem.snippet.defaultLanguage;
                }
            }
            else {
                ch.live.setLive(false);
                ch.url.push(`https://youtube.com/channel/${ch.login}`);
            }

            return ch;
        }
    }
    async updateChannels(channels) {
        let streamIds = await Promise.all(channels.map(async (channel) => {
            const response = await this._qs.queueRequest(`${baseURL}search?${querystring.stringify({
                part: "id",
                channelId: channel.login,
                fields: "items(id/videoId)",
                maxResults: 1,
                eventType: "live",
                type: "video",
                key: await apiKey
            })}`);
            if(!response.parsedJSON || !response.parsedJSON.items || !response.parsedJSON.items.length) {
                channel.live.setLive(false);
                channel.url = [ `https://youtube.com/channel/${channel.login}` ]; // eslint-disable-line require-atomic-updates
                return null;
            }
            const [ item ] = response.parsedJSON.items;
            return item.id.videoId;
        }));

        streamIds = streamIds.filter((id) => id !== null);

        const videos = await this._qs.queueRequest(`${baseURL}videos?${querystring.stringify({
            part: "id, snippet, liveStreamingDetails",
            id: streamIds.join(","),
            fields: "items(id,snippet(channelId,title,thumbnails/medium/url,categoryId,defaultLanguage),liveStreamingDetails(concurrentViewers,actualStartTime))",
            key: await apiKey,
            hl: getLocale()
        })}`);

        if(videos.parsedJSON && videos.parsedJSON.items) {
            await Promise.all(videos.parsedJSON.items.map((video) => this._getCategory(video.snippet.categoryId).then((category) => {
                const channel = channels.find((chan) => chan.login == video.snippet.channelId);
                channel.live.setLive(true);
                channel.live.created = Date.parse(video.liveStreamingDetails.actualStartTime);
                channel.url = [
                    `https://youtube.com/watch?v=${video.id}`,
                    `https://gaming.youtube.com/watch?v=${video.id}`,
                    `https://youtube.com/channel/${channel.login}/live`,
                    `https://gaming.youtube.com/channel/${channel.login}/live`
                ];
                channel.title = video.snippet.title;
                channel.thumbnail = video.snippet.thumbnails.medium.url;
                channel.viewers = video.liveStreamingDetails.concurrentViewers;
                channel.category = category;
                channel.language = video.snippet.defaultLanguage;
                return channel;
            })));
        }

        return channels;
    }
    async search(query) {
        const response = await this._qs.queueRequest(`${baseURL}search?${querystring.stringify({
            part: "id",
            fields: "items(id/videoId)",
            eventType: "live",
            type: "video",
            order: "relevance",
            relevanceLanguage: browser.i18n.getUILanguage().substr(LANG_START, LANG_END),
            safeSearch: (await this._mature()) ? "moderate" : "strict",
            q: query,
            key: await apiKey
        })}`);

        let streamIds;
        if(response.parsedJSON && response.parsedJSON.items && response.parsedJSON.items.length) {
            streamIds = response.parsedJSON.items.map((entry) => entry.id.videoId);
        }
        else {
            throw new Error(`No search results found for ${this.name} with ${query}`);
        }

        const videos = await this._qs.queueRequest(`${baseURL}videos?${querystring.stringify(
            {
                part: "id,snippet,liveStreamingDetails",
                id: streamIds.join(","),
                fields: "items(id,snippet(channelId,title,thumbnails/medium/url,categoryId,defaultLanguage),liveStreamingDetails(concurrentViewers,actualStartTime))",
                key: (await apiKey),
                hl: getLocale()
            }
        )}`);

        if(videos.parsedJSON && videos.parsedJSON.items) {
            return Promise.all(videos.parsedJSON.items.map(async (video) => {
                const channel = await this._getChannelById(video.snippet.channelId);
                channel.live.setLive(true);
                channel.url = [
                    `https://youtube.com/watch?v=${video.id}`,
                    `https://gaming.youtube.com/watch?v=${video.id}`
                ];
                channel.title = video.snippet.title;
                channel.thumbnail = video.snippet.thumbnails.medium.url;
                if("liveStreamingDetails" in video) {
                    channel.viewers = video.liveStreamingDetails.concurrentViewers;
                    channel.live.created = Date.parse(video.liveStreamingDetails.actualStartTime);
                }
                channel.language = video.snippet.defaultLanguage;
                channel.category = await this._getCategory(video.snippet.categoryId);

                return channel;
            }));
        }

        throw new Error(`None of the searchresults exist for ${this.name}`);
    }

    async _getChannelById(channelId) {
        const data = await this._qs.queueRequest(`${baseURL}channels?${querystring.stringify(
            {
                part: "snippet",
                id: channelId,
                fields: "items(snippet/title,snippet/thumbnails,snippet/defaultLanguage)",
                key: await apiKey
            })}`);
        if(data.parsedJSON && data.parsedJSON.items && data.parsedJSON.items.length) {
            const ch = new Channel(channelId, this._type),
                [ item ] = data.parsedJSON.items;
            ch.url.push(`https://youtube.com/channel/${ch.login}/live`);
            ch.url.push(`https://gaming.youtube.com/channel/${ch.login}/live`);
            ch.archiveUrl = `https://youtube.com/channel/${ch.login}/videos`;
            ch.chatUrl = `https://youtube.com/channel/${ch.login}/discussion`;
            ch.image = {
                "88": item.snippet.thumbnails.default.url,
                "240": item.snippet.thumbnails.high.url
            };
            ch.uname = item.snippet.title;
            ch.language = item.snippet.defaultLanguage;
            return ch;
        }

        throw new Error(`Getting channel details failed: ${data.status}`);
    }
}

export default Object.freeze(new YouTube(type));
