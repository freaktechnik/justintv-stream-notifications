/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */
import { emit } from "sdk/event/core";
import { Channel } from '../channel/core';
import GenericProvider from "./generic-provider";

const type = "ustream",
    chatURL = "http://ustream.tv/socialstream/",
    baseURL = 'https://api.ustream.tv/';

function getChannelFromJSON(jsonChannel) {
    console.info("ustream:getChannelFromJSON");
    const ret = new Channel(jsonChannel.id, type);
    ret.uname = jsonChannel.title;

    // Url stuff. It's pretty fun.
    if("originalUrl" in jsonChannel) {
        ret.url.push(jsonChannel.originalUrl);
        ret.archiveUrl = jsonChannel.originalUrl;
    }
    if("url" in jsonChannel) {
        ret.url.push("http://ustream.tv/channel/" + jsonChannel.url);
        if(!ret.archiveUrl) {
            ret.archiveUrl = "http://ustream.tv/channel/" + jsonChannel.url;
        }
    }
    if("tinyurl" in jsonChannel) {
        ret.url.push(jsonChannel.tinyurl);
        if(!ret.archiveUrl) {
            ret.archiveUrl = "http://ustream.tv/channel/" + jsonChannel.url;
        }
    }
    ret.chatUrl = chatURL + jsonChannel.id;

    if("picture" in jsonChannel) {
        ret.image = {};
        let size;
        Object.keys(jsonChannel.picture).forEach((s) => {
            size = s.split("x")[0];
            ret.image[size] = jsonChannel.picture[s];
        });
    }
    else {
        ret.image = { "48": jsonChannel.owner.picture };
    }
    if("tags" in jsonChannel && jsonChannel.tags.length > 0) {
        ret.category = jsonChannel.tags[0];
    }
    ret.live.setLive(jsonChannel.status == "live");
    if("thumbnail" in jsonChannel) {
        ret.thumbnail = jsonChannel.thumbnail.live;
    }
    if("stats" in jsonChannel) {
        ret.viewers = ret.live.isLive() ? jsonChannel.stats.viewer : jsonChannel.stats.viewer_total;
    }
    return ret;
}

class Ustream extends GenericProvider {
    authURL = [ "http://ustream.tv" ];

    async getChannelDetails(channelname) {
        let data = await this._qs.queueRequest("http://ustream.tv/" + channelname),
            retried = false;

        if(data.status != 200) {
            data = await this._qs.queueRequest("http://ustream.tv/channel/" + channelname);
            if(data.status != 200) {
                throw "Error getting channel details for channel " + channelname;
            }
            retried = true;
        }

        const channelId = data.text.match(/<meta name="ustream:channel_id" content="([0-9]+)">/)[1],
            response = await this._qs.queueRequest(baseURL + "channels/" + channelId + ".json");

        if(response.json && "channel" in response.json) {
            const jsonChannel = response.json.channel;

            if(!retried) {
                jsonChannel.originalUrl = "http://ustream.tv/" + channelname;
            }

            return getChannelFromJSON(jsonChannel);
        }
        else {
            throw "Error getting channel details for channel " + channelname;
        }
    }
    updateRequest(channels) {
        const urls = channels.map((channel) => baseURL + "channels/" + channel.login + ".json");
        this._qs.queueUpdateRequest(urls, this._qs.HIGH_PRIORITY, (data) => {
            if(data.json && data.json.channel) {
                emit(this, "updatedchannels", getChannelFromJSON(data.json.channel));
            }
        });
    }
    updateChannel(channelname) {
        console.info("Ustream.updateChannel");
        return this._qs.queueRequest(baseURL + 'channels/' + channelname + ".json").then((data) => {
            console.info("Ustream.updateChannel.requestCallback");
            if(data.json && data.json.channel) {
                return getChannelFromJSON(data.json.channel);
            }
            else {
                throw "Could not update channel " + channelname + " for " + this.name;
            }
        });
    }
}

export default Object.freeze(new Ustream(type));
