/**
 * Provider for picarto.
 * @author Martin Giger
 * @license MPL-2.0
 * @module providers/picarto
 */
import { Channel } from '../channel/core';
import GenericProvider from "./generic-provider";

const type = "picarto",
    baseURL = 'https://api.picarto.tv/v1/',
    SERVER_ERROR = 500,
    REQUEST_OK = 399,
    requeue = (resp) => !resp.ok && (resp.status >= SERVER_ERROR || resp.status < REQUEST_OK);

function getChannelFromJSON(jsonChan) {
    const ret = new Channel(jsonChan.name.toLowerCase(), type);
    ret.uname = jsonChan.name;
    ret.image = {
        100: `https://picarto.tv/user_data/usrimg/${jsonChan.name}/dsdefault.jpg`
    };
    ret.thumbnail = `https://thumb-us1.picarto.tv/thumbnail/${jsonChan.name}.jpg`;
    ret.url.push(`https://picarto.tv/${ret.uname}`);
    ret.archiveUrl = `https://picarto.tv/${ret.uname}`;
    ret.chatUrl = `https://picarto.tv/chatpopout/${ret.uname}/public`;
    ret.live.setLive(jsonChan.online);
    if("last_live" in jsonChan) {
        ret.live.created = Date.parse(jsonChan.last_live);
    }
    else {
        // No info on search results.
        ret.live.created = 0;
    }
    ret.mature = jsonChan.adult;
    ret.viewers = jsonChan.viewers;
    ret.title = jsonChan.title;
    ret.category = jsonChan.category;
    return ret;
}

class Picarto extends GenericProvider {
    constructor(type) {
        super(type);

        this.authURL = [ "https://picarto.tv" ];
        this._supportsFeatured = true;

        this.initialize();
    }

    getChannelDetails(channelname) {
        return this._qs.queueRequest(`${baseURL}channel/name/${channelname.toLowerCase()}`, {}, requeue)
            .then((resp) => {
                if(resp.ok) {
                    return getChannelFromJSON(resp.parsedJSON);
                }
                throw new Error(`Channel ${channelname} does not exist for ${this.name}`);
            });
    }
    updateRequest() {
        const getURLs = async () => {
            const channels = await this._list.getChannels();
            return channels.map((channel) => `${baseURL}channel/name/${channel.login}`);
        };
        return {
            getURLs,
            onComplete: async (page) => {
                if(page.ok) {
                    return getChannelFromJSON(page.parsedJSON);
                }
            }
        };
    }
    async search(query) {
        const adult = await this._mature(),
            res = await this._qs.queueRequest(`${baseURL}online?adult=${adult.toString()}&gaming=true`, {}, requeue);
        if(!res.ok) {
            throw new Error(`Could not search for ${query} on ${this.name}`);
        }
        const channels = res.parsedJSON.map((c) => {
            c.online = true;
            return getChannelFromJSON(c);
        });
        if(query) {
            query = query.toLowerCase();
            return channels.filter((c) => c.uname.toLowerCase().includes(query) || c.title.toLowerCase().includes(query) || c.category.toLowerCase().includes(query));
        }
        return channels;
    }
}

export default Object.freeze(new Picarto(type));
