/**
 * MLG.tv Provider
 * @author Martin Giger
 * @license MPL-2.0
 * @module providers/mlg
 */
/*
Inofficial MLG.tv (major league gaming streams) API doc:

Username: cleartext username used in the channel URL
stream_name: mlg[0-9]+, which seems to be the stream ID
channel_id: [0-9]+, which seems to be the ID for the channel (used in image URLs and chat)


http://tv.majorleaguegaming.com/channel/{username}
http://chat.majorleaguegaming.com/{channel_id}


all of these seem to also support JSONP with the callback= parameter.
http://www.majorleaguegaming.com/player/config.json?id={username} username -> media[0].channel
http://streamapi.majorleaguegaming.com/service/streams/all status of all streams with stream_name and channel_id
http://streamapi.majorleaguegaming.com/service/streams/status/{stream_name} status and viewer count of just the specified stream
    status: -1 for offline, 1 for live, 2 for rebroadcast
http://www.majorleaguegaming.com/api/channels/all.js All the info about all the channels
    field parameter can limit the fields. You'll find the available fields if you don't specify any
http://www.majorleaguegaming.com/api/games/all.js All names and images for all game_id values
http://streamapi.majorleaguegaming.com/service/streams/playback/{stream name}?format=all playback URL + name & id

https://accounts.majorleaguegaming.com/follows/retrieve returns all the channel ids the currently logged in user (cookie mlg_login for username, mlg_id for the id) follows
There are also the actions to follow and unfollow a channel, but I am not sure how they work, as I don't care.

*/
import { Channel } from '../channel/core.js';
import prefs from "../../preferences.js";
import GenericProvider from "./generic-provider.js";
import LiveState from "../channel/live-state.js";

const type = "mlg",
    chatURL = "https://chat.majorleaguegaming.com/",
    baseURL = 'https://streamapi.majorleaguegaming.com/service/streams/',
    infoURL = 'https://www.majorleaguegaming.com/api/channels/all.js',
    gameURL = 'https://www.majorleaguegaming.com/api/games/all.js',
    infoArgs = "?fields=id,slug,name,stream_name,subtitle,image_1_1,image_16_9_medium,url,bracket_url,game_id",
    STATUS_OFFLINE = -1,
    STATUS_REBROADCAST = 2,
    REQUEST_OK = 200;

/**
 * @enum {number}
 * @name Status
 * @readonly
 * @property {number} Offline=-1
 * @property {number} Live=1
 * @property {number} Rebroadcast=2
 */
/**
 * @param {module:providers/mlg~Status} status - State of the channel.
 * @returns {boolean} If the channel should be considered live.
 * @async
 */
function isLive(status) {
    return prefs.get("mlg_showRebroadcasts")
        .then((showRebroadcasts) => status != STATUS_OFFLINE && (showRebroadcasts || status != STATUS_REBROADCAST));
}

// Takes a game_id
let games = [];

class MLG extends GenericProvider {
    constructor(type) {
        super(type);
        this.initialize();
    }

    get optionalPermissions() {
        return [
            "https://www.majorleaguegaming.com/api/*",
            "https://streamapi.majorleaguegaming.com/service/streams/*"
        ];
    }

    async getChannelDetails(channelname) {
        const data = await this._qs.queueRequest(infoURL + infoArgs);
        if(data.ok && data.parsedJSON.status_code == REQUEST_OK) {
            const cho = data.parsedJSON.data.items.find((ch) => ch.slug.toLowerCase() == channelname.toLowerCase());
            if(cho) {
                return this._getChannelFromJSON(cho);
            }
        }
        throw new Error(`Couldn't get the channel details for ${channelname} for ${this.name}`);
    }
    updateRequest() {
        return {
            getURLs: async () => {
                const channels = await this._list.getChannels();
                if(channels.length) {
                    return [ `${baseURL}all` ];
                }
                return channels;
            },
            onComplete: async (data) => {
                const info = await this._qs.queueRequest(infoURL + infoArgs);

                if(data.parsedJSON && data.parsedJSON.status_code == REQUEST_OK && info.parsedJSON && info.parsedJSON.status_code == REQUEST_OK) {
                    const channels = await this._list.getChannels();
                    let chans = data.parsedJSON.data.items.filter((status) => channels.some((channel) => status.stream_name == channel.login));

                    chans = await Promise.all(chans.map(async (status) => {
                        const channel = await this._getChannelFromJSON(info.parsedJSON.data.items.find((ch) => ch.id == status.channel_id));
                        if(status.status == STATUS_REBROADCAST) {
                            channel.live = new LiveState(LiveState.REBROADCAST);
                        }
                        else {
                            channel.live.setLive(await isLive(status.status));
                        }
                        return channel;
                    }));
                    return chans;
                }
            }
        };
    }
    async updateChannel(channelname) {
        const [
            data,
            info
        ] = await Promise.all([
            this._qs.queueRequest(`${baseURL}status/${channelname}`),
            this._qs.queueRequest(infoURL + infoArgs)
        ]);
        if(data.parsedJSON && data.parsedJSON.status_code == REQUEST_OK && info.parsedJSON && info.parsedJSON.status_code == REQUEST_OK) {
            const id = info.parsedJSON.data.items.find((ch) => ch.id == data.parsedJSON.data.channel_id),
                channel = await this._getChannelFromJSON(id);
            if(data.parsedJSON.data.status == STATUS_REBROADCAST) {
                channel.live = new LiveState(LiveState.REBROADCAST);
            }
            else {
                channel.live.setLive(await isLive(data.parsedJSON.data.status));
            }
            //TODO track accross fetches.
            channel.live.created = 0;
            channel.viewers = data.parsedJSON.data.viewers;

            return channel;
        }

        throw new Error(`Something went wrong when updating ${channelname}`);
    }
    async updateChannels(channels) {
        const [
            data,
            info
        ] = await Promise.all([
            this._qs.queueRequest(`${baseURL}all`),
            this._qs.queueRequest(infoURL + infoArgs)
        ]);

        if(data.parsedJSON && data.parsedJSON.status_code == REQUEST_OK && info.parsedJSON && info.parsedJSON.status_code == REQUEST_OK) {
            const followedChannels = data.parsedJSON.data.items.filter((status) => channels.some((channel) => status.stream_name == channel.login));
            return Promise.all(followedChannels.map(async (status) => {
                const id = info.parsedJSON.data.items.find((ch) => ch.id == status.channel_id),
                    channel = await this._getChannelFromJSON(id);
                if(status.status == STATUS_REBROADCAST) {
                    channel.live = new LiveState(LiveState.REBROADCAST);
                }
                else {
                    channel.live.setLive(await isLive(status.status));
                }
                //TODO track accross fetches
                channel.live.created = 0;
                return channel;
            }));
        }
        throw new Error("Could not update channels");
    }

    async _getGame(id) {
        const game = games.find((g) => g.id == id);
        if(!game) {
            const data = await this._qs.queueRequest(gameURL);
            if(data.parsedJSON && data.parsedJSON.data.items && data.parsedJSON.data.items.length) {
                games = data.parsedJSON.data.items;
                return data.parsedJSON.data.items.find((g) => g.id == id).name;
            }

            throw new Error(data.parsedJSON ? data.parsedJSON.errors : `Could not fetch games for ${this.name}`);
        }
        else {
            return game.name;
        }
    }

    async _getChannelFromJSON(jsonChannel) {
        const ret = new Channel(jsonChannel.stream_name, this._type);
        ret.uname = jsonChannel.name;
        ret.url.push(jsonChannel.url);
        ret.archiveUrl = jsonChannel.bracket_url ? jsonChannel.bracket_url : jsonChannel.url;
        ret.chatUrl = chatURL + jsonChannel.id;
        ret.image = { "200": jsonChannel.image_1_1 };
        ret.title = jsonChannel.subtitle;
        ret.thumbnail = jsonChannel.image_16_9_medium;
        try {
            const game = await this._getGame(jsonChannel.game_id);
            ret.category = game;
        }
        catch(e) {
            // ingore
        }

        return ret;
    }
}

export default Object.freeze(new MLG(type));
