/**
 * @todo implement favorites stuff
 * @author Martin Giger
 * @license MPL-2.0
 * @module providers/livestream
 */
import { emit } from "../../utils";
import { Channel } from '../channel/core';
import GenericProvider from "./generic-provider";

const type = "livestream",
    baseURL = ".api.channel.livestream.com/2.0/";

function getChannelAPIUrl(channellogin) {
    return "http://x" + channellogin.replace(/_/g, "-") + "x" + baseURL;
}

class Livestream extends GenericProvider {
    authURL = [
        "http://new.livestream.com",
        "https://secure.livestream.com"
    ];

    async getChannelDetails(username) {
        const ch = new Channel(username.toLowerCase(), this._type),
            [ data, response ] = await Promise.all([
                this._qs.queueRequest(getChannelAPIUrl(ch.login) + "info.json"),
                this._qs.queueRequest(getChannelAPIUrl(ch.login) + "latestclips.json?maxresults=1")
            ]);

        if(data.parsedJSON && data.parsedJSON.channel) {
            console.info("Creating livestream channel");
            ch.uname = data.parsedJSON.channel.title;
            ch.title = "";
            ch.url.push(data.parsedJSON.channel.link);
            ch.image = { "100": data.parsedJSON.channel.image.url };
            ch.category = data.parsedJSON.channel.category;
            ch.live.setLive(data.parsedJSON.channel.isLive);
            ch.viewers = data.parsedJSON.channel.currentViewerCount;
            ch.archiveUrl = data.parsedJSON.channel.link;
            ch.chatUrl = data.parsedJSON.channel.link + "/chat";

            if(response.parsedJSON && response.parsedJSON.channel.item && response.parsedJSON.channel.item.length > 0) {
                ch.thumbnail = response.parsedJSON.channel.item[0].thumbnail["@url"];
            }

            return ch;
        }
        else {
            throw "Error getting details for the Livestream channel " + username;
        }
    }
    updateRequest(channels) {
        const urls = channels.map((channel) => getChannelAPIUrl(channel.login) + "livestatus.json");
        this._qs.queueUpdateRequest(urls, this._qs.HIGH_PRIORITY, (data, url) => {
            if(data.parsedJSON && data.parsedJSON.channel) {
                const requestLogin = url.match(/http:\/\/x([a-zA-Z0-9-]+)x\./)[1].replace("-", "_"),
                    channel = channels.find((channel) => requestLogin == channel.login);
                channel.live.setLive(data.parsedJSON.channel.isLive);
                channel.viewers = data.parsedJSON.channel.currentViewerCount;
                this._qs.queueRequest(getChannelAPIUrl(channel.login) + "latestclips.json?maxresults=1").then((data) => {
                    if(data.parsedJSON && "channel" in data.parsedJSON && data.parsedJSON.channel.item.length) {
                        channel.thumbnail = data.parsedJSON.channel.item[0].thumbnail["@url"];
                    }
                    emit(this, "updatedchannels", channel);
                });
            }
        });
    }
}

export default Object.freeze(new Livestream(type));
