/**
 * Provider for picarto.
 *
 * @author Martin Giger
 * @license MPL-2.0
 * @module providers/picarto
 */
import { Channel } from '../channel/core.js';
import GenericProvider from "./generic-provider.js";
import { emit } from '../../utils.js';

const type = "picarto",
    baseURL = 'https://api.picarto.tv/v1/',
    SERVER_ERROR = 500,
    REQUEST_OK = 399,
    requeue = (resp) => !resp.ok && (resp.status >= SERVER_ERROR || resp.status < REQUEST_OK);

function getChannelFromJSON(jsonChan) {
    const ret = new Channel(jsonChan.user_id, type);
    ret.uname = jsonChan.name;
    ret.slug = jsonChan.name.toLowerCase();
    ret.image = {
        "100": jsonChan.avatar || `https://picarto.tv/user_data/usrimg/${jsonChan.name}/dsdefault.jpg`
    };
    ret.thumbnail = jsonChan.thumbnails ? jsonChan.thumbnails.web : `https://thumb-us-west1.picarto.tv/thumbnail/${jsonChan.name}.jpg`;
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
        this._hasUniqueSlug = true;

        this.initialize();
    }

    updateLogin(item) {
        this._qs.queueRequest(`${baseURL}channel/name/${item.slug}`, {}, requeue)
            .then((res) => {
                if(res.ok) {
                    return Promise.all([
                        this._list.getChannelByName(item.slug),
                        res
                    ]);
                }
            })
            .then((data) => {
                if(data.length) {
                    const [
                        chan,
                        res
                    ] = data;
                    chan.slug = chan.login;
                    chan._login = res.parsedJSON.user_id;
                    emit(this, 'updatedchannels', [ chan ]);
                }
            })
            .catch(console.error);
    }

    getChannelDetails(channelname) {
        if(typeof channelname === 'number') {
            return this._getChannelByID(channelname);
        }
        return this._qs.queueRequest(`${baseURL}channel/name/${channelname.toLowerCase()}`, {}, requeue)
            .then((resp) => {
                if(resp.ok) {
                    return getChannelFromJSON(resp.parsedJSON);
                }
                return this._getChannelByID(channelname);
            });
    }
    updateRequest() {
        const getURLs = async () => {
            const channels = await this._list.getChannels();
            return channels.map((channel) => `${baseURL}channel/id/${channel.login}`);
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

    _getChannelByID(id) {
        return this._qs.queueRequest(`${baseURL}channel/id/${id}`, {}, requeue)
            .then((resp) => {
                if(resp.ok) {
                    return getChannelFromJSON(resp.parsedJSON);
                }
                throw new Error(`Channel ${id} does not exist for ${this.name}`);
            });
    }
}

export default Object.freeze(new Picarto(type));
