/**
 * @todo implement favorites stuff
 * @author Martin Giger
 * @license MPL-2.0
 * @module providers/livestream
 */
import { Channel } from '../channel/core';
import GenericProvider from "./generic-provider";

const type = "livestream",
    baseURL = ".api.channel.livestream.com/2.0/",
    FIRST_MATCH = 1;

function getChannelAPIUrl(channellogin) {
    return `http://x${channellogin.replace(/_/g, "-")}x${baseURL}`;
}

class Livestream extends GenericProvider {
    constructor(type) {
        super(type);

        this.authURL = [
            "http://original.livestream.com",
            "https://secure.livestream.com"
        ];

        this.initialize();
    }

    async getChannelDetails(username) {
        const ch = new Channel(username.toLowerCase(), this._type),
            [
                data,
                response
            ] = await Promise.all([
                this._qs.queueRequest(`${getChannelAPIUrl(ch.login)}info.json`),
                this._qs.queueRequest(`${getChannelAPIUrl(ch.login)}latestclips.json?maxresults=1`)
            ]);

        if(data.parsedJSON && data.parsedJSON.channel) {
            ch.uname = data.parsedJSON.channel.title;
            ch.title = "";
            ch.url.push(data.parsedJSON.channel.link);
            ch.image = { "100": data.parsedJSON.channel.image.url };
            ch.category = data.parsedJSON.channel.category;
            ch.live.setLive(data.parsedJSON.channel.isLive);
            //TODO track accross fetches
            ch.live.created = 0;
            ch.viewers = data.parsedJSON.channel.currentViewerCount;
            ch.archiveUrl = data.parsedJSON.channel.link;
            ch.chatUrl = `${data.parsedJSON.channel.link}/chat`;

            if(response.parsedJSON && response.parsedJSON.channel.item && response.parsedJSON.channel.item.length) {
                const [ thumbnailDetails ] = response.parsedJSON.channel.item;
                ch.thumbnail = thumbnailDetails.thumbnail["@url"];
            }

            return ch;
        }

        throw new Error(`Error getting details for the Livestream channel ${username}`);
    }
    updateRequest() {
        const getURLs = async () => {
            const channels = await this._list.getChannels();
            return channels.map((channel) => `${getChannelAPIUrl(channel.login)}livestatus.json`);
        };
        return {
            getURLs,
            onComplete: async (data, url) => {
                if(data.parsedJSON && data.parsedJSON.channel) {
                    const requestLogin = url.match(/http:\/\/x([a-zA-Z0-9-]+)x\./)[FIRST_MATCH].replace("-", "_"),
                        channel = await this._list.getChannelByName(requestLogin),
                        thumbnailInfo = await this._qs.queueRequest(`${getChannelAPIUrl(channel.login)}latestclips.json?maxresults=1`);
                    channel.live.setLive(data.parsedJSON.channel.isLive);
                    //TODO track accross fetches
                    channel.live.created = 0;
                    channel.viewers = data.parsedJSON.channel.currentViewerCount;
                    if(thumbnailInfo.parsedJSON && "channel" in thumbnailInfo.parsedJSON && thumbnailInfo.parsedJSON.channel.item.length) {
                        const [ thumbnailDetails ] = thumbnailInfo.parsedJSON.channel.item;
                        channel.thumbnail = thumbnailDetails.thumbnail["@url"];
                    }
                    return channel;
                }
            }
        };
    }
}

export default Object.freeze(new Livestream(type));
