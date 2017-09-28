/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */
import { Channel } from '../channel/core';
import GenericProvider from "./generic-provider";

const type = "ustream",
    chatURL = "http://ustream.tv/socialstream/",
    baseURL = 'https://api.ustream.tv/',
    FIRST_MATCH = 1;

function getChannelFromJSON(jsonChannel) {
    const ret = new Channel(jsonChannel.id, type);
    ret.uname = jsonChannel.title;

    // Url stuff. It's pretty fun.
    if("originalUrl" in jsonChannel) {
        ret.url.push(jsonChannel.originalUrl);
        ret.archiveUrl = jsonChannel.originalUrl;
    }
    if("url" in jsonChannel) {
        ret.url.push(`http://www.ustream.tv/channel/${jsonChannel.url}`);
        if(!ret.archiveUrl) {
            ret.archiveUrl = `http://www.ustream.tv/channel/${jsonChannel.url}`;
        }
    }
    if("tinyurl" in jsonChannel) {
        ret.url.push(jsonChannel.tinyurl);
        if(!ret.archiveUrl) {
            ret.archiveUrl = `http://www.ustream.tv/channel/${jsonChannel.url}`;
        }
    }
    ret.chatUrl = chatURL + jsonChannel.id;

    if("picture" in jsonChannel) {
        ret.image = {};
        let size;
        Object.keys(jsonChannel.picture).forEach((s) => {
            size = s.split("x").shift();
            ret.image[size] = jsonChannel.picture[s];
        });
    }
    else {
        ret.image = { "48": jsonChannel.owner.picture };
    }
    if("tags" in jsonChannel && jsonChannel.tags.length) {
        const [ firstTag ] = jsonChannel.tags;
        ret.category = firstTag;
    }
    ret.live.setLive(jsonChannel.status == "live");
    if("thumbnail" in jsonChannel) {
        ret.thumbnail = jsonChannel.thumbnail.live;
    }
    if("stats" in jsonChannel) {
        ret.viewers = jsonChannel.status == "live" ? jsonChannel.stats.viewer : jsonChannel.stats.viewer_total;
    }
    return ret;
}

class Ustream extends GenericProvider {
    constructor(type) {
        super(type);

        this.authURL = [ "http://ustream.tv" ];

        this.initialize();
    }

    async getChannelDetails(channelname) {
        let data = await this._qs.queueRequest(`http://www.ustream.tv/${channelname}`),
            retried = false;

        if(!data.ok) {
            data = await this._qs.queueRequest(`http://www.ustream.tv/channel/${channelname}`);
            if(!data.ok) {
                throw new Error(`Error getting channel details for channel ${channelname}`);
            }
            retried = true;
        }

        const htmlPage = await data.text(),
            channelId = htmlPage.match(/<meta name="ustream:channel_id" content="([0-9]+)">/)[FIRST_MATCH], // eslint-disable-line xss/no-mixed-html
            response = await this._qs.queueRequest(`${baseURL}channels/${channelId}.json`);

        if(response.parsedJSON && "channel" in response.parsedJSON) {
            const jsonChannel = response.parsedJSON.channel;

            if(!retried) {
                jsonChannel.originalUrl = `http://ustream.tv/${channelname}`;
            }

            return getChannelFromJSON(jsonChannel);
        }

        throw new Error(`Error getting channel details for channel ${channelname}`);
    }
    updateRequest() {
        const getURLs = async () => {
            const channels = await this._list.getChannels();
            return channels.map((channel) => `${baseURL}channels/${channel.login}.json`);
        };
        return {
            getURLs,
            onComplete: async (data) => {
                if(data.parsedJSON && data.parsedJSON.channel) {
                    return getChannelFromJSON(data.parsedJSON.channel);
                }
            }
        };
    }
    updateChannel(channelname) {
        return this._qs.queueRequest(`${baseURL}channels/${channelname}.json`).then((data) => {
            if(data.parsedJSON && data.parsedJSON.channel) {
                return getChannelFromJSON(data.parsedJSON.channel);
            }

            throw new Error(`Could not update channel ${channelname} for ${this.name}`);
        });
    }
}

export default Object.freeze(new Ustream(type));
