/**
 * Provider for picarto.
 * @author Martin Giger
 * @license MPL-2.0
 * @module providers/picarto
 * @todo Fix live status detection. Probably not possible before picarto gets an API.
 */

"use strict";
import { emit } from "sdk/event/core";
import { get as _ } from "sdk/l10n";
import { Channel } from '../channel/core';
import GenericProvider from "./generic-provider";

var type = "picarto",
    chatURL = "",
    baseURL = 'https://ptvappapi.picarto.tv',
    apiKey = '03e26294-b793-11e5-9a41-005056984bd4';

function getChannelFromJSON(jsonChan) {
    const ret = new Channel(jsonChan.channel.toLowerCase(), type);
    ret.uname = jsonChan.channel;
    ret.image = {101: jsonChan.avatar_url};
    ret.thumbnail = jsonChan.thumbnail_url;
    ret.url.push("https://picarto.tv/" + ret.login);
    ret.archiveUrl = "https://picarto.tv/" + ret.login;
    ret.chatUrl = "https://picarto.tv/chatpopout/" + ret.login;
    ret.live.setLive(jsonChan.is_online);
    ret.mature = jsonChan.is_nsfw;
    ret.viewers = jsonChan.current_viewers;
    ret.title = jsonChan.channel_title;
    ret.category = jsonChan.is_multistream ? _("provider_picarto_multistream") : jsonChan.content_type;
    return ret;
}

class Picarto extends GenericProvider {
    constructor(type) {
        super(type);
        this.authURL = ["https://picarto.tv"];
    }

    getChannelDetails(channelname) {
        return this._qs.queueRequest(`${baseURL}/channel/${channelname.toLowerCase()}?key=${apiKey}`)
            .then((resp) => {
                if(resp.status < 400)
                    return getChannelFromJSON(resp.json);
                else
                    throw `Channel ${channelname} does not exist for ${this.name}`;
            });
    }
    updateRequest(channels) {
        const urls = channels.map((channel) => `${baseURL}/channel/${channel.login}?key=${apiKey}`);
        this._qs.queueUpdateRequest(urls, this._qs.HIGH_PRIORITY, (page, url) => {
            if(page.status < 400 && page.status !== 0) {
                const channel = getChannelFromJSON(page.json);
                emit(this, "updatedchannels", channel);
            }
        });
    }
}

export default Object.freeze(new Picarto(type));
