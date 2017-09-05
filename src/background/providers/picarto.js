/**
 * Provider for picarto.
 * @author Martin Giger
 * @license MPL-2.0
 * @module providers/picarto
 */
import { emit } from "../../utils";
import { Channel } from '../channel/core';
import GenericProvider from "./generic-provider";

const type = "picarto",
    baseURL = 'https://ptvappapi.picarto.tv',
    apiKey = '03e26294-b793-11e5-9a41-005056984bd4';

function getChannelFromJSON(jsonChan) {
    const ret = new Channel(jsonChan.channel.toLowerCase(), type);
    ret.uname = jsonChan.channel;
    ret.image = { 101: jsonChan.avatar_url };
    ret.thumbnail = jsonChan.thumbnail_url;
    ret.url.push("https://picarto.tv/" + ret.login);
    ret.archiveUrl = "https://picarto.tv/" + ret.login;
    ret.chatUrl = "https://picarto.tv/chatpopout/" + ret.login;
    ret.live.setLive(jsonChan.is_online);
    ret.mature = jsonChan.is_nsfw;
    ret.viewers = jsonChan.current_viewers;
    ret.title = jsonChan.channel_title;
    ret.category = jsonChan.is_multistream ? browser.i18n.getMessage("providerPicartoMultistream") : jsonChan.content_type;
    return ret;
}

class Picarto extends GenericProvider {
    authURL = [ "https://picarto.tv" ];

    getChannelDetails(channelname) {
        return this._qs.queueRequest(`${baseURL}/channel/${channelname.toLowerCase()}?key=${apiKey}`)
            .then((resp) => {
                if(resp.ok) {
                    return getChannelFromJSON(resp.parsedJSON);
                }
                else {
                    throw new Error(`Channel ${channelname} does not exist for ${this.name}`);
                }
            });
    }
    updateRequest() {
        const getURLs = async () => {
            const channels = await this._list.getChannels();
            return channels.map((channel) => `${baseURL}/channel/${channel.login}?key=${apiKey}`);
        };
        this._qs.queueUpdateRequest({
            getURLs,
            onComplete: (page) => {
                if(page.ok) {
                    const channel = getChannelFromJSON(page.parsedJSON);
                    emit(this, "updatedchannels", channel);
                }
            }
        });
    }
}

export default Object.freeze(new Picarto(type));
